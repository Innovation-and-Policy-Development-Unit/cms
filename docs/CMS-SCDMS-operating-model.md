# CMS ↔ SCDMS operating model

**Source:** Compliance workflow email (Compliance Manager & POs), following discussions on how the **Case Management System (CMS)** and **Submission and Decision Portal (SCDMS)** work together.

**Terminology in this repo:** The backend uses `CDP` / `CDP_BASE_URL` env names for the Commission Decision Portal integration; operationally this is **SCDMS**.

---

## Recommended workflow (authoritative)

| Step | Who | Where | What happens |
|------|-----|-------|----------------|
| 1 | Compliance **Senior**, **Principal**, or **Manager** | **CMS** | Create and maintain the compliance matter (case): **COMP-\*** form type, documents, statutory workflow, SLAs |
| 2 | Compliance **Manager** (when required) | **CMS** | Approves the submission; the **approved case is synced to SCDMS** (approval required when created by Senior or Principal) |
| 3 | System (automated) | **SCDMS** | Matter appears on **Submissions** list (OPSC internal) and goes **directly to Secretary review** |
| 4 | Secretary & Commission | **SCDMS** | Review, agenda, deliberation, and decisions |
| 5 | Secretariat (after decision) | **SCDMS** | Implementation of Minutes / Decision tasks **stay in SCDMS** — **not** moved back to CMS |
| 6 | System (automated) | **CMS** | **Close** the CMS case when the linked SCDMS submission is fully complete (e.g. closed / implemented). Post-decision tasks remain in SCDMS until then |

### Principles

- **Compliance staff:** create case in CMS → (if Senior/Principal) Manager approves in CMS → on approval, sync to SCDMS → Submissions list → Secretary review → Secretary & Commission work **only in SCDMS** → after decision, Minutes/Decision implementation **only in SCDMS** → when SCDMS matter is fully complete, **CMS case closes automatically** (tasks were never moved back to CMS).
- **After step 3:** use **SCDMS** to track stage, decision, and post-decision tasks; use **CMS** for the case file until step 6 closes it.
- **CMS closure follows SCDMS completion**, not the other way around.

### Programme note (from email)

- Manual compliance submission in SCDMS will be removed once API read from CMS is stable.
- SCDMS is being developed to **read submissions from CMS via API** after Manager approval; they sync into Submissions for Secretary review.
- Full compliance integration concludes when CMS development is complete.
- Stakeholders should raise concerns on **approval rules**, **SLAs**, or **closure timing** before the manual SCDMS process is retired.

---

## COMP-* form types (CMS)

Aligned with SCDMS `compliance_forms.py` (see `backend/apps/cases/compliance.py`):

| Code | Notes |
|------|--------|
| COMP-SMDR | |
| COMP-PAR | |
| COMP-PSDB | |
| COMP-14D | |
| COMP-OMB | |
| COMP-PSA | Proposed Amendment to PSA — **Principal or Manager only** |

---

## Approval rules (CMS)

| Creator role | Manager approval before SCDMS sync? |
|--------------|-------------------------------------|
| Compliance **Senior** | **Yes** — submit for approval → Manager approves |
| Compliance **Principal** | **Yes** |
| Compliance **Manager** | **No** — case is **pre-approved** for portal registration (`approved` status on create) |
| Compliance Unit (legacy) | Treated like Senior/Principal for approval |

---

## How this maps to the current CMS codebase

### Implemented (aligned)

| Operating step | CMS implementation |
|----------------|-------------------|
| 1 — Case in CMS | Cases, statutory stages/SLAs, documents, COMP-* on case (`portal_form_type_code`) |
| 2 — Manager approval | `POST …/submit-for-approval/`, `…/approve/`, `…/reject/`; rules in `apps/cases/compliance.py` |
| 2→3 — Sync to SCDMS | `POST …/register-with-portal/` → `CDP_BASE_URL/api/webhooks/cms-register/` with `X-CMS-Callback-Key` |
| 6 — Close when SCDMS complete | `POST …/close-from-cdp/` (SCDMS callback, `X-CDP-Callback-Key` / `CDP_CALLBACK_SECRET`) |

**Key files**

- `backend/apps/cases/compliance.py` — roles, COMP-* types, approval status rules
- `backend/apps/cases/views.py` — portal approval + registration + `close_from_cdp`
- `backend/apps/cases/models.py` — `portal_*`, `cdp_submission_id`, `cdp_callback_url`
- `frontend/src/features/cases/CaseDetailPage.tsx` — portal approval UI

**Env (integration)**

- `CDP_BASE_URL` — SCDMS base URL (e.g. `http://localhost:8080`)
- `CDP_CALLBACK_SECRET` — shared secret; must match SCDMS `CMS_CALLBACK_SECRET` / CMS `X-CMS-Callback-Key` on register; SCDMS uses `X-CDP-Callback-Key` on CMS `close-from-cdp`

### Gaps / follow-up (per email + code review)

| Item | Status |
|------|--------|
| **Auto-sync on Manager approve** | Email: sync on approval. CMS today: Manager **approve** then separate **Register with portal** action. Consider auto-calling register webhook on `approve` when `CDP_*` is configured. |
| **SCDMS API pull from CMS** | In development on SCDMS side; CMS exposes register webhook + case metadata. |
| **Post-decision work only in SCDMS** | Policy: do not replicate Minutes/Decision implementation tasks in CMS workflows. |
| **`signoff` → CDP callback** | `POST …/signoff/` can notify CDP to move submission — may overlap old flow; Secretary/Commission path should be **SCDMS-only** after step 3. Review before production. |
| **Remove manual SCDMS compliance submission** | Blocked until API sync + closure callback are production-ready. |

---

## API contract summary (for SCDMS developers)

### CMS → SCDMS (register after approval)

- **POST** `{CDP_BASE_URL}/api/webhooks/cms-register/`
- **Header:** `X-CMS-Callback-Key: {CDP_CALLBACK_SECRET}`
- **Body (JSON):** `cms_case_id`, `cms_case_reference`, `title`, `case_family`, `form_type_code`, `subject_ministry`, `notes`, `registered_by`
- **Response:** `cdp_submission_id`, `cdp_callback_url`, …

### SCDMS → CMS (close when fully complete)

- **POST** `{CMS}/api/v1/cases/{id}/close-from-cdp/`
- **Header:** `X-CDP-Callback-Key: {CDP_CALLBACK_SECRET}`
- **Body (optional):** `cdp_submission_id`
- Closes CMS case; idempotent if already closed.

---

## What CMS must **not** do (per operating model)

- Do **not** expect Secretary/Commission deliberation or post-decision implementation tasks in CMS after sync.
- Do **not** close CMS cases before the linked SCDMS submission is fully complete.
- Do **not** treat CMS as the system of record for Submissions-list / Secretary review stages after step 3.
