# 🏠 RentManager Pro — Modern Rental Property Management

A modern, full-stack rental management web application built with **React (Vite + Tailwind CSS)** and a **Java 21 / Spring Boot 3 REST API**.

This project upgrades the original PHP system with a modern component-driven UI, real-time live billing calculations, carry-forward tracking, printable/downloadable PDF rent receipts, and seamless zero-setup H2 database support with optional MySQL compatibility.

---

## 🚀 Quick Start in VS Code (हिंदी / English)

### 1. Open in VS Code
Open this unzipped folder in VS Code:
```bash
code .
```

### 2. Method A: Double-Click Startup (Windows)
- Simply double-click **`run-all.bat`** in the project root!
- It will automatically launch both the Java Spring Boot Backend and the React Frontend in separate windows.
- Open your browser at: **`http://localhost:5173`**

### 3. Method B: Run via VS Code Terminal

#### Step 1: Start Backend (Java Spring Boot)
Open a terminal in VS Code:
```powershell
cd backend
.\mvnw.cmd spring-boot:run
```
> The backend runs on `http://localhost:8080`.
> H2 In-Memory Database starts automatically with pre-loaded demo data!
> Web DB Console: `http://localhost:8080/h2-console` (JDBC URL: `jdbc:h2:mem:rental_db`, User: `sa`, Password: *leave blank*)

#### Step 2: Start Frontend (React + Vite)
Open a **new** terminal in VS Code:
```powershell
cd frontend
npm install   # (already pre-installed or run if needed)
npm run dev
```
> Open `http://localhost:5173` in your browser!

---

## ✨ Features & Concept

| Module | Modern Features |
|--------|-----------------|
| 📊 **Dashboard** | Real-time KPI counters (Buildings, Occupancy %, Active Tenants, Revenue vs Billed), Payment Status breakdown (Cleared, Due, Advance), Pending Dues collection list, and Recent Activity feed. |
| 🏢 **Buildings** | Property management with room count badges, location details, quick add modal, and safe deletion checks. |
| 🚪 **Rooms** | Filter by building & occupancy (Vacant / Occupied), pricing display (Rent & Electricity rate per unit), assigned tenant details, and inline pricing editor. |
| 👥 **Tenants** | Resident directory with avatars, contact information, joined dates, room allocation (shows only vacant rooms), and room transfer/reassignment. |
| 💳 **Payments & Billing** | Interactive billing calculator: auto-fetches previous meter readings & carry-forward dues/advances, live balance calculation, and **printable / downloadable PDF rent receipts**! |

### 🧮 Payment Calculation Logic
- **Units Used** = $\text{Current Meter} - \text{Previous Meter}$
- **Electricity Bill** = $\text{Units Used} \times \text{Rate per Unit}$
- **Total Due** = $\text{Monthly Rent} + \text{Electricity Bill} + \text{Carry Forward}$
- **Balance** = $\text{Paid Amount} - \text{Total Due}$
  - $\text{Balance} < 0 \implies$ 🔴 **Due** (carried forward to next month)
  - $\text{Balance} > 0 \implies$ 🔵 **Advance** (deducted from next month)
  - $\text{Balance} = 0 \implies$ 🟢 **Clear**

---

## 🗄️ Database Options

### 1. Default: Embedded H2 Database (Zero Setup)
No database installation or password required! Runs instantly in memory with pre-seeded demo properties, rooms, tenants, and bills.

### 2. Optional: MySQL Database
If you prefer running with MySQL:
1. Open `backend/src/main/resources/application-mysql.properties` and verify your MySQL `username` and `password` (default `root`/`root`).
2. Run backend with the MySQL profile:
```powershell
cd backend
.\mvnw.cmd spring-boot:run -Dspring-boot.run.profiles=mysql
```

---

## 📡 REST API Endpoints

- `GET /api/dashboard` — Summary KPI stats, recent transactions, pending dues.
- `GET /api/buildings` — List all buildings with room count.
- `POST /api/buildings` — Create building (`{name, address}`).
- `DELETE /api/buildings/{id}` — Delete building.
- `GET /api/rooms` — List rooms (supports `?building_id=X`).
- `POST /api/rooms` — Create room.
- `PUT /api/rooms/{id}` — Update room pricing.
- `DELETE /api/rooms/{id}` — Delete room (protected if tenant is assigned).
- `GET /api/tenants` — List tenants with assigned room details.
- `POST /api/tenants` — Register tenant and allocate room.
- `PUT /api/tenants/{id}` — Update tenant and re-allocate room.
- `DELETE /api/tenants/{id}` — Remove tenant (frees up room to vacant).
- `GET /api/payments` — List payments (supports `?tenant_id=X&month=YYYY-MM`).
- `GET /api/payments/helper-info` — Fetch previous meter reading & carry-forward.
- `POST /api/payments` — Record payment transaction.
- `DELETE /api/payments/{id}` — Delete payment record.
