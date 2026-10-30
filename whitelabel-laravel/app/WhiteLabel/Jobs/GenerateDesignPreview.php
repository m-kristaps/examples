<?php

namespace App\WhiteLabel\Jobs;

use App\WhiteLabel\Models\DesignVersion;
use App\WhiteLabel\Models\LabelBlueprint;
use App\WhiteLabel\Models\LabelDesign;
use App\WhiteLabel\Services\BrandAssetRenderResolver;
use App\WhiteLabel\Traits\BuildsRendererPayload;
use App\WhiteLabel\Traits\ResolvesProductColors;
use App\WhiteLabel\Traits\SyncsDesignFonts;
use DateTime;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;
use Throwable;

/**
 * Renders preview images for a design (flat WebP + 3D mockup for product versions)
 * and saves them to media library.
 *
 * @property DesignVersion|LabelDesign $target
 */
class GenerateDesignPreview implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;
    use BuildsRendererPayload, ResolvesProductColors, SyncsDesignFonts;

    public int $timeout = 120;

    public function __construct(public readonly Model $target) { }

    // release() counts as an attempt, so limit by time, not by tries
    public function retryUntil(): DateTime
    {
        return now()->addMinutes(10);
    }

    public function handle(BrandAssetRenderResolver $assetResolver): void
    {
        [$design, $blueprint, $modelFbx] = $this->resolve();

        if (!$design || !$blueprint) {
            Log::warning('GenerateDesignPreview: missing design or blueprint', [
                'target' => $this->target::class,
                'id' => $this->target->getKey(),
            ]);
            return;
        }

        // Uploaded artwork is still converting, try again a bit later
        if ($assetResolver->pendingAssetIds($design) !== []) {
            $this->release(15);
            return;
        }

        $design = $assetResolver->resolve($design, BrandAssetRenderResolver::VARIANT_PREVIEW)['design'];

        $this->syncDesignFonts($design);

        $payload = [
            'design' => $design,
            'blueprint' => $this->blueprintPayload($blueprint) + ['crop_marks' => (bool) $blueprint->crop_marks],
        ];

        if ($modelFbx !== null) {
            $payload['model_fbx'] = base64_encode($modelFbx);
        }

        $response = Http::timeout(90)
            ->post(config('services.renderer.url') . '/preview', $payload);

        if (!$response->successful()) {
            throw new RuntimeException('Renderer returned HTTP ' . $response->status() . ': ' . $response->body());
        }

        $data = $response->json();

        if (!empty($data['flat'])) {
            $this->target
                ->addMediaFromString(base64_decode($data['flat']))
                ->usingFileName($this->target->getKey() . '-flat.webp')
                ->toMediaCollection('preview_flat');
        }

        if (!empty($data['mockup']) && $this->target instanceof DesignVersion) {
            $this->target
                ->addMediaFromString(base64_decode($data['mockup']))
                ->usingFileName($this->target->getKey() . '-3d.webp')
                ->toMediaCollection('preview_3d');
        }
    }

    /**
     * @return array{0: ?array, 1: ?LabelBlueprint, 2: ?string}
     */
    private function resolve(): array
    {
        if ($this->target instanceof DesignVersion) {
            $this->target->loadMissing('brandedProduct.productVariant.product', 'brandedProduct.labelBlueprint');

            $brandedProduct = $this->target->brandedProduct;
            $blueprint = $brandedProduct?->labelBlueprint;

            return [
                $this->applyProductColorToDesign($brandedProduct, $this->target->design),
                $blueprint,
                $this->modelFbx($blueprint),
            ];
        }

        // Templates are flat only, no product and no 3D model
        if ($this->target instanceof LabelDesign) {
            return [
                $this->applyProductColorToDesign(null, $this->target->effective_design),
                $this->target->blueprint,
                null,
            ];
        }

        return [null, null, null];
    }

    public function failed(Throwable $e): void
    {
        Log::error('GenerateDesignPreview failed', [
            'target' => $this->target::class,
            'id' => $this->target->getKey(),
            'error' => $e->getMessage(),
        ]);
    }
}
