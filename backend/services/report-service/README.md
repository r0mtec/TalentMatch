# report-service

Внутренний Laravel-сервис для генерации PDF-отчетов.

## Назначение

Сервис формирует PDF-отчеты по результатам сверки кандидатов с запросами.

## Основные задачи

- сформировать PDF-отчет по одному assessment;
- сформировать сравнительный PDF-отчет по нескольким кандидатам под один запрос;
- использовать данные assessment:
  - общий процент покрытия;
  - покрытие `must have`;
  - покрытие `nice to have`;
  - закрытые требования;
  - отсутствующие требования;
  - evidence по закрытым требованиям;
- вернуть PDF-файл вызывающему сервису.

## Endpoints

- `POST /api/internal/reports/assessment`
- `POST /api/internal/reports/comparison`

## Health endpoints

- `GET /health`
- `GET /ready`

## Зависимости

- данные assessment из `request-management-service` или PostgreSQL;
- PDF-библиотека, например `barryvdh/laravel-dompdf`.

## Реализация

Сервис принимает уже подготовленные данные из `request-management-service` и генерирует PDF из простого HTML через `barryvdh/laravel-dompdf`.

Сервис не читает БД, не считает assessment, не парсит резюме и не распознает навыки.

PDF assessment report содержит:

- запрос;
- кандидата;
- `total_score`;
- `must_score`;
- `nice_score`;
- закрытые требования;
- отсутствующие требования;
- `evidence_text`.

PDF comparison report содержит таблицу последних assessment по кандидатам одного request.

