# DailyMed Medication Education Module

## Purpose

The module gives authenticated nursing users access to current public medication label content from the US National Library of Medicine DailyMed service. It adds student-owned medication notes, source-grounded quizzes, and flashcards without presenting label content as patient-specific clinical advice.

DailyMed does not require an API key. The integration uses the documented v2 search, drug-name, and SPL XML endpoints at a fixed HTTPS origin.

## User Routes

| Route | Access | Purpose |
| --- | --- | --- |
| `/ng/education/medications` | Authenticated nursing users | Search by generic name, brand name, or active ingredient |
| `/ng/education/medications/[setId]` | Authenticated nursing users | Review one structured official label |
| `/ng/education/medication-notes` | Student | Create and manage private medication study notes |
| `/ng/education/medication-quizzes` | Student | Complete deterministic, source-grounded quizzes |
| `/ng/education/medication-flashcards` | Student | Review label-supported flashcards and save progress |

The medication navigation is also available from the authenticated student dashboard. Each medication page uses the shared nursing session and redirects unauthenticated users to the nursing sign-in route.

## API Surface

All endpoints are same-origin routes under `/api/nursing` and require a valid signed nursing session cookie.

| Method and path | Access | Behavior |
| --- | --- | --- |
| `GET /medications/search` | Authenticated nursing users | Paginated DailyMed search |
| `GET /medications/suggestions` | Authenticated nursing users | Debounced medication-name suggestions |
| `GET /medications/:setId` | Authenticated nursing users | Parsed and sanitized SPL label |
| `GET /medications/:setId/flashcards` | Student | Label-supported flashcard deck |
| `POST /medications/:setId/quizzes` | Student | Public quiz payload with answers removed |
| `GET/POST /medication-notes` | Student | List or create private notes |
| `PATCH/DELETE /medication-notes/:noteId` | Student owner | Update or delete an owned note |
| `GET/POST /medication-quizzes/attempts` | Student | Read or grade and store quiz attempts |
| `GET/PUT /medication-flashcards/progress` | Student | Read or update card progress |

The medication proxy has a separate per-client rate limit. Query lengths, pagination, set IDs, note fields, quiz answers, and progress values are validated before processing.

## Data and Privacy

Run `npm run migrate` before releasing the module. Migration `1110_dailymed_medication_education.sql` creates:

- `nursing_medication_notes`
- `nursing_medication_quiz_attempts`
- `nursing_medication_flashcard_progress`

Rows retain tenant and user ownership keys. The server enforces student ownership on every personal record operation. Notes require an explicit confirmation that no identifiable patient information is present. The module is for generalized education and must not be used to store medical records or patient identifiers.

## DailyMed Client

`server/services/dailyMedService.js` provides:

- HTTPS origin and path allowlisting
- request timeouts and bounded response sizes
- retry handling for network errors, HTTP 429, and transient upstream failures
- `Retry-After` support
- in-memory TTL caching and concurrent request de-duplication
- operational warnings that omit search terms and user data

Optional environment settings:

```env
DAILYMED_REQUEST_TIMEOUT_MS=25000
DAILYMED_CACHE_TTL_MS=21600000
DAILYMED_RETRY_DELAY_MS=350
```

## Label Processing

`server/services/dailyMedParser.js` parses SPL XML with a structured XML parser. It extracts product names, active ingredients, dosage forms, routes, labeler, label date, SPL version, and supported narrative sections. Narrative markup is converted to a constrained HTML subset and sanitized before being returned to the browser.

Quiz and flashcard generators only use facts or narrative sections that exist in the selected parsed label. Quiz answers are removed from the initial response and regenerated on the server for grading. Results retain the source section, explanation, submitted answer, and correct answer.

## Limits and Clinical Safety

- DailyMed reflects US labeling and does not replace Nigerian regulatory guidance, institutional policy, local protocols, or professional judgment.
- The module does not provide diagnosis, prescribing, dose calculation, or patient-specific recommendations.
- The current integration displays the official Drug Interactions label section when available. It does not claim to perform a complete multi-drug interaction check.
- Upstream availability and content freshness remain dependent on DailyMed. Cached labels reduce load but do not create a permanent local label archive.

## Verification

Run the repository checks before release:

```powershell
npm run lint
npm test
npm run build
npm run test:bundle
```

The dedicated test file is `tests/dailymed-medication-education.test.js`. It covers parsing, sanitization, caching, retry and timeout behavior, quiz grounding and grading, API authentication, note ownership, attempt persistence, and flashcard progress.
