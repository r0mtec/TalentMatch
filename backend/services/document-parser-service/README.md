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

## Реализация

Сервис читает файл из MinIO/S3-compatible storage через Laravel filesystem disk `s3`, сохраняет его во временный файл и извлекает `plain_text`:

- `docx` — через `phpoffice/phpword`;
- `pdf` — через `smalot/pdfparser`.

Если файл отсутствует, пустой, поврежден, зашифрован или не дает текста, сервис возвращает `status=failed`, `plain_text=null`, технический `warning` и понятное поле `error`.

Парсинг ограничен таймаутом `DOCUMENT_PARSE_TIMEOUT_SECONDS` там, где это поддерживает runtime. Полный `plain_text` не пишется в логи.

## Следующий сервис в пайплайне

После успешного парсинга `plain_text` передается в `skill-recognition-service`.

Именно `skill-recognition-service` ищет навыки по всему тексту резюме. Именно `assessment-service` сверяет найденные навыки с требованиями запроса.
