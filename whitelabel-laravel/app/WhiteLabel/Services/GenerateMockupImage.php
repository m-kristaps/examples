<?php

namespace App\WhiteLabel\Services;

use App\WhiteLabel\Models\DesignVersion;
use App\WhiteLabel\Models\LabelDesign;
use App\WhiteLabel\Traits\BuildsRendererPayload;
use App\WhiteLabel\Traits\ResolvesProductColors;
use App\WhiteLabel\Traits\SyncsDesignFonts;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

class GenerateMockupImage
{
    use BuildsRendererPayload, ResolvesProductColors, SyncsDesignFonts;

    public function __construct(private readonly BrandAssetRenderResolver $assetResolver)
    {
    }

    /**
     * Renders 3D mockup image of the label on the product.
     *
     * @param array $sceneOptions camera, background, rotation, zoom, width, height
     * @return string PNG image
     */
    public function execute(DesignVersion|LabelDesign $model, array $sceneOptions): string
    {
        if ($model instanceof DesignVersion) {
            $model->loadMissing('brandedProduct.productVariant.product', 'brandedProduct.labelBlueprint');
            $brandedProduct = $model->brandedProduct;
            $blueprint = $brandedProduct?->labelBlueprint;
            $design = $model->design;
        } else {
            $model->loadMissing('blueprint', 'brand');
            $brandedProduct = null;
            $blueprint = $model->blueprint;
            $design = $model->effective_design;
        }

        if (!$blueprint) {
            throw new RuntimeException('Missing label blueprint for model ID: ' . $model->id);
        }

        $modelFbx = $this->modelFbx($blueprint);

        if (!$modelFbx) {
            throw new RuntimeException('Model fbx file is missing.');
        }

        if (!$design) {
            throw new RuntimeException('Design is empty, ID: ' . $model->id);
        }

        $design = $this->applyProductColorToDesign($brandedProduct, $design);
        $design = $this->assetResolver->resolve($design, BrandAssetRenderResolver::VARIANT_PREVIEW)['design'];

        $this->syncDesignFonts($design);

        $response = Http::timeout(120)
            ->post(config('services.renderer.url') . '/mockup', [
                'design' => $design,
                'blueprint' => $this->blueprintPayload($blueprint),
                'model_fbx' => base64_encode($modelFbx),
                'scene_options' => $sceneOptions,
            ]);

        if (!$response->successful()) {
            Log::error('GenerateMockupImage renderer error', [
                'id' => $model->id,
                'status' => $response->status(),
                'body' => $response->body(),
            ]);

            throw new RuntimeException('Renderer failed with HTTP ' . $response->status());
        }

        return $response->body();
    }
}
