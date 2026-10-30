<?php

namespace App\WhiteLabel\Policies;

use App\Models\User;
use App\WhiteLabel\Models\LabelDesign;

// Registered with Gate::policy() in AppServiceProvider
class LabelDesignPolicy
{
    public function update(User $user, LabelDesign $labelDesign): bool
    {
        $customerId = $user->customer?->id;

        return $customerId !== null && $labelDesign->brand->customer_id === $customerId;
    }
}
