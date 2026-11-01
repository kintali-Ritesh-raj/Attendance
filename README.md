# SLG Housekeeping & Facility Services — Attendance & Payroll

A web app for tracking daily Present/Absent attendance of housekeeping staff and calculating monthly salary.

**Salary = (Days Present × Per-Day Salary) + Bonus − Advance − PF**

## Features

- **Daily Attendance** — mark each employee Present or Absent for a date (defaults to Present).
- **Monthly Grid** — every day shows P or A; click a day to switch. Future dates are not paid.
- **Salary & Payroll** — per-employee per-day rate, extra days, bonus, monthly advance and PF; printable salary slips.
- **Staff Directory** — add, edit and remove employees, and record advances.
- **CSV export** of attendance and salary sheets.

Data is saved in the browser's localStorage, so it stays on the device and browser where it was entered.

## Run locally

Requires Node.js 18 or newer.

```bash
npm install
npm run dev
```

Then open http://localhost:5173.

## Build

```bash
npm run build
```

The production files are written to `dist/`.

Built with React, TypeScript, Vite, Tailwind CSS and lucide-react.
