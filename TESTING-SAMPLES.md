# Примеры файлов для тестирования Proveny

В корне проекта лежат три `.js` файла для ручной проверки в UI (http://localhost:3001).

| Файл | Когда загружать | Роль |
|------|-----------------|------|
| `sample-week1-baseline.js` | Вкладка **Week 1 Baseline** | STUDENT (во время активной прокторской сессии) |
| `sample-assignment-normal.js` | Вкладка **Assignment Submit** | STUDENT (после lock сессии proctor'ом) |
| `sample-assignment-suspicious.js` | Та же вкладка, другое задание | STUDENT — чтобы увидеть FLAGGED в action queue |

## Порядок использования

1. Proctor: создать сессию → **Activate** → дать студенту **session code**.
2. Student: **Week 1 Baseline** → курс + код → `sample-week1-baseline.js`.
3. Proctor: **Lock & Seal** сессии.
4. Instructor: курс, enroll студента, создать assignment.
5. Student: **Assignment Submit** → `sample-assignment-normal.js` или `sample-assignment-suspicious.js`.
6. Instructor: **Action Queue** — для suspicious сдачи ожидайте повышенный risk.

## Формат файлов

- Расширение: `.js` (или `.txt` с JS-кодом внутри).
- Backend парсит код через **Babel AST** (JavaScript/TypeScript).
- В UI указаны `.py`, `.java`, но сервер принимает только JS/TS MIME — для теста используйте `.js`.

## Откуда берётся «fingerprint» (отпечаток)

**Fingerprint — это не отдельный файл.** Это запись **baseline Week 1** в базе данных, которая создаётся один раз на студента и курс.

### Что сохраняется при baseline

Когда студент загружает код на Week 1 (`POST /api/v1/baselines`):

1. **SHA-256** от исходника → `contentHash` (защита от подмены).
2. **rawCode** — полный текст файла.
3. **sophisticationScore** (0–100) — итог AST-анализа.
4. **metrics** (JSON) — «отпечаток стиля», например:
   - `errorHandlingTier`, `architectureTier`, `typeSafetyTier`
   - `hasAsyncAwait`, `hasDecorators`, `hasCircuitBreaker`, …
5. После **Lock** proctor'а → `isLocked: true`, baseline **нельзя изменить**.

Код анализа: `src/engines/ast/sophisticationScorer.js` → `src/modules/baselines/baselines.service.js`.

### Как baseline используется дальше

При сдаче **assignment** (`POST /api/v1/submissions`):

- Снова считаются score + metrics для нового файла.
- `worker-analysis` сравнивает submission с **baseline этого же курса**:
  - **Trajectory** — насколько score вырос относительно ожидаемого для недели задания.
  - **Genealogy** — появились ли «продвинутые» приёмы, которых не было в Week 1 (правила в `techniquePrerequisite`).
  - **Cohort** — насколько сдача выбивается из одногруппников.
- Результат → `ensembleScore`, `riskLevel` → instructor **action queue**.

То есть fingerprint **берётся из первой недели (baseline)**, а не из assignment. Assignment только **сравнивается** с этим отпечатком.

### Схема

```text
Week 1 (proctored)          Week 4+ (assignment)
     │                              │
     ▼                              ▼
 upload .js                   upload .js
     │                              │
     ▼                              ▼
 AST → metrics + score        AST → metrics + score
     │                              │
     ▼                              │
 Baseline в БД ◄────────────────────┘
 (fingerprint)              ensemble vs baseline
```

## Подсказки

- Один baseline на студента **на курс** — повторно baseline не загрузить.
- Assignment нельзя сдать, пока proctor не сделал **Lock** baseline.
- Два студента не могут сдать **одинаковый** baseline (проверка `contentHash`).
