# TalentMatch

TalentMatch - учебный MVP сервиса для первичной сверки резюме кандидата с требованиями заказчика.

Каркас в репозитории показывает будущую микросервисную структуру: Laravel-сервисы, React frontend, PostgreSQL, MinIO для исходных файлов резюме и Redis для очередей.

## Быстрый запуск

Создайте локальный env-файл:

```bash
cp .env.example .env
```

Для локальной разработки значения уже можно оставить как в примере. Для общего окружения поменяйте `APP_KEY`, `POSTGRES_PASSWORD` и `MINIO_ROOT_PASSWORD`.

```bash
docker compose up --build
```

После запуска:

- frontend через reverse proxy: http://localhost:8080
- frontend напрямую: http://localhost:5173
- request-management-service: http://localhost:8000
- document-parser-service: http://localhost:8001
- skill-recognition-service: http://localhost:8002
- assessment-service: http://localhost:8003
- report-service: http://localhost:8004
- MinIO console: http://localhost:9001
- PostgreSQL: `localhost:5432`, параметры берутся из `.env`

MinIO credentials и bucket также берутся из `.env`:

```text
MINIO_ROOT_USER=...
MINIO_ROOT_PASSWORD=...
AWS_BUCKET=...
```

## Состав контейнеров

- `nginx` - единый локальный вход и proxy для `/api`.
- `frontend` - React/Vite интерфейс на русском языке.
- `request-management-service` - основной Laravel REST API, RBAC, запросы, кандидаты, orchestration пайплайна.
- `queue-worker` - Laravel Queue worker для фоновых задач.
- `document-parser-service` - внутренний Laravel API для извлечения текста из `docx/pdf`.
- `skill-recognition-service` - внутренний Laravel API для rule-based распознавания навыков.
- `assessment-service` - внутренний Laravel API для расчета покрытия.
- `report-service` - внутренний Laravel API для PDF-отчетов.
- `postgres` - основная база данных.
- `minio` и `minio-init` - S3-compatible файловое хранилище и создание bucket `resumes`.
- `redis` - очередь и простой кэш.

## Документация

- Архитектура: [docs/architecture.md](docs/architecture.md)
- OpenAPI: [docs/openapi/talentmatch.openapi.yml](docs/openapi/talentmatch.openapi.yml)
- Сущности БД: [docs/database_entities.md](docs/database_entities.md)
- Диаграмма БД: [docs/database_schema.puml](docs/database_schema.puml)

## Миграции

Ключевая схема PostgreSQL лежит в Laravel migration:

```text
backend/services/request-management-service/database/migrations/2026_01_01_000001_create_talentmatch_core_tables.php
```

После старта контейнеров миграции можно выполнить так:

```bash
docker compose exec request-management-service php artisan migrate
```

## Проверка health endpoints

```bash
curl http://localhost:8000/health
curl http://localhost:8001/health
curl http://localhost:8002/health
curl http://localhost:8003/health
curl http://localhost:8004/health
```

Endpoints пока возвращают stub/mock responses. Это ожидаемо: цель текущего этапа - каркас, контракты, схема данных и точки расширения, а не полная бизнес-логика.
