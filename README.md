# CCMS — Compliance Case Management System

[![Django](https://img.shields.io/badge/Django-6.x-092E20?logo=django)](https://www.djangoproject.com/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker)](https://docs.docker.com/compose/)

**CCMS** is the Office of the Public Service Commission (OPSC) **Compliance Case Management System** for Vanuatu. It manages statutory disciplinary and compliance workflows, case files, SLAs, documents, and audit trails. Approved compliance matters sync to **SCDMS** (Submission & Decision Portal) for Secretary and Commission deliberation.

| Document | Description |
|----------|-------------|
| This README | Setup, architecture, API reference |
| [`docs/CMS-SCDMS-operating-model.md`](docs/CMS-SCDMS-operating-model.md) | CMS ↔ SCDMS workflow, integration contract |

---

## Table of contents

- [Features](#features)
- [Architecture](#architecture)
- [Tech stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Quick start (Docker)](#quick-start-docker)
- [Configuration](#configuration)
- [Database & seed data](#database--seed-data)
- [Project structure](#project-structure)
- [API overview](#api-overview)
- [SCDMS integration](#scdms-integration)
- [Roles & permissions](#roles--permissions)
- [Case families & workflows](#case-families--workflows)
- [Local development (without Docker)](#local-development-without-docker)
- [Production notes](#production-notes)
- [License](#license)

---

## Features

### Case management

- Six **case families** with PSC-aligned statutory stage definitions and SLA tracking (working days vs calendar days).
- Auto-generated reference numbers (`CCMS-ED-2026-0001`, etc.).
- Case lifecycle: active → closed / reopened; stage completion and overdue detection.
- Decisions, litigation records, internal notes, and employee response capture.

### Compliance & SCDMS portal

- **COMP-\*** submission types (`COMP-SMDR`, `COMP-PAR`, `COMP-PSDB`, `COMP-14D`, `COMP-OMB`, `COMP-PSA`).
- Manager approval workflow for Senior / Principal initiators.
- **Auto-sync to SCDMS** on manager approve (push webhook) or **pull API** for SCDMS ingestion.
- Automatic CMS case closure when SCDMS reports submission fully complete.

### Platform

- JWT authentication with refresh rotation and token blacklist.
- Role-based UI and API permissions (15 demo roles in seed data).
- Immutable audit log, document uploads, in-app notifications.
- Admin: users, Django groups, workflow configuration UI.

---

## Architecture

```text
┌─────────────────────────────────────────────────────────────────────────┐
│  Browser  →  http://localhost:5173  (Vite + React 19)                   │
│                    │                                                     │
│                    ▼  /api/v1/*  (dev proxy → backend:8000)             │
├─────────────────────────────────────────────────────────────────────────┤
│  Django 6 + DRF  →  http://localhost:8001  (mapped from container :8000)│
│       │                                                                  │
│       ├── PostgreSQL 16  (:5433 on host)                                  │
│       ├── Media volume   (uploaded documents)                           │
│       └── SCDMS HTTP     (CDP_BASE_URL — push register / optional pull) │
└─────────────────────────────────────────────────────────────────────────┘
```

| Layer | Responsibility |
|-------|----------------|
| **Frontend** | SPA: cases, dashboard, documents, audit, admin, portal approval UI |
| **Backend** | REST API, workflow engine, JWT auth, SCDMS `portal_integration` |
| **PostgreSQL** | Cases, stages, users, audit, documents metadata |
| **SCDMS** | Submissions list, Secretary/Commission review, post-decision tasks |

**Design rule:** After a case is synced to SCDMS, Secretary and Commission work happens **only in SCDMS**. CMS retains the compliance case file until SCDMS signals completion.

---

## Tech stack

| Component | Technology |
|-----------|------------|
| API | Django 6, Django REST Framework 3.17+ |
| Auth | `djangorestframework-simplejwt` (8h access / 7d refresh) |
| Database | PostgreSQL 16, `psycopg` 3 |
| Frontend | React 19, TypeScript 5.7, Vite 6 |
| UI | Tailwind CSS 4, Radix UI, TanStack Router/Query/Table |
| State | Zustand (auth persistence) |
| HTTP | Axios |
| Containers | Docker Compose 3 services |

---

## Prerequisites

- **Docker** 24+ and **Docker Compose** v2, or
- **Python** 3.12+, **Node.js** 22+, **PostgreSQL** 16+ for local installs

---

## Quick start (Docker)

### 1. Clone and configure

```bash
git clone <your-repo-url> ccms
cd ccms
cp .env.example .env
# Edit .env — set POSTGRES_PASSWORD, DJANGO_SECRET_KEY, CDP_* if using SCDMS
```

### 2. Start services

```bash
docker compose up -d --build
```

| Service | URL | Notes |
|---------|-----|-------|
| Frontend | http://localhost:5173 | Vite dev server |
| API | http://localhost:8001/api/v1/ | Django (host port 8001) |
| PostgreSQL | `localhost:5433` | User/db from `.env` |

### 3. Seed demo data

```bash
docker compose exec backend python manage.py seed
```

Creates 15 users, 12 sample cases, stages, decisions, and audit entries. **Default password for all seeded users:** `Password123!`

### 4. Sign in

Open http://localhost:5173/login

| Username | Role | Typical use |
|----------|------|-------------|
| `admin` | Administrator | Full access |
| `m.compliance` | Compliance Manager | Approve portal / sync SCDMS |
| `s.compliance` | Compliance Senior | Create case → submit for approval |
| `superadmin` | Super Administrator | System admin |

Change passwords after first login in production.

### 5. Useful commands

```bash
# Logs
docker compose logs -f backend

# Django shell
docker compose exec backend python manage.py shell

# Run migrations manually
docker compose exec backend python manage.py migrate

# Rebuild after dependency changes
docker compose up -d --build backend
```

---

## Configuration

Environment variables are loaded from `.env` at the project root (`env_file` in Compose for the backend).

| Variable | Required | Description |
|----------|----------|-------------|
| `POSTGRES_DB` | Yes | Database name |
| `POSTGRES_USER` | Yes | Database user |
| `POSTGRES_PASSWORD` | Yes | Database password |
| `DB_HOST` | Yes | `db` in Docker; `localhost` for local Postgres |
| `DB_PORT` | No | Default `5432` |
| `DJANGO_SECRET_KEY` | Yes | Django secret; use a long random value in production |
| `DJANGO_DEBUG` | No | `True` in development |
| `DJANGO_ALLOWED_HOSTS` | No | Comma-separated hosts |
| `DJANGO_SETTINGS_MODULE` | Yes | `config.settings.development` for dev |
| `CDP_BASE_URL` | For SCDMS | SCDMS base URL (e.g. `http://scdms:8080`) |
| `CDP_CALLBACK_SECRET` | For SCDMS | Shared secret with SCDMS (`CMS_CALLBACK_SECRET`) |

**Frontend (Docker Compose):**

| Variable | Value | Purpose |
|----------|-------|---------|
| `VITE_API_URL` | `/api/v1` | Relative API base (browser → Vite proxy) |
| `VITE_PROXY_TARGET` | `http://backend:8000` | Vite proxy target inside Compose network |

For **local** `npm run dev` on the host, the Vite proxy defaults to `http://localhost:8001` (mapped API port).

---

## Database & seed data

On container start, `entrypoint.sh` runs:

1. `makemigrations` (accounts, cases, documents, audit, notifications)
2. `migrate`
3. `collectstatic`
4. `runserver 0.0.0.0:8000`

**Seed command** (idempotent for users/cases — run on empty DB):

```bash
python manage.py seed
```

**Create a superuser** (alternative to seed):

```bash
docker compose exec backend python manage.py createsuperuser
```

**Reset admin password:**

```bash
docker compose exec -T backend python manage.py shell -c "
from django.contrib.auth import get_user_model
u = get_user_model().objects.get(username='admin')
u.set_password('YourNewPassword')
u.save()
"
```

---

## Project structure

```text
ccms/
├── backend/
│   ├── apps/
│   │   ├── accounts/      # Custom User model, roles, JWT /users/me/
│   │   ├── cases/         # Cases, stages, workflow, SCDMS integration
│   │   ├── documents/     # File uploads
│   │   ├── audit/         # Immutable audit log
│   │   └── notifications/
│   ├── config/
│   │   ├── settings/      # base.py, development.py
│   │   └── urls.py
│   ├── entrypoint.sh
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── api/           # Axios client + ccms.ts endpoints
│   │   ├── features/      # Pages (cases, auth, admin, …)
│   │   ├── components/
│   │   ├── hooks/         # usePermissions
│   │   └── lib/permissions.ts
│   ├── Dockerfile
│   └── vite.config.ts
├── docs/
│   └── CMS-SCDMS-operating-model.md
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## API overview

Base URL: `/api/v1/`  
Authentication: `Authorization: Bearer <access_token>` unless noted.

### Authentication

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/token/` | Public | Obtain access + refresh (`username`, `password`) |
| POST | `/auth/token/refresh/` | Public | Refresh access token |
| POST | `/auth/token/logout/` | Bearer | Blacklist refresh token (`refresh`) |

### Users

| Method | Path | Description |
|--------|------|-------------|
| GET/PATCH | `/users/me/` | Current user profile + permission keys |
| CRUD | `/users/` | User management (admin roles) |
| POST | `/users/{id}/activate/` | Activate user |
| POST | `/users/{id}/deactivate/` | Deactivate user |
| POST | `/users/{id}/reset_password/` | Admin password reset |

### Cases

| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/cases/` | List / create cases |
| GET/PATCH | `/cases/{id}/` | Detail / update metadata |
| POST | `/cases/{id}/close/` | Close case (CMS manual) |
| POST | `/cases/{id}/reopen/` | Reopen closed case |
| GET/PATCH | `/cases/{id}/stages/{stage_id}/` | Update stage status |
| GET/POST | `/cases/{id}/decisions/` | List / add decisions |
| GET/POST | `/cases/{id}/notes/` | Internal notes |
| POST | `/cases/{id}/submit-for-approval/` | Senior/Principal → pending manager |
| POST | `/cases/{id}/approve/` | Manager approve + **auto SCDMS sync** |
| POST | `/cases/{id}/reject/` | Manager reject (`notes` required) |
| POST | `/cases/{id}/register-with-portal/` | Retry SCDMS push sync |
| POST | `/cases/{id}/signoff/` | Pre-SCDMS CMS decision only (blocked if linked) |
| GET | `/cases/{id}/workflow_summary/` | SLA summary for case family |

### SCDMS integration (service-to-service)

Requires header `X-CDP-Callback-Key` or `X-SCDMS-API-Key` = `CDP_CALLBACK_SECRET`.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/cases/scdms-queue/?pending_only=true` | Approved cases awaiting SCDMS |
| GET | `/cases/{id}/scdms-export/` | Full export payload |
| POST | `/cases/{id}/scdms-ack/` | SCDMS confirms ingestion |
| POST | `/cases/{id}/close-from-cdp/` | SCDMS closes CMS case when complete |

### Other resources

| Resource | Path |
|----------|------|
| Dashboard stats | `GET /dashboard/` |
| Documents | `/documents/` |
| Audit log | `/audit/` |
| Notifications | `/notifications/`, `GET /notifications/unread_count/` |
| Groups | `/groups/` |

**Filtering (cases):** `status`, `case_family`, `portal_approval_status`, `is_senior_executive`, search on `reference_number`, `subject_name`, `subject_ministry`.

**Pagination:** Page size 20 (DRF default).

---

## SCDMS integration

Full workflow: [`docs/CMS-SCDMS-operating-model.md`](docs/CMS-SCDMS-operating-model.md).

### Flow (summary)

```text
CMS: create case (COMP-*)
  → [Senior/Principal] submit for approval
  → [Manager] approve  ──►  auto POST cms-register (or SCDMS pull from scdms-queue)
SCDMS: Submissions → Secretary → Commission → implementation
  ──►  POST close-from-cdp when complete
CMS: case closed
```

### Push (CMS → SCDMS)

On **approve** or **create** (manager-initiated), when `CDP_BASE_URL` and `CDP_CALLBACK_SECRET` are set:

```http
POST {CDP_BASE_URL}/api/webhooks/cms-register/
X-CMS-Callback-Key: {CDP_CALLBACK_SECRET}
Content-Type: application/json

{
  "cms_case_id": "12",
  "cms_case_reference": "CCMS-SP-2026-0001",
  "form_type_code": "COMP-SMDR",
  "title": "...",
  "case_family": "serious_misconduct_employee",
  ...
}
```

Response should include `cdp_submission_id` (and optionally `cdp_callback_url`). CMS sets `portal_approval_status` → `sent_to_portal`.

Approve response includes `portal_sync`:

```json
{
  "portal_sync": {
    "status": "synced",
    "cdp_submission_id": "PSC-2026-00042"
  }
}
```

Statuses: `synced` | `failed` | `skipped` | `already_synced`.

### Pull (SCDMS → CMS)

```bash
curl -H "X-SCDMS-API-Key: $CDP_CALLBACK_SECRET" \
  "http://localhost:8001/api/v1/cases/scdms-queue/?pending_only=true"
```

After creating the submission in SCDMS:

```bash
curl -X POST -H "X-SCDMS-API-Key: $SECRET" -H "Content-Type: application/json" \
  -d '{"cdp_submission_id":"PSC-2026-00042"}' \
  "http://localhost:8001/api/v1/cases/12/scdms-ack/"
```

### Close (SCDMS → CMS)

```bash
curl -X POST -H "X-CDP-Callback-Key: $SECRET" \
  "http://localhost:8001/api/v1/cases/12/close-from-cdp/"
```

---

## Roles & permissions

Custom `accounts.User.role` drives both API access and frontend `usePermissions()`.

| Role | Portal approve | Create compliance cases | Notes |
|------|----------------|-------------------------|-------|
| `superadmin` / `admin` | Yes | Yes | System administration |
| `compliance_manager` | Yes | Yes | Pre-approved on create; triggers SCDMS sync |
| `compliance_senior` | No | Yes | Must submit for manager approval |
| `compliance_principal` | No | Yes | COMP-PSA allowed; manager approval |
| `compliance_unit` | No | Yes | Legacy; treated as senior/principal for approval |
| `secretary_opsc` | No | Yes | Broad case access |
| `commission_member` | No | Limited | Read/decide oriented |
| `employee_subject` | No | No | Subject / response workflows |

Permission keys are defined in:

- Backend: `backend/apps/accounts/role_permissions.py`
- Frontend: `frontend/src/lib/permissions.ts`

---

## Case families & workflows

Defined in `backend/apps/cases/workflow.py` and applied on case creation.

| Code | Family |
|------|--------|
| `employee_disciplinary` | Employee Internal Disciplinary |
| `serious_misconduct_employee` | Serious Misconduct — Employee |
| `temporary_suspension` | Temporary Suspension |
| `grievance` | Grievance Process |
| `senior_serious_misconduct` | Senior Executive — Serious Misconduct |
| `senior_poor_performance` | Senior Executive — Poor Performance |

Each family has ordered stages with `sla_days`, working-day vs calendar-day rules, `statutory_ref`, and `responsible_role`. Due dates are computed from the case registration date.

---

## Local development (without Docker)

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Postgres running locally; .env with DB_HOST=localhost, DB_PORT=5432
export DJANGO_SETTINGS_MODULE=config.settings.development
python manage.py migrate
python manage.py seed
python manage.py runserver 0.0.0.0:8000
```

### Frontend

```bash
cd frontend
npm install
# API via Vite proxy to http://localhost:8000 (or 8001 if using Docker API only)
npm run dev
```

Open http://localhost:5173.

### Production build (frontend)

```bash
cd frontend
npm run build
npm run preview
```

Serve `frontend/dist` behind nginx or similar; set `VITE_API_URL` to your public API base at build time.

---

## Production notes

- Set `DJANGO_DEBUG=False` and use `config.settings` production module (create as needed).
- Run Django with **Gunicorn** (included in `requirements.txt`), not `runserver`.
- Use strong `DJANGO_SECRET_KEY` and `CDP_CALLBACK_SECRET`; never commit `.env`.
- Configure HTTPS, CORS `CORS_ALLOWED_ORIGINS`, and restricted `ALLOWED_HOSTS`.
- Disable or protect `python manage.py seed` in production.
- Back up PostgreSQL and the `media_files` Docker volume.
- Ensure SCDMS and CMS clocks are synchronized (timezone: `Pacific/Efate`).

---

## Troubleshooting

| Symptom | Check |
|---------|--------|
| Backend restart loop | `docker compose logs backend` — missing Python deps, migration errors |
| `ModuleNotFoundError: requests` | Rebuild backend image after `requirements.txt` changes |
| Login 401 | Use **username** not email; run `seed` or reset password |
| `Invalid username or password` with running API | Wrong password; see seed defaults |
| SCDMS sync `skipped` | Set `CDP_BASE_URL` and `CDP_CALLBACK_SECRET` in `.env`, restart backend |
| Frontend cannot reach API | Confirm proxy: Docker uses `/api/v1` + `VITE_PROXY_TARGET`; host dev uses port 8001 |
| CORS errors | Add frontend origin to `development.py` `CORS_ALLOWED_ORIGINS` |

---

## License

Proprietary — Office of the Public Service Commission, Vanuatu.  
Unauthorized copying or distribution outside OPSC / authorised contractors is prohibited unless otherwise agreed in writing.

---

## Contributing

1. Branch from `main`.
2. Follow existing patterns (DRF viewsets, React feature folders, role permissions in both tiers).
3. Update [`docs/CMS-SCDMS-operating-model.md`](docs/CMS-SCDMS-operating-model.md) when changing integration contracts.
4. Run `npm run build` and backend migrations before opening a PR.

For integration changes affecting SCDMS, coordinate with the SCDMS team on shared secrets and webhook paths.
