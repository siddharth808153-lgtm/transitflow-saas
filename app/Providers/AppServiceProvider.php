<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;

use Illuminate\Database\Eloquent\Relations\Relation;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Relation::morphMap([
            'student'        => \App\Models\Student::class,
            'auto_passenger' => \App\Models\AutoPassenger::class,
            'driver'         => \App\Models\Driver::class,
        ]);
    }
}
