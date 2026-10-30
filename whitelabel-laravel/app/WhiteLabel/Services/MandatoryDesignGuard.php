<?php

namespace App\WhiteLabel\Services;

use App\WhiteLabel\Models\LabelBlueprint;

/**
 * Checks the required label objects (ingredients, warnings, icons, barcode) on every save.
 *
 * The designer UI hides controls for these objects, but the save endpoint accepts any JSON,
 * so the server has to check them again. Customer can move them and change typography
 * within limits, everything else is restored from the last saved design.
 *
 * Invalid values are repaired, not rejected, because this runs on autosave.
 */
class MandatoryDesignGuard
{
    // Properties customer can change freely on a required object
    private const FREE_PROPERTIES = [
        'left', 'top', 'angle', 'width', 'height', 'scaleX', 'scaleY', 'originX', 'originY',
    ];

    private const SIZE_PROPERTIES = ['width', 'height', 'scaleX', 'scaleY'];

    // Roles where size comes from the blueprint, customer can only move them
    private const FIXED_SIZE_ROLES = [BlueprintDesignService::PaoIconRole];

    // Canvas px per mm, same as in the JS designer
    private const PX_PER_MM = 10;

    public function __construct(
        private readonly BlueprintDesignService $blueprintDesignService,
        private readonly BarcodeGenerator $barcodeGenerator,
    ) {
    }

    /**
     * @param  array<string, array{text: string, styles: array}>  $productContent  role => text for this product,
     *         empty when editing a template
     */
    public function enforce(
        array $incoming,
        ?array $baseline,
        ?LabelBlueprint $blueprint = null,
        array $productContent = [],
        ?string $barcode = null
    ): array {
        // Barcode is always generated on the server, never taken from the request
        $barcodeObject = $blueprint
            ? $this->barcodeGenerator->build(
                $barcode,
                $this->blueprintDesignService->barcodeSlot($blueprint),
                $blueprint
            )
            : null;

        $content = $blueprint
            ? $this->barcodeGenerator->contentRect($blueprint, $barcodeObject)
            : null;

        $reference = $this->indexByRole($baseline['objects'] ?? []);
        unset($reference[BarcodeGenerator::Role]);

        // First save, nothing to compare against yet
        if ($reference === []) {
            $incoming['objects'] = $this->stack(
                $this->barcodeGenerator->stripFrom($incoming['objects'] ?? []),
                $barcodeObject,
                []
            );

            return $incoming;
        }

        $objects = [];
        $mandatory = [];
        $paoRole = BlueprintDesignService::PaoIconRole;
        $pao = $this->pao($productContent);

        foreach ($incoming['objects'] ?? [] as $object) {
            $role = is_array($object) ? ($object['role'] ?? null) : null;

            if ($role === BarcodeGenerator::Role) {
                continue;
            }

            // Unknown role = fake, treat it as normal artwork
            if ($role === null || !isset($reference[$role])) {
                unset($object['role']);
                $objects[] = $object;
                continue;
            }

            // Product has no PAO value, so no PAO icon
            if ($role === $paoRole && $pao === '') {
                continue;
            }

            // Bottle size group keeps its text on a child object
            $productContentRole = match (true) {
                $role === $paoRole => null,
                $role === BlueprintDesignService::EstimatedSignBottleSizeRole => BlueprintDesignService::BottleSizeRole,
                default => $role,
            };

            $restored = $this->restore(
                $object,
                $reference[$role],
                $productContentRole === null ? null : ($productContent[$productContentRole] ?? null)
            );

            // Only colour mode comes from customer, actual colours are set here
            $restored = $this->blueprintDesignService->applyColorMode(
                $restored,
                $this->colorMode($object, $reference[$role]),
                $role === $paoRole ? $pao : null
            );

            $mandatory[$role] = $this->clamp($restored, $blueprint, $content);
        }

        // Put back anything customer deleted, in the original order
        $required = [];

        foreach ($reference as $role => $original) {
            if ($role === $paoRole && $pao === '') {
                continue;
            }

            $required[] = $mandatory[$role] ?? $original;
        }

        $incoming['objects'] = $this->stack($objects, $barcodeObject, $required);

        return $incoming;
    }

