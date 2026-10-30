<?php

namespace App\WhiteLabel\Http\Controllers;

use App\WhiteLabel\Jobs\GenerateDesignPreview;
use App\WhiteLabel\Models\BrandedProduct;
use App\WhiteLabel\Models\LabelDesign;
use App\WhiteLabel\Services\BlueprintDesignService;
use App\WhiteLabel\Services\ColorProfileService;
use App\WhiteLabel\Services\DesignColorBackfill;
use App\WhiteLabel\Services\GenerateMockupImage;
use App\WhiteLabel\Services\MandatoryDesignGuard;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Log;
use Illuminate\View\View;
use Throwable;

class TemplateDesignerController
{
    public function __construct(
        private readonly MandatoryDesignGuard $mandatoryDesignGuard,
        private readonly DesignColorBackfill $designColorBackfill,
        private readonly BlueprintDesignService $blueprintDesignService,
        private readonly ColorProfileService $colorProfileService,
    ) {
    }

    public function index(LabelDesign $labelDesign): View
    {
        Gate::authorize('update', $labelDesign);

        $brandedProduct = $labelDesign->currentBrandedProducts()->first()
            ?? $labelDesign->brand
                ->brandedProducts()
                ->where('label_blueprint_id', $labelDesign->blueprint_id)
                ->first();

        $version = $brandedProduct?->currentVersion;

        $productData = [
            'productName' => $brandedProduct?->getProductName(),
            'colorName'   => $version?->color_name ?? $brandedProduct?->productVariant?->getSecondaryName(),
            'itemNumber'  => $version?->product_item_number,
            'barcode'     => $version?->barcode,
        ];

        return view('white-label::designer.template', [
            'labelDesign' => $labelDesign,
            // Older designs are fixed when loaded (missing CMYK colors, old icon paths)
            'design' => $this->blueprintDesignService->normaliseIconSources(
                $this->designColorBackfill->backfill($labelDesign->effective_design)
            ),
            'productColor' => $brandedProduct?->getProductColor(),
            'productCmyk' => $brandedProduct ? $this->productCmyk($brandedProduct) : null,
            'flow' => 'template',
            'saveUrl' => route('designer.template.save', $labelDesign),
            'mockupUrl' => route('designer.template.mockup', $labelDesign),
            'editorFaqs' => resolveTaxonomyFaqs('editor-faqs'),
            'productData' => $productData,
            'maxTotalInk' => (int) config('label_editor.color.max_total_ink', 300),
        ]);
    }

    public function save(LabelDesign $labelDesign, Request $request): JsonResponse
    {
        Gate::authorize('update', $labelDesign);

        $data = $request->validate([
            'design' => ['required', 'array'],
            'template_name' => ['nullable', 'string', 'max:255'],
        ]);

        $design = $this->mandatoryDesignGuard->enforce(
            $data['design'],
            $labelDesign->effective_design,
            $labelDesign->blueprint
        );

        $labelDesign->update([
            'design' => $design,
            'name' => $data['template_name'] ?? $labelDesign->name,
        ]);

        GenerateDesignPreview::dispatch($labelDesign);

        return response()->json([
            'success' => true,
            // Guard can change the design, so editor reloads what was actually saved
            'design' => $design,
            'redirect' => route('account.labels.my-labels'),
        ]);
    }

    public function generateMockup(
        LabelDesign $labelDesign,
        Request $request,
        GenerateMockupImage $generator
    ): JsonResponse|Response {
        Gate::authorize('update', $labelDesign);

        $data = $request->validate([
            'scene_options' => ['required', 'array'],
        ]);

        try {
            $png = $generator->execute($labelDesign, $data['scene_options']);
        } catch (Throwable $e) {
            Log::error('Mockup render failed', ['id' => $labelDesign->id, 'error' => $e->getMessage()]);

            return response()->json(['message' => 'Failed to render mockup, please try again.'], 422);
        }

        return response($png, 200, [
            'Content-Type' => 'image/png',
            'Content-Disposition' => 'attachment; filename="mockup.png"',
        ]);
    }

    private function productCmyk(BrandedProduct $brandedProduct): ?array
    {
        $lab = $brandedProduct->getProductLab();

        if ($lab !== null) {
            return $this->colorProfileService->labToCmyk($lab);
        }

        $hex = $brandedProduct->getProductColor();

        if ($hex === null || ColorProfileService::normalizeHex($hex) === null) {
            return null;
        }

        return $this->colorProfileService->srgbToCmyk($hex);
    }
}
