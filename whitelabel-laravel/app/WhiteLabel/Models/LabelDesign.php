<?php

namespace App\WhiteLabel\Models;

use App\Models\ProductOptionValue;
use App\WhiteLabel\Services\BarcodeGenerator;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\MediaLibrary\HasMedia;
use Spatie\MediaLibrary\InteractsWithMedia;

/**
 * @property string $id
 * @property string $brand_id
 * @property string|null $blueprint_id
 * @property string $name
 * @property bool $default
 * @property array|null $design
 * @property Brand $brand
 * @property ProductOptionValue[]|null $productOptionValues
 * @property LabelBlueprint|null $blueprint
 * @property DesignVersion[]|null $versions
 * @property DesignVersion|null $latestVersion
 */
class LabelDesign extends Model implements HasMedia
{
    use HasUuids;
    use SoftDeletes;
    use InteractsWithMedia;

    protected $table = 'wl_label_designs';

    protected $guarded = ['id'];

    protected $casts = [
        'default' => 'boolean',
        'design' => 'array',
    ];

    public function brand(): BelongsTo
    {
        return $this->belongsTo(Brand::class);
    }

    public function productOptionValues(): BelongsToMany
    {
        return $this->belongsToMany(
            ProductOptionValue::class,
            'wl_label_design_product_option_value',
            'label_design_id',
            'product_option_value_id'
        )->withTimestamps();
    }

    public function blueprint(): BelongsTo
    {
        return $this->belongsTo(LabelBlueprint::class, 'blueprint_id');
    }

    public function versions(): HasMany
    {
        return $this->hasMany(DesignVersion::class);
    }

    public function currentBrandedProducts(): HasManyThrough
    {
        return $this->hasManyThrough(
            BrandedProduct::class,
            DesignVersion::class,
            'label_design_id',
            'current_version_id',
            'id',
            'id'
        );
    }

    public function latestVersion(): HasOne
    {
        return $this->hasOne(DesignVersion::class)->latestOfMany('created_at');
    }

    /**
     * Design for this template. "Save as template" keeps the design on the latest version,
     * so fall back to it. Barcode is removed, it belongs to one product only.
     */
    public function getEffectiveDesignAttribute(): ?array
    {
        $design = $this->design ?? $this->latestVersion?->design;

        if ($design === null) {
            return null;
        }

        $design['objects'] = app(BarcodeGenerator::class)->stripFrom($design['objects'] ?? []);

        return $design;
    }

    public function registerMediaCollections(): void
    {
        $this->addMediaCollection('preview_flat')->singleFile();
    }

    public function getThumbnailUrl(): string
    {
        $flat = $this->getFirstMediaUrl('preview_flat');

        if ($flat !== '') {
            return $flat;
        }

        return url('/img/white_label/label_template.png');
    }
}
