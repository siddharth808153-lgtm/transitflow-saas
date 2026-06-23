<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class IsSuperAdmin
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        if (auth()->user()?->role !== 'super_admin') {
            return response()->json([
                'success' => false,
                'message' => 'Access denied. Super admin only.',
            ], 403);
        }

        return $next($request);
    }
}
