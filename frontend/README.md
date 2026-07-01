# TalentMatch Frontend

Frontend-приложение на Vite + React + JavaScript.

## Запуск

```bash
npm install
npm run dev
```

## Настройка API

Создайте локальный `.env` по примеру `.env.example`:

```env
VITE_API_BASE_URL=http://localhost:8000/api
```

Если переменная не задана, frontend использует default `http://localhost:8080/api`.

`VITE_ASSESSMENT_API_BASE_URL` не используется: внутренний `assessment-service` с `POST /api/internal/assessments/calculate` не опубликован как браузерный endpoint API Gateway.

## Интеграция с backend

| Раздел | Backend status | Frontend status | Источник |
| --- | --- | --- | --- |
| Авторизация | `POST /auth/login`, `POST /auth/logout` | подключено, token хранится в `localStorage`, logout очищает сессию | real API |
| Заявки | `GET/POST/PATCH/DELETE /requests`, `GET /requests/{id}` | подключено в списке, форме, карточке и dashboard | real API |
| Требования | `POST /requests/{id}/requirements` | подключено; свободный текст уходит в `raw_text`, не-UUID не отправляется как `technology_id` | real API |
| Кандидаты | `GET /candidates`, `GET /candidates/{id}`, `POST /candidates/upload`, skills endpoints | список, карточка, загрузка резюме и ручные навыки подключены | real API |
| Assessment | `POST /assessments`, `GET /assessments/{id}`, `GET /requests/{id}/assessments`, compare | dashboard, карточка и сравнение связывают candidate-request через assessment, без `candidate.request_id` | real API |
| Справочник технологий | `GET/POST/PATCH/DELETE /technologies`, synonyms endpoints | подключено, при недоступном backend показывается предупреждение и mock fallback | real API + fallback |
| Отчёты | `GET /assessments/{id}/report.pdf`, `GET /requests/{id}/comparison-report.pdf` | API-service готов для PDF | real API |
| Пользователи | users endpoints отсутствуют в публичном OpenAPI | mock-список удалён; раздел доступен только admin и показывает info state/current user | empty state |

## Что остаётся mock/fallback

- Управление пользователями не подключено: в публичном API нет `GET/POST/PATCH/DELETE users`.
- Справочник технологий использует mock fallback только если backend справочника недоступен; UI показывает предупреждение.
- Прямой расчёт покрытия в браузере не используется. Для внутреннего `assessment-service` оставлен TODO до публикации endpoint через API Gateway.

TODO-комментарии в frontend-коде отмечают места, где fallback можно заменить на backend endpoint после расширения OpenAPI.
