FROM composer:2 AS vendor

ARG SERVICE_PATH
ARG INSTALL_S3=false
ARG INSTALL_REDIS=false
ARG INSTALL_PARSERS=false
ARG INSTALL_PDF=false
ARG INSTALL_DEV=true
ARG SERVICE_APP_NAME=Laravel
ARG COMPOSER_DISABLE_NETWORK=0

WORKDIR /app

RUN COMPOSER_DISABLE_NETWORK=0 composer create-project laravel/laravel . "^12.0" --no-interaction --no-install --no-scripts --no-progress \
    && composer config platform.php 8.3.31 \
    && if [ "$INSTALL_DEV" = "true" ]; then composer install --no-interaction --no-scripts --no-progress; else composer install --no-interaction --no-dev --no-scripts --no-progress; fi
RUN rm -f database/migrations/*.php tests/Feature/ExampleTest.php tests/Unit/ExampleTest.php
COPY ${SERVICE_PATH}/ /app/
RUN if [ -f .env.example ]; then cp .env.example .env; fi \
    && set_env() { key="$1"; value="$2"; if grep -q "^${key}=" .env; then sed -i "s|^${key}=.*|${key}=${value}|" .env; else printf '\n%s=%s\n' "$key" "$value" >> .env; fi; } \
    && set_env APP_KEY base64:MDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDA= \
    && set_env APP_NAME "$SERVICE_APP_NAME" \
    && set_env SESSION_DRIVER array \
    && set_env CACHE_STORE file \
    && set_env QUEUE_CONNECTION redis \
    && set_env DB_CONNECTION pgsql \
    && set_env DB_HOST postgres \
    && set_env DB_PORT 5432 \
    && set_env DB_DATABASE talentmatch \
    && set_env DB_USERNAME talentmatch \
    && set_env DB_PASSWORD talentmatch \
    && set_env REDIS_CLIENT predis \
    && set_env REDIS_HOST redis \
    && set_env REDIS_PORT 6379 \
    && set_env FILESYSTEM_DISK s3 \
    && set_env AWS_ACCESS_KEY_ID minio \
    && set_env AWS_SECRET_ACCESS_KEY minio-password \
    && set_env AWS_DEFAULT_REGION us-east-1 \
    && set_env AWS_BUCKET resumes \
    && set_env AWS_ENDPOINT http://minio:9000 \
    && set_env AWS_USE_PATH_STYLE_ENDPOINT true

RUN COMPOSER_REQUIRE_FLAGS="--no-interaction --no-scripts --no-progress" \
    && if [ "$INSTALL_DEV" != "true" ]; then COMPOSER_REQUIRE_FLAGS="$COMPOSER_REQUIRE_FLAGS --update-no-dev"; fi \
    && if [ "$INSTALL_S3" = "true" ]; then composer require league/flysystem-aws-s3-v3 $COMPOSER_REQUIRE_FLAGS; fi \
    && if [ "$INSTALL_REDIS" = "true" ]; then composer require predis/predis $COMPOSER_REQUIRE_FLAGS; fi \
    && if [ "$INSTALL_PARSERS" = "true" ]; then composer require phpoffice/phpword smalot/pdfparser $COMPOSER_REQUIRE_FLAGS; fi \
    && if [ "$INSTALL_PDF" = "true" ]; then composer require barryvdh/laravel-dompdf $COMPOSER_REQUIRE_FLAGS; fi \
    && if [ "$INSTALL_DEV" = "true" ]; then composer dump-autoload --optimize --no-scripts; else composer dump-autoload --optimize --no-dev --no-scripts; fi

FROM php:8.3-cli-bookworm

RUN apt-get update \
    && apt-get install -y --no-install-recommends git unzip libpq-dev libsqlite3-dev libzip-dev poppler-utils \
    && docker-php-ext-install pdo pdo_pgsql pdo_sqlite zip \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=vendor /app /app

EXPOSE 8000
CMD ["php", "artisan", "serve", "--host=0.0.0.0", "--port=8000"]
