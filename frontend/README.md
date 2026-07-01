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

Дополнительные переменные для parser/skill-recognition/assessment-calculate не добавлены: эти сервисы опубликованы как internal endpoints и должны вызываться backend orchestration layer.

## Интеграция с backend

| Раздел | Backend status | Frontend status | Источник |
| --- | --- | --- | --- |
| Авторизация | `POST /auth/login`, `POST /auth/logout` | подключено, token хранится в `localStorage`, logout очищает сессию | real API |
| Заявки | `GET/POST/PATCH/DELETE /requests`, `GET /requests/{id}` | подключено в списке, форме, карточке и dashboard | real API |
| Требования | `POST /requests/{id}/requirements` | подключено; отправляются все must/nice, `type: must|nice`, `raw_text`, числовой `weight`, UUID-only `technology_id` | real API |
| Кандидаты | `GET /candidates`, `GET /candidates/{id}`, `POST /candidates/upload`, skills endpoints | список, карточка, загрузка резюме и ручные навыки подключены | real API |
| Document parser | `POST /api/internal/documents/parse` | напрямую из браузера не вызывается; ожидается обработка после upload на backend | internal backend |
| Skill recognition | `POST /api/internal/skills/recognize` | напрямую из браузера не вызывается; UI показывает реальные skills/statuses из candidate API | internal backend |
| Assessment orchestration | `POST /assessments`, `GET /assessments/{id}`, `GET /requests/{id}/assessments`, compare | подключено; candidate-request связь строится через assessment | real API |
| Assessment calculate | `POST /api/internal/assessments/calculate` | напрямую из браузера не вызывается; расчёт должен запускаться backend job/service layer | internal backend |
| Справочник технологий | `GET/POST/PATCH/DELETE /technologies`, synonyms endpoints | подключено; синонимы редактируются chips, в таблице отображаются первые 3 + `+N` | real API + local fallback |
| Отчёты | `GET /assessments/{id}/report.pdf`, `GET /requests/{id}/comparison-report.pdf` | API-service готов для PDF | real API |
| Пользователи | users endpoints отсутствуют в публичном OpenAPI | mock-список удалён; раздел доступен только admin и показывает empty/info state | empty state |

## Что остаётся fallback

- Управление пользователями не подключено: в публичном API нет `GET/POST/PATCH/DELETE users`.
- Справочник технологий использует локальные данные только если API справочника недоступен.
- Browser frontend не вызывает internal parser, skill-recognition и assessment-calculate endpoints; это зона backend orchestration.
- React-компоненты не считают покрытие: проценты приходят из публичных assessment endpoints или остаются скрытыми, пока assessment не рассчитан.

TODO-комментарии в frontend-коде отмечают места, где fallback можно заменить на backend endpoint после расширения OpenAPI.
