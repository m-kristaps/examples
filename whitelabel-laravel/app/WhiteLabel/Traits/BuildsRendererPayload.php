<?php

namespace App\WhiteLabel\Traits;

use App\WhiteLabel\Models\LabelBlueprint;

trait BuildsRendererPayload
{
    protected function blueprintPayload(LabelBlueprint $blueprint): array
    {
        return [
            'width' => (float) $blueprint->width,
            'height' => (float) $blueprint->height,
            'bleed_top' => (float) $blueprint->bleed_top,
            'bleed_right' => (float) $blueprint->bleed_right,
            'bleed_bottom' => (float) $blueprint->bleed_bottom,
            'bleed_left' => (float) $blueprint->bleed_left,
            'corner_radius' => (float) $blueprint->corner_radius,
        ];
    }

    protected function modelFbx(?LabelBlueprint $blueprint): ?string
    {
        $media = $blueprint?->getFirstMedia('model_3d');

        if (!$media || !is_file($media->getPath())) {
            return null;
        }

        return file_get_contents($media->getPath());
    }
}
