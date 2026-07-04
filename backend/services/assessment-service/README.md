# assessment-service

Внутренний Laravel-сервис для расчета покрытия требований кандидатом.

## Назначение

Сервис получает список требований запроса и список навыков кандидата, сопоставляет их и считает проценты покрытия.

Сервис не занимается загрузкой файлов, парсингом резюме и распознаванием навыков. Его зона ответственности — только расчет результата сверки.

## Основные задачи

- сопоставить требования запроса с навыками кандидата;
- посчитать покрытие `must have`;
- посчитать покрытие `nice to have`;
- посчитать общий weighted score;
- определить, есть ли незакрытые обязательные требования;
- сформировать результат по каждому требованию;
- вернуть структуру, пригодную для сохранения в `assessments` и `assessment_requirement_results`.

## Формула

```text
coverage = sum(weights of matched requirements) / sum(weights of all requirements) * 100
```

Отдельно считаются:

- `must_score`;
- `nice_score`;
- `total_score`.

## Endpoint

- `POST /api/internal/assessments/calculate`

Пример входных данных:

```json
{
  "requirements": [
    {
      "id": "req-1",
      "type": "must",
      "weight": 3,
      "normalized_name": "laravel"
    }
  ],
  "skills": [
    {
      "id": "skill-1",
      "normalized_name": "laravel",
      "evidence_text": "Опыт Laravel 3 года"
    }
  ]
}
```

## Health endpoints

- `GET /health`
- `GET /ready`

## Реализация

Сервис содержит `CoverageCalculator`, который работает только с payload запроса и не читает БД.

Сопоставление требований:

- сначала по `technology_id`, если он есть у требования и навыка;
- затем по `normalized_name` и `raw_text`;
- свободный текст нормализуется: lower-case, базовая пунктуация, лишние пробелы;
- для совпадений используется короткая проверка границ токенов, чтобы не ловить часть другого слова.

Результат содержит:

- `must_score`;
- `nice_score` — если требований `nice` нет, считается `100`, потому что этот блок полностью удовлетворён по умолчанию;
- `total_score`;
- `has_missing_must_requirements`;
- `grade_match_status`;
- `location_match_status`;
- `citizenship_match_status`;
- detail по каждому requirement с `matched_candidate_skill_id`, `evidence_text`, `score_contribution` и `comment`.

Статусы условий:

- `matches`;
- `does_not_match`;
- `unknown`.
