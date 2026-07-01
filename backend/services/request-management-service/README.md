# request-management-service

Основной backend-сервис TalentMatch. Это внешний Laravel REST API, через который frontend работает с системой.

## Назначение

Сервис управляет основными пользовательскими сценариями:

- авторизация пользователей;
- создание и редактирование запросов заказчика;
- управление требованиями `must have` и `nice to have`;
- загрузка резюме кандидатов;
- управление карточками кандидатов и их навыками;
- запуск сверки кандидата с запросом;
- получение результатов assessment;
- управление справочником технологий и синонимов;
- получение PDF-отчетов через report-service.

## Роль в архитектуре

`request-management-service` является входной точкой backend-части. Он принимает запросы от frontend и координирует внутренние сервисы:

- `document-parser-service` — извлечение текста из `docx/pdf`;
- `skill-recognition-service` — распознавание навыков в тексте;
- `assessment-service` — расчет покрытия требований;
- `report-service` — генерация отчетов;
- PostgreSQL — основная БД;
- MinIO — хранение исходных файлов резюме;
- Redis — очередь фоновых задач.

## Основные endpoints

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/users` — только `admin`
- `POST /api/users` — только `admin`
- `GET /api/users/{id}` — только `admin`
- `PATCH /api/users/{id}` — только `admin`
- `DELETE /api/users/{id}` — только `admin`
- `GET /api/requests`
- `POST /api/requests`
- `GET /api/requests/{id}`
- `PATCH /api/requests/{id}`
- `DELETE /api/requests/{id}`
- `POST /api/requests/{id}/requirements`
- `GET /api/candidates`
- `POST /api/candidates/upload`
- `GET /api/candidates/{id}`
- `GET /api/candidates/{id}/skills`
- `POST /api/assessments`
- `GET /api/assessments/{id}`
- `GET /api/technologies`
- `POST /api/technologies`
- `PATCH /api/technologies/{id}`
- `DELETE /api/technologies/{id}`
- `POST /api/technologies/{id}/synonyms`
- `PATCH /api/technology-synonyms/{id}`
- `DELETE /api/technology-synonyms/{id}`
- `GET /api/assessments/{id}/report.pdf`

## Health endpoints

- `GET /health`
- `GET /ready`

## База данных

В этом сервисе лежит основная схема PostgreSQL:

```text
database/migrations/2026_01_01_000001_create_talentmatch_core_tables.php
```

Основные модели:

- `User`
- `CustomerRequest`
- `Requirement`
- `Candidate`
- `CandidateSkill`
- `Technology`
- `TechnologySynonym`
- `Assessment`
- `AssessmentRequirementResult`

## Текущее состояние

Сервис реализует основные backend-сценарии через PostgreSQL, Redis Queue, MinIO и внутренние HTTP-сервисы. Справочник технологий и синонимов хранится в БД; `skill-recognition-service` получает его из `request-management-service` при распознавании.

