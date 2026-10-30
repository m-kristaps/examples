<?php

namespace App\WhiteLabel\Models;

use App\Models\ProductVariant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * @property string $id
 * @property string $brand_id
 * @property string $product_variant_id
 * @property string|null $label_blueprint_id
 * @property string $current_version_id
 * @property string $product_color
 * @property Brand $brand
 * @property ProductVariant $productVariant
 * @property LabelBlueprint|null $labelBlueprint
 * @property DesignVersion[]|HasMany $versions
 * @property DesignVersion $currentVersion
 * @property DesignRender[]|HasManyThrough $renders
 */
class BrandedProduct extends Model
{
    use HasUuids;
    use SoftDeletes;

    protected $table = 'wl_branded_products';

    protected $guarded = ['id'];

    public function getProductName(): ?string
    {
        return $this->currentVersion?->product_name;
    }

    public function getColorName(): ?string
    {
        return $this->currentVersion?->color_name;
    }

    public static function resolveColorFromProduct(?ProductVariant $variant): ?string
    {
        $product = $variant?->product;

        if ($product?->hex_code) {
            return '#'.ltrim($product->hex_code, '#');
        }

        $hueValue = $product?->hue_value;

        if ($hueValue === null || $hueValue === '') {
            return null;
        }

        return convertHueValueToHexCode($hueValue);
    }

    public function getProductColor(): ?string
    {
        return $this->product_color ?? static::resolveColorFromProduct($this->productVariant);
    }

    public static function resolveLabFromProduct(?ProductVariant $variant): ?array
    {
        $product = $variant?->product;

        if ($product?->lab_l === null || $product?->lab_a === null || $product?->lab_b === null) {
            return null;
        }

        return ['l' => (float) $product->lab_l, 'a' => (float) $product->lab_a, 'b' => (float) $product->lab_b];
    }

    public function getProductLab(): ?array
    {
        return static::resolveLabFromProduct($this->productVariant);
    }

    public function brand(): BelongsTo
    {
        return $this->belongsTo(Brand::class);
    }

    public function productVariant(): BelongsTo
    {
        return $this->belongsTo(ProductVariant::class);
    }

    public function labelBlueprint(): BelongsTo
    {
        return $this->belongsTo(LabelBlueprint::class);
    }

    public function versions(): HasMany
    {
        return $this->hasMany(DesignVersion::class);
    }

    public function currentVersion(): BelongsTo
    {
        return $this->belongsTo(DesignVersion::class, 'current_version_id');
    }

    public function renders(): HasManyThrough
    {
        return $this->hasManyThrough(DesignRender::class, DesignVersion::class);
    }
}
