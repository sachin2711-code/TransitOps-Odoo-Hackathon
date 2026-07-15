# TransitOps — Smart Transport Operations Platform

A full-stack fleet operations platform: vehicle registry, driver management,
trip dispatch, maintenance workflow, fuel & expense tracking, and analytics —
built to the TransitOps hackathon spec.

- **Backend:** Node.js + Express + Mongoose (MongoDB / MongoDB Memory Server), JWT authentication
- **Frontend:** React + Vite + TailwindCSS
- **Roles:** Fleet Manager, Dispatcher (Driver), Safety Officer, Financial Analyst

---

## 1. Setup & Run

### Backend (Server)

1. Navigate to the server folder:
   ```bash
   cd server
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables (create a `.env` file):
   ```bash
   cp .env.example .env
   ```

4. Start the backend server:
   ```bash
   npm run dev
   ```
   The backend starts at **http://localhost:5000**.

> [!NOTE]
> If no `MONGODB_URI` is specified in your `.env` file, the server will automatically spin up an **in-memory MongoDB database** (`mongodb-memory-server`) and seed the demo data. This enables you to run the project immediately without setting up a local database.

### Frontend

1. Navigate to the frontend folder:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   The frontend starts at **http://localhost:3000**.

4. Open your browser and navigate to **http://localhost:3000**.

---

## 2. Seed Demo Data

The database seeds automatically upon startup if it is empty.

Demo accounts (password for all: `password123`):

| Role | Email | Backend Role Name |
|---|---|---|
| **Fleet Manager** | `fleet.manager@transitops.demo` | `fleet_manager` |
| **Dispatcher (Driver)** | `driver@transitops.demo` | `dispatcher` |
| **Safety Officer** | `safety.officer@transitops.demo` | `safety_officer` |
| **Financial Analyst** | `finance@transitops.demo` | `financial_analyst` |

You can also register brand-new accounts from the app's "Create Account" tab.

---

## What's implemented

**Auth & RBAC**
- Email/password login and self-service registration, JWT-based sessions
- Role-gated write actions (e.g. only Fleet Managers register vehicles; only Fleet Managers/Dispatchers can dispatch trips)

**Dashboard**
- KPIs: Active Vehicles, Available Vehicles, Vehicles in Maintenance, Active Trips, Pending Trips, Drivers On Duty, Fleet Utilization %
- Filters by vehicle type, status, and region

**Vehicle Registry** — CRUD, unique registration number enforced

**Driver Management** — CRUD, license expiry tracking, safety score

**Trip Management & Dispatch**
- Draft → Dispatched → Completed → Cancelled lifecycle
- Cargo weight validated against vehicle max load capacity
- Expired-license or Suspended drivers cannot be dispatched
- A vehicle/driver already On Trip cannot be double-booked
- Dispatch/complete/cancel automatically flips vehicle & driver status, exactly as specified in the business rules

**Maintenance**
- Creating an active maintenance record automatically sets the vehicle to **In Shop**, removing it from the trip dispatch pool
- Closing a record restores the vehicle to Available (or Retired, if chosen)

**Fuel & Expense Management**
- Manual fuel/expense logging, plus automatic fuel-log creation when a trip is completed
- Per-vehicle operational cost = Fuel + Maintenance + Expenses

**Reports & Analytics**
- Per-vehicle Fuel Efficiency (km/L), Fleet Utilization, Operational Cost, and ROI = (Revenue − (Maintenance + Fuel)) / Acquisition Cost
- CSV export

---

## Project structure

```
transitops/
├── server/
│   ├── src/
│   │   ├── index.js          # Express app entry point
│   │   ├── db.js             # MongoDB connection and auto-seeding
│   │   ├── models/           # Mongoose models (User, Vehicle, Driver, Trip, etc.)
│   │   ├── routes/           # Express routers for auth, vehicles, drivers, trips, etc.
│   │   ├── middleware/       # JWT Authentication & RBAC middleware
│   │   └── utils/            # Helper utils (password hashing, etc.)
│   ├── .env.example          # Template for environment variables
│   ├── package.json          # Node dependencies & npm scripts
│   └── check_login.py        # Python login verification helper script
└── frontend/
    ├── src/
    │   ├── App.jsx           # Main React component & dashboard UI
    │   ├── main.jsx          # React entry point
    │   └── index.css         # Tailwind & custom CSS imports
    ├── index.html            # Main HTML document
    ├── vite.config.js        # Vite configuration (runs on port 3000, proxies to backend)
    ├── tailwind.config.js    # Tailwind configuration
    └── package.json          # Frontend dependencies & npm scripts
```

## Notes :

- The database is MongoDB. If no external URI is provided, it runs as an in-memory database instance automatically, losing its state when the server stops.
- CSV export covers "Mandatory"; PDF export was left out per the spec (marked optional).

