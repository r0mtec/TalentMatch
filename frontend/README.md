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
| Авторизация | `POST /auth/login`, `GET /auth/me`, `POST /auth/logout` | подключено, token и профиль из backend хранятся в `localStorage`, logout очищает сессию | real API |
| Заявки | `GET/POST/PATCH/DELETE /requests`, `GET /requests/{id}` | подключено в списке, форме, карточке и dashboard | real API |
| Требования | `POST /requests/{id}/requirements` | подключено; отправляются все must/nice, `type: must|nice`, `raw_text`, числовой `weight`, UUID-only `technology_id` | real API |
| Кандидаты | `GET /candidates`, `GET /candidates/{id}`, `POST /candidates/batch-upload`, skills endpoints | список, карточка, пакетная загрузка резюме из формы заявки и ручные навыки подключены | real API |
| Document parser | `POST /api/internal/documents/parse` | напрямую из браузера не вызывается; ожидается обработка после upload на backend | internal backend |
| Skill recognition | `POST /api/internal/skills/recognize` | напрямую из браузера не вызывается; UI показывает реальные skills/statuses из candidate API | internal backend |
| Assessment orchestration | `POST /requests/{id}/candidates/{candidate_id}/assessments`, `GET /assessments/{id}`, `GET /requests/{id}/assessments`, compare | подключено; candidate-request связь строится через assessment, повторная оценка запускается из карточки кандидата | real API |
| Assessment calculate | `POST /api/internal/assessments/calculate` | напрямую из браузера не вызывается; расчёт должен запускаться backend job/service layer | internal backend |
| Справочник технологий | `GET/POST/PATCH/DELETE /technologies`, `POST /technologies/{id}/synonyms`, `PATCH/DELETE /technology-synonyms/{id}`, `GET /unrecognized-terms`, `POST /unrecognized-terms/{id}/promote` | подключено; синонимы редактируются chips, в таблице отображаются первые 3 + `+N`, нераспознанные термины можно превратить в технологию | real API |
| Отчёты | `GET /assessments/{id}/report.pdf`, `GET /requests/{id}/comparison-report.pdf` | PDF скачивается из карточки кандидата и сравнения по выбранной заявке | real API |
| Пользователи | `GET/POST/PATCH/DELETE /users`, `GET /users/{id}` | admin-раздел подключён: список, создание, редактирование и удаление пользователей | real API |

## Режим без локальных данных

- Локальные бизнес-данные и подстановка локальных результатов удалены: frontend показывает только данные, полученные из backend.
- Если backend endpoint недоступен, UI показывает пустое состояние или сообщение, что функция не подключена к backend.
- Browser frontend не вызывает internal parser, skill-recognition и assessment-calculate endpoints; это зона backend orchestration.
- React-компоненты не считают покрытие: проценты приходят из публичных assessment endpoints или остаются скрытыми, пока assessment не рассчитан.
