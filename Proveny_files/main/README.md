# Proveny — Full-Stack Code Forensics Platform

Proveny is a production-oriented full-stack application for anti-plagiarism code forensics (SylLab track deliverable): proctored Week 1 baselines, AST sophistication scoring, trajectory and cohort analysis, instructor action queues, and role-based review workflows.

**Stack:** Express 5 + Prisma + PostgreSQL 15 + Redis 7 + BullMQ + vanilla JS SPA (Nginx).

---

## Quick Start (recommended — Docker Compose)

Prerequisites: [Docker Desktop](https://www.docker.com/products/docker-desktop/) (includes `docker compose`).

```bash
cd Proveny_files/main
docker compose up --build
```

One command starts the entire stack — no manual database setup or separate worker terminals.

| Service | URL / port |
|---------|------------|
| **Frontend demo** | http://localhost:3001 |
| **API** | http://localhost:3000/api/v1 |
| **Swagger UI** | http://localhost:3001/docs (proxied) or http://localhost:3000/docs |
| PostgreSQL 15 | `localhost:5432` |
| Redis 7 | `localhost:6379` |

**Containers:** `postgres`, `redis`, `backend`, `frontend`, `worker-email`, `worker-analysis`, `worker-maintenance`.

Stop: `Ctrl+C` then `docker compose down`.

### First login (seed admin)

Created automatically on first backend boot:

| Field | Value |
|-------|-------|
| Email | `admin@Proveny.local` |
| Password | `AdminPass123!` |

Use the **Admin** dashboard to provision instructors and proctors. Change these credentials in production (`SEED_ADMIN_*` env vars).

### Optional: real email (defense demo)

Copy `.env.example` to `.env` and set SMTP credentials (Mailtrap, Brevo, SendGrid SMTP, etc.), then pass them to Compose:

```bash
SMTP_USER=your_user SMTP_PASS=your_pass docker compose up --build
```

Verification and business emails are **queued** by the API and sent asynchronously by `worker-email`.

---

## Frontend — role-based demo

After login, the SPA shows a **different dashboard per role** (real API calls, no mocked data).

| Role | UI workflows |
|------|----------------|
| **STUDENT** | Register → verify email → baseline upload (session code) → assignment submit → submission history & forensic details |
| **INSTRUCTOR** | Create courses, enroll students, create assignments, review action queue, record interview outcomes, one-shot analysis, cohort statistics |
| **PROCTOR** | Create proctored sessions, activate, lock & seal |
| **ADMIN** | Provision users (any role), view audit logs |

### Registration and roles

- **Public registration** always creates a `STUDENT` account (security: no self-service role escalation).
- **INSTRUCTOR**, **PROCTOR**, and **ADMIN** accounts are created by an admin via `POST /api/v1/users` or the Admin UI.

Email links open the frontend:

- Verify: `http://localhost:3001/?verify=<token>`
- Password reset: `http://localhost:3001/?reset=<token>`

Set `APP_BASE_URL` to your public frontend URL in production (DeployRocks).

---

## Auth & security

```text
POST /api/v1/auth/register         → queues verification email
GET  /api/v1/auth/verify-email     → verify via email link (query token)
POST /api/v1/auth/verify-email     → verify via SPA form (body token)
POST /api/v1/auth/resend-verification
POST /api/v1/auth/login            → accessToken + refreshToken (verified email required)
POST /api/v1/auth/refresh          → rotates refresh token (Redis JTI)
POST /api/v1/auth/logout           → revokes all refresh tokens
POST /api/v1/auth/forgot-password  → queues reset email
POST /api/v1/auth/reset-password   → new password + session revoke
```

- JWT access + refresh with rotation; unverified users blocked from protected routes.
- Redis rate limiting on auth endpoints (disabled in `NODE_ENV=test`).
- RBAC on all business routes (`STUDENT`, `INSTRUCTOR`, `PROCTOR`, `ADMIN`).

Full contract: [`openapi.yaml`](openapi.yaml) · Live docs: `/docs`

---

## Business workflow (defense demo path)

1. Admin/instructor creates a course; instructor enrolls students.
2. Proctor creates a proctored session → **Activate** → students submit **Week 1 baseline** with session code.
3. Proctor **Lock & Seal** session → baseline becomes immutable.
4. Instructor creates assignments; students submit code before `dueDate`.
5. `worker-analysis` runs ensemble scoring (trajectory z-score, genealogy, cohort outlier).
6. Flagged/critical items appear in the instructor **action queue**; emails enqueue to instructors.
7. Instructor records interview outcome → student receives email notification.

### Business emails (async via BullMQ)

| Event | Recipient |
|-------|-----------|
| Email verification | New user |
| Password reset | User |
| Baseline captured | Student |
| Submission flagged / escalation | Instructor |
| Interview outcome | Student |
| Stale flagged review (cron) | Instructor |

### Queue visibility & cron

`GET /api/v1/queue/jobs` — BullMQ job counts and recent jobs for `email`, `analysis`, `maintenance`.

| Job | Schedule | Purpose |
|-----|----------|---------|
| `stale-flag-review` | Monday 09:00 UTC | Remind instructors about old high-risk PENDING reviews |

---

## DeployRocks (production)

1. Push this repository to GitHub (public or instructor-invited).
2. Sign up at [dashboard.deployrocks.com](https://dashboard.deployrocks.com) and connect GitHub.
3. Deploy using `docker-compose.yml` in this directory.
4. Configure environment variables from [`.env.example`](.env.example):
   - `JWT_SECRET`, `JWT_REFRESH_SECRET` (32+ chars each)
   - `DATABASE_URL` → host `postgres` (not `localhost`)
   - `REDIS_URL` → host `redis`
   - `SMTP_*`, `APP_BASE_URL` (public frontend URL)
   - `CORS_ALLOWED_ORIGINS` → include your DeployRocks domain
5. Paste the live URL into [`DEPLOYED_URL.txt`](DEPLOYED_URL.txt).
6. Record your defense video link in [`VIDEO_LINK.txt`](VIDEO_LINK.txt).

---

## Submission deliverables (this directory)

| File | Purpose |
|------|---------|
| [`docker-compose.yml`](docker-compose.yml) | Full stack orchestration |
| [`.env.example`](.env.example) | All environment variables |
| [`openapi.yaml`](openapi.yaml) | API contract |
| [`prisma/migrations/`](prisma/migrations/) | Database migration history |
| [`frontend/`](frontend/) | Demo SPA |
| [`tests/`](tests/) | Unit + integration tests |
| [`CHECKLIST.txt`](CHECKLIST.txt) | Self-verification before submission |
| [`DEPLOYED_URL.txt`](DEPLOYED_URL.txt) | Live public URL |
| [`VIDEO_LINK.txt`](VIDEO_LINK.txt) | 5-minute defense video |
| [`SCORING_RUBRIC.md`](SCORING_RUBRIC.md) | AST sophistication rubric (15+ metrics) |
| [`CHANGELOG.md`](CHANGELOG.md) | API/schema changes vs blueprint |

---

## Local development (without Docker)

Use this path only if you need hot-reload or debugging outside containers.

**Requirements:** Node.js 20+, PostgreSQL 15+, Redis 7+, SMTP credentials.

```bash
npm install
copy .env.example .env    # Windows
# cp .env.example .env    # macOS/Linux
npm run prisma:generate
npm run prisma:migrate
npm run seed
```

Terminal 1 — API:

```bash
npm run dev
```

Terminals 2–4 — workers:

```bash
npm run worker:email
npm run worker:analysis
npm run worker:maintenance
```

| Resource | URL |
|----------|-----|
| API | http://localhost:3000/api/v1 |
| Swagger | http://localhost:3000/docs |

Serve the frontend separately (e.g. any static server on port 3001) or use Docker for the SPA only.

---

## Testing

```bash
npm run lint
npm test
npx prisma validate
```

Tests cover auth security (role escalation blocked, refresh rotation), email queue enqueue, cohort math, sophistication scoring, and API integration smoke tests.

---

## Architecture decisions

| Decision | Rationale |
|----------|-----------|
| **Prisma ORM** for all CRUD | Type-safe schema; ACID transactions for submissions and analysis |
| **One `prisma.$queryRaw`** in cohort stats | PostgreSQL window functions (`PERCENT_RANK`, `STDDEV`) — see `src/engines/cohort/cohortAnalyzer.js` |
| **BullMQ + Redis** for email/analysis | API never blocks on SMTP; retries with exponential backoff |
| **Refresh token rotation** | JTI stored in Redis; old token revoked on each refresh |
| **Instructor course scoping** | Submissions, baselines, queue, and reports limited to owned courses |
| **Trajectory σ fallback = 8** | Used until enough cohort submissions exist for stable statistics |
| **Offset pagination (`page`/`limit`)** | Applied on list endpoints; documented in CHANGELOG if blueprint specified cursor-based |

Scoring details: [`SCORING_RUBRIC.md`](SCORING_RUBRIC.md)

---

## Defense checklist (quick)

- [ ] `docker compose up --build` — full stack healthy
- [ ] Register student → real verification email → login → student dashboard
- [ ] Admin creates instructor/proctor → role-specific dashboards work
- [ ] End-to-end: baseline → submit → analysis → queue → outcome email
- [ ] Swagger `/docs` lists all endpoints
- [ ] `npm test` green
- [ ] DeployRocks URL in `DEPLOYED_URL.txt`
- [ ] Postman collection ready (import from `openapi.yaml`)
