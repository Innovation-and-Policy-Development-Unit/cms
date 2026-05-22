# CMS ↔ SCDMS operating model

**Source:** Compliance workflow email (Compliance Manager & POs).

**Terminology:** Env vars use `CDP_*` names; operationally this is **SCDMS**.

---

## Recommended workflow

| Step | Who | Where | What happens |
|------|-----|-------|----------------|
| 1 | Compliance **Senior**, **Principal**, or **Manager** | **CMS** | Create and maintain the compliance matter (case): **COMP-\*** form type, documents, statutory workflow, SLAs |
| 2 | Compliance **Manager** (when required) | **CMS** | Approves the submission; the **approved case is synced to SCDMS** |
| 3 | System (automated) | **SCDMS** | Matter on **Submissions** list → Secretary review |
| 4 | Secretary & Commission | **SCDMS** | Review, agenda, deliberation, decisions |
| 5 | Secretariat (after decision) | **SCDMS** | Minutes / Decision implementation **only in SCDMS** |
| 6 | System (automated) | **CMS** | **Close** CMS case when linked SCDMS submission is fully complete |

**Principles:** CMS closure follows SCDMS completion. After step 3, SCDMS owns stage/decision/post-decision work; CMS holds the case file until step 6.

---

## Approval rules

| Creator role | Manager approval? | SCDMS sync trigger |
|--------------|-------------------|-------------------|
| Senior / Principal | Yes | On Manager **approve** (auto push or SCDMS pull) |
| Manager | No (pre-approved on create) | On **create** if `CDP_*` configured, else pull/retry |
| Compliance Unit (legacy) | Yes (as Senior/Principal) | Same as Senior/Principal |

---

## CMS implementation

### Sync on approve (push)

When a Manager calls `POST /api/v1/cases/{id}/approve/`, CMS:

1. Sets `portal_approval_status` → `approved`
2. Calls `sync_case_to_scdms()` → `POST {CDP_BASE_URL}/api/webhooks/cms-register/` when `CDP_BASE_URL` and `CDP_CALLBACK_SECRET` are set
3. Returns `portal_sync` on the case response: `synced` | `failed` | `skipped`

Manager-created cases (`approved` at create) auto-sync in `perform_create` when configured.

**Manual retry:** `POST /api/v1/cases/{id}/register-with-portal/` if push failed or env was missing.

### SCDMS API pull

Auth header (either): `X-CDP-Callback-Key` or `X-SCDMS-API-Key` = `CDP_CALLBACK_SECRET`.

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/v1/cases/scdms-queue/?pending_only=true` | List approved, active cases not yet in SCDMS (`cdp_submission_id` empty) |
| GET | `/api/v1/cases/{id}/scdms-export/` | Full export payload for one case |
| POST | `/api/v1/cases/{id}/scdms-ack/` | SCDMS confirms local submission created |

**Ack body:** `{ "cdp_submission_id": "PSC-…", "cdp_callback_url": "…", "cdp_submission_ref": "…" }`  
Sets `portal_approval_status` → `sent_to_portal`, stores IDs.

Pull and push can coexist: SCDMS may pull when push is unavailable.

### CMS → SCDMS push payload

`POST {CDP_BASE_URL}/api/webhooks/cms-register/`  
Header: `X-CMS-Callback-Key: {CDP_CALLBACK_SECRET}`

Fields include: `cms_case_id`, `cms_case_reference`, `title`, `case_family`, `form_type_code`, `subject_name`, `subject_ministry`, `notes`, `registered_by`, `portal_approved_at`, …

### SCDMS → CMS close (step 6)

`POST /api/v1/cases/{id}/close-from-cdp/`  
Header: `X-CDP-Callback-Key: {CDP_CALLBACK_SECRET}`  
Body (optional): `cdp_submission_id`

### Sign-off (`POST …/signoff/`) — legacy

- **CMS-only** compliance decisions **before** SCDMS link.
- **Blocked** when `cdp_submission_id` is set or `portal_approval_status` is `sent_to_portal`.
- **No longer** calls SCDMS to move submissions to Secretary review (that happens at sync / in SCDMS).

---

## Key files

- `backend/apps/cases/portal_integration.py` — sync, export, shared secret
- `backend/apps/cases/scdms_serializers.py` — pull queue serializer
- `backend/apps/cases/views.py` — approve, register, scdms-queue/export/ack, signoff guard
- `backend/apps/cases/compliance.py` — roles, COMP-* types
- `frontend/src/features/cases/CaseDetailPage.tsx` — approve + retry sync UI

---

## Environment

```env
CDP_BASE_URL=http://scdms-host:8080
CDP_CALLBACK_SECRET=<shared-secret>
```

Must match SCDMS `CMS_CALLBACK_SECRET` for register/ack/pull; SCDMS uses the same secret on `close-from-cdp`.

---

## What CMS must not do

- Secretary/Commission deliberation or post-decision tasks in CMS after SCDMS sync
- Close CMS before SCDMS submission is fully complete
- Use sign-off to advance SCDMS workflow after step 3
