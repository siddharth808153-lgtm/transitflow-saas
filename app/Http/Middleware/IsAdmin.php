<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class IsAdmin
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        if (auth()->user()?->role !== 'admin') {
            return response()->json([
                'success' => false,
                'message' => 'Access denied. Admin only.',
            ], 403);
        }

        return $next($request);
    }
}
