# Backend services

Backend разделен на Laravel-сервисы в директории `backend/services/`:

- `request-management-service` - внешний REST API и основная схема БД.
- `document-parser-service` - внутренний API парсинга файлов.
- `skill-recognition-service` - внутренний API распознавания навыков.
- `assessment-service` - внутренний API расчета покрытия.
- `report-service` - внутренний API генерации PDF.

Общий Dockerfile: `backend/docker/laravel/Dockerfile`.

При сборке Dockerfile создает базовый Laravel-проект через Composer, удаляет дефолтные миграции и накладывает файлы конкретного сервиса из `backend/services/<service-name>`. Это сохраняет репозиторий компактным и оставляет настоящий Laravel runtime внутри контейнеров.

## README сервисов

- [request-management-service](services/request-management-service/README.md)
- [document-parser-service](services/document-parser-service/README.md)
- [skill-recognition-service](services/skill-recognition-service/README.md)
- [assessment-service](services/assessment-service/README.md)
- [report-service](services/report-service/README.md)
