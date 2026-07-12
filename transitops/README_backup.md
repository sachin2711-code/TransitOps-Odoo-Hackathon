# TransitOps — Smart Transport Operations Platform

A full-stack fleet operations platform: vehicle registry, driver management,
trip dispatch, maintenance workflow, fuel & expense tracking, and analytics —
built to the TransitOps hackathon spec.

- **Backend:** FastAPI + SQLAlchemy + SQLite, JWT auth with Role-Based Access Control
- **Frontend:** Vanilla HTML/CSS/JS single-page app (no build step), served by the same backend
- **Roles:** Fleet Manager, Driver, Safety Officer, Financial Analyst

---

## 1. Setup

Requires **Python 3.10+**.

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

## 2. Seed demo data (recommended)

Creates one demo user per role plus a few sample vehicles and drivers.

```bash
python seed.py
```

Demo accounts (password for all: `password123`):

| Role                | Email                              |
|---------------------|-------------------------------------|
| Fleet Manager        | fleet.manager@transitops.demo      |
| Driver                | driver@transitops.demo             |
| Safety Officer        | safety.officer@transitops.demo     |
| Financial Analyst     | finance@transitops.demo            |

You can also register brand-new accounts from the app's "Create Account" tab.

## 3. Run

```bash
uvicorn app.main:app --reload --port 8000
```

Open **http://localhost:8000** — the backend serves the frontend directly, so
there's nothing else to start. The interactive API docs are at
**http://localhost:8000/docs**.

---

## What's implemented

**Auth & RBAC**
- Email/password login and self-service registration, JWT-based sessions
- Optional role selector on login (validated against the account's actual role)
- "Remember me" (7-day persistent session) vs. default 8-hour session
- Account lockout after 5 failed login attempts (15-minute cooldown)
- Forgot-password flow (hackathon scope: generic confirmation message, no real email delivery)
- Role-gated write actions (e.g. only Fleet Managers register vehicles; only
  Fleet Managers/Drivers can dispatch trips)

**Dashboard**
- KPIs: Active Vehicles, Available Vehicles, Vehicles in Maintenance, Active
  Trips, Pending Trips, Drivers On Duty, Fleet Utilization %
- Filters by vehicle type, status, and region

**Vehicle Registry** — CRUD, unique registration number enforced

**Driver Management** — CRUD, license expiry tracking, safety score, per-driver
trip completion % (completed vs. total assigned trips), quick status-toggle
buttons (Available / On Trip / Off Duty / Suspended) alongside full edit

**Trip Management & Dispatch**
- Live Board layout: inline "Create Trip" form + lifecycle stepper on the left,
  a live board of all trips (with status, route, vehicle/driver, and actions) on the right
- Draft → Dispatched → Completed → Cancelled lifecycle
- Cargo weight validated against vehicle max load capacity, with an inline
  capacity-exceeded warning that blocks trip creation before it hits the API
- Expired-license or Suspended drivers cannot be dispatched
- A vehicle/driver already On Trip cannot be double-booked
- Dispatch/complete/cancel automatically flips vehicle & driver status,
  exactly as specified in the business rules

**Maintenance**
- Status-transition reference panel (Available ⇄ In Shop ⇄ Retired) at the top of the page
- Creating an active maintenance record automatically sets the vehicle to
  **In Shop**, removing it from the trip dispatch pool
- Closing a record restores the vehicle to Available (or Retired, if chosen)

**Fuel & Expense Management**
- Manual fuel/expense logging, plus automatic fuel-log creation when a trip
  is completed
- Per-vehicle operational cost = Fuel + Maintenance + Expenses

**Reports & Analytics**
- Per-vehicle Fuel Efficiency (km/L), Fleet Utilization, Operational Cost,
  and ROI = (Revenue − (Maintenance + Fuel)) / Acquisition Cost
- CSV export

---

## Project structure

```
transitops/
├── backend/
│   ├── app/
│   │   ├── main.py            # FastAPI app, mounts frontend as static files
│   │   ├── database.py        # SQLAlchemy engine/session (SQLite)
│   │   ├── models.py          # ORM models (Users, Vehicles, Drivers, Trips, ...)
│   │   ├── schemas.py         # Pydantic request/response schemas
│   │   ├── auth.py            # JWT + password hashing + RBAC dependency
│   │   └── routers/           # auth, vehicles, drivers, trips, maintenance,
│   │                          # fuel-logs, expenses, dashboard/reports
│   ├── seed.py                 # Demo users + sample fleet data
│   └── requirements.txt
└── frontend/
    ├── index.html
    ├── css/style.css
    └── js/
        ├── api.js               # fetch wrapper + typed API client
        └── app.js                # views, forms, modals, state
```

## Notes

- The database is a single SQLite file (`backend/transitops.db`), created
  automatically on first run — delete it any time to reset all data.
- The JWT signing secret in `app/auth.py` is a placeholder; change it before
  any real deployment.
- CSV export covers "Mandatory"; PDF export was left out per the spec
  (marked optional).