    private function colorMode(array $incoming, array $original): string
    {
        $requested = $incoming['colorMode'] ?? null;

        if (is_string($requested) && config("label_editor.color_modes.{$requested}")) {
            return $requested;
        }

        return $original['colorMode'] ?? BlueprintDesignService::DefaultColorMode;
    }

    // Only fonts we offer, otherwise PDF export can't outline the text
    private function fontFamily(array $incoming, array $original): ?string
    {
        $requested = $incoming['fontFamily'] ?? null;

        if (is_string($requested) && in_array($requested, FontSyncService::offeredFamilies(), true)) {
            return $requested;
        }

        return $original['fontFamily'] ?? null;
    }

    /**
     * Typography values from customer, each checked against config limits.
     * Bad value falls back to the original, other values are still kept.
     *
     * @return array<string, mixed>
     */
    private function typography(array $incoming, array $original): array
    {
        $bounds = config('label_editor.mandatory_text');

        $accepted = [];

        $take = function (string $property, callable $valid) use ($incoming, $original, &$accepted): void {
            if (array_key_exists($property, $incoming) && $valid($incoming[$property])) {
                $accepted[$property] = $incoming[$property];
            } elseif (array_key_exists($property, $original)) {
                $accepted[$property] = $original[$property];
            }
        };

        $between = fn ($min, $max) => fn ($value) => is_numeric($value)
            && (float) $value >= (float) $min
            && (float) $value <= (float) $max;

        $ptToPx = fn ($pt) => (float) $pt * self::PX_PER_MM * 25.4 / 72;

        $take('fontSize', $between(
            $ptToPx($bounds['min_font_size_pt']),
            $ptToPx($bounds['max_font_size_pt'])
        ));
        $take('lineHeight', $between($bounds['min_line_height'], $bounds['max_line_height']));
        $take('charSpacing', $between($bounds['min_char_spacing'], $bounds['max_char_spacing']));

        $take('fontWeight', fn ($value) => in_array($value, $bounds['font_weights'], true));
        $take('fontStyle', fn ($value) => in_array($value, $bounds['font_styles'], true));
        $take('textAlign', fn ($value) => in_array($value, $bounds['text_aligns'], true));
        $take('uppercase', fn ($value) => is_bool($value));

        return $accepted;
    }

    /**
     * PAO months for this product, '' if product has none, null when editing a template.
     *
     * @param  array<string, array{text: string, styles: array}>  $productContent
     */
    private function pao(array $productContent): ?string
    {
        $pao = $productContent[BlueprintDesignService::PaoIconRole]['text'] ?? null;

        return is_string($pao) ? $pao : null;
    }

    // Draw order: artwork, then barcode, then required texts on top
    private function stack(array $artwork, ?array $barcode, array $required): array
    {
        return [...$artwork, ...($barcode === null ? [] : [$barcode]), ...$required];
    }

    /**
     * @return array<string, array>
     */
    private function indexByRole(array $objects): array
    {
        $indexed = [];

        foreach ($objects as $object) {
            if (!is_array($object)) {
                continue;
            }

            $role = $object['role'] ?? null;

            if (is_string($role) && $role !== '') {
                $indexed[$role] = $object;
            }
        }

        return $indexed;
    }

    private function freeProperties(?string $role): array
    {
        if (!in_array($role, self::FIXED_SIZE_ROLES, true)) {
            return self::FREE_PROPERTIES;
        }

        return array_values(array_diff(self::FREE_PROPERTIES, self::SIZE_PROPERTIES));
    }

