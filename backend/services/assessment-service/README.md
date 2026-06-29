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

## Текущее состояние

Сервис содержит базовый `CoverageCalculator`. Он уже умеет считать weighted coverage по массивам требований и навыков, но работает как каркас.

## Что нужно реализовать дальше

- сопоставление по `technology_id`, а не только по `normalized_name`;
- учет свободного текста требований;
- перенос evidence из `candidate_skills`;
- проверку грейда, локации и гражданства;
- обработку edge cases;
- контракт ответа, полностью совпадающий с таблицами `assessments` и `assessment_requirement_results`.
