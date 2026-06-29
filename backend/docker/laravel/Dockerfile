FROM composer:2 AS vendor

ARG SERVICE_PATH
ARG INSTALL_S3=false
ARG INSTALL_REDIS=false
ARG INSTALL_PARSERS=false
ARG INSTALL_PDF=false

WORKDIR /app

RUN composer create-project laravel/laravel . "^12.0" --no-interaction --no-dev --no-scripts --no-progress
RUN rm -f database/migrations/*.php
COPY ${SERVICE_PATH}/ /app/

RUN if [ "$INSTALL_S3" = "true" ]; then composer require league/flysystem-aws-s3-v3 --no-interaction --no-dev --no-scripts --no-progress; fi \
    && if [ "$INSTALL_REDIS" = "true" ]; then composer require predis/predis --no-interaction --no-dev --no-scripts --no-progress; fi \
    && if [ "$INSTALL_PARSERS" = "true" ]; then composer require phpoffice/phpword smalot/pdfparser --no-interaction --no-dev --no-scripts --no-progress; fi \
    && if [ "$INSTALL_PDF" = "true" ]; then composer require barryvdh/laravel-dompdf --no-interaction --no-dev --no-scripts --no-progress; fi \
    && composer dump-autoload --optimize --no-dev --no-scripts

FROM php:8.3-cli-bookworm

RUN apt-get update \
    && apt-get install -y --no-install-recommends git unzip libpq-dev poppler-utils \
    && docker-php-ext-install pdo pdo_pgsql \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=vendor /app /app

EXPOSE 8000
CMD ["php", "artisan", "serve", "--host=0.0.0.0", "--port=8000"]