    /**
     * Start from the saved object and take only allowed changes from the request.
     * Text is accepted only if it matches exactly what server would generate for this product.
     *
     * @param  array{text: string, styles: array}|null  $productContent
     */
    private function restore(array $incoming, array $original, ?array $productContent): array
    {
        $restored = $original;

        foreach ($this->freeProperties($original['role'] ?? null) as $property) {
            if (array_key_exists($property, $incoming)) {
                $restored[$property] = $incoming[$property];
            }
        }

        // Bottle size group is sized by its text, so font and typography stay locked
        if (($original['role'] ?? null) === BlueprintDesignService::EstimatedSignBottleSizeRole) {
            return $this->restoreBottleSizeChild($restored, $incoming, $productContent);
        }

        $family = $this->fontFamily($incoming, $original);

        if ($family !== null) {
            $restored['fontFamily'] = $family;
        }

        foreach ($this->typography($incoming, $original) as $property => $value) {
            $restored[$property] = $value;
        }

        if ($productContent !== null && ($incoming['text'] ?? null) === $productContent['text']) {
            $restored['text'] = $productContent['text'];
            $restored['styles'] = $productContent['styles'];
        }

        return $restored;
    }

    /**
     * @param  array{text: string, styles: array}|null  $productContent
     */
    private function restoreBottleSizeChild(array $restored, array $incoming, ?array $productContent): array
    {
        if ($productContent === null) {
            return $restored;
        }

        $incomingChild = $this->indexByRole($incoming['objects'] ?? [])[BlueprintDesignService::BottleSizeRole] ?? null;

        if (!$incomingChild || ($incomingChild['text'] ?? null) !== $productContent['text']) {
            return $restored;
        }

        $restored['objects'] = array_map(function ($child) use ($productContent) {
            if (is_array($child) && ($child['role'] ?? null) === BlueprintDesignService::BottleSizeRole) {
                $child['text'] = $productContent['text'];
                $child['styles'] = $productContent['styles'];
            }

            return $child;
        }, $restored['objects'] ?? []);

        return $restored;
    }

    /**
     * Keep the object inside the safe zone, so required text can't be moved off the label
     * or over the barcode. Rotated objects are skipped.
     *
     * @param  array{left: float, top: float, right: float, bottom: float}|null  $content
     */
    private function clamp(array $object, ?LabelBlueprint $blueprint, ?array $content = null): array
    {
        if (!$blueprint || (float) ($object['angle'] ?? 0) !== 0.0) {
            return $object;
        }

        $px = fn ($mm) => (float) $mm * self::PX_PER_MM;

        $content ??= [
            'left' => $px($blueprint->bleed_left),
            'top' => $px($blueprint->bleed_top),
            'right' => $px($blueprint->bleed_left) + $px($blueprint->width),
            'bottom' => $px($blueprint->bleed_top) + $px($blueprint->height),
        ];

        $halfWidth = ((float) ($object['width'] ?? 0) * (float) ($object['scaleX'] ?? 1)) / 2;
        $halfHeight = ((float) ($object['height'] ?? 0) * (float) ($object['scaleY'] ?? 1)) / 2;

        $object['left'] = $this->clampOnAxis(
            $object,
            'left',
            'originX',
            $halfWidth,
            $content['left'] + $px($blueprint->safe_zone_left),
            $content['right'] - $px($blueprint->safe_zone_right)
        );

        $object['top'] = $this->clampOnAxis(
            $object,
            'top',
            'originY',
            $halfHeight,
            $content['top'] + $px($blueprint->safe_zone_top),
            $content['bottom'] - $px($blueprint->safe_zone_bottom)
        );

        return $object;
    }

    // Convert position to centre, clamp it, convert back to the object's origin
    private function clampOnAxis(
        array $object,
        string $property,
        string $originProperty,
        float $half,
        float $min,
        float $max
    ): float {
        $origin = $object[$originProperty] ?? 'center';
        $position = (float) ($object[$property] ?? 0);

        $leading = $origin === 'top' || $origin === 'left';
        $trailing = $origin === 'bottom' || $origin === 'right';

        $centre = $position + ($leading ? $half : 0) - ($trailing ? $half : 0);
        $clamped = $this->clampAxis($centre, $half, $min, $max);

        return $clamped - ($leading ? $half : 0) + ($trailing ? $half : 0);
    }

    // Object bigger than the zone sticks to the start, so beginning of the text stays visible
    private function clampAxis(float $centre, float $half, float $min, float $max): float
    {
        if ($half * 2 >= $max - $min || $centre - $half < $min) {
            return $min + $half;
        }

        if ($centre + $half > $max) {
            return $max - $half;
        }

        return $centre;
    }
}
