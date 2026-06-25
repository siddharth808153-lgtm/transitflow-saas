#!/bin/bash
set -e

echo "🚀 Running deployment script..."

# Install composer dependencies (production)
composer install --no-dev --optimize-autoloader --no-interaction

# Cache configuration for performance
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Run database migrations
php artisan migrate --force

echo "✅ Deployment complete!"
