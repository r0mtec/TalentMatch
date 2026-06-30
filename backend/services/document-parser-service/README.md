# document-parser-service

Внутренний Laravel-сервис для извлечения текста из файлов резюме.

## Назначение

`document-parser-service` получает файл резюме в формате `docx` или `pdf`, извлекает из него обычный текст и возвращает этот текст вызывающему сервису.

Сервис не анализирует содержание резюме. Он не ищет навыки, требования, грейд, локацию, опыт, проекты или языки. У резюме нет фиксированного шаблона, поэтому parser не должен пытаться выделять обязательные разделы.

## Граница ответственности

Сервис делает:

- принимает внутренний запрос на извлечение текста;
- получает файл из MinIO/S3-compatible storage по `file_storage_key`;
- проверяет формат файла: `docx` или `pdf`;
- извлекает `plain_text`;
- возвращает `candidate_id`, `status`, `plain_text`, `warnings`;
- возвращает ошибку, если файл невозможно прочитать.

Сервис не делает:

- не распознает навыки;
- не нормализует технологии;
- не ищет требования заказчика;
- не рассчитывает покрытие;
- не принимает решение о соответствии кандидата;
- не строит секции резюме, потому что шаблона резюме нет.

## Endpoint

- `POST /api/internal/documents/parse`

## Входные данные

Ожидаемый payload:

```json
{
  "candidate_id": "uuid",
  "file_storage_key": "resumes/2026/06/candidate-id/resume.pdf",
  "file_mime_type": "application/pdf",
  "original_file_name": "resume.pdf"
}
```

## Успешный ответ

```json
{
  "candidate_id": "uuid",
  "status": "parsed",
  "plain_text": "Текст, извлеченный из резюме...",
  "warnings": []
}
```

## Ответ с ошибкой

```json
{
  "candidate_id": "uuid",
  "status": "failed",
  "plain_text": null,
  "warnings": ["encrypted_pdf"],
  "error": "PDF is encrypted and cannot be parsed"
}
```

## Health endpoints

- `GET /health`
- `GET /ready`

## Зависимости

- MinIO/S3-compatible storage для чтения исходных файлов;
- `phpoffice/phpword` для чтения `docx`;
- `smalot/pdfparser` или аналог для чтения `pdf`.

## Текущее состояние

Сервис сейчас содержит stub-реализацию `DocumentParserService::parseStub()`. Она не читает реальный файл, а возвращает демонстрационный `plain_text`.

Текущий stub нужен только для проверки контракта между сервисами.

## Что нужно реализовать дальше

- чтение файла из MinIO по `file_storage_key`;
- реальный parser для `docx`;
- реальный parser для `pdf`;
- обработку пустого текста;
- обработку поврежденных файлов;
- обработку зашифрованных PDF;
- timeout на парсинг;
- нормальные статусы `parsed` и `failed`;
- возврат технических warnings без логирования полного текста резюме.

## Следующий сервис в пайплайне

После успешного парсинга `plain_text` передается в `skill-recognition-service`.

Именно `skill-recognition-service` ищет навыки по всему тексту резюме. Именно `assessment-service` сверяет найденные навыки с требованиями запроса.
