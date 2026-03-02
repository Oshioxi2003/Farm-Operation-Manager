# SmartFarm - He thong quan ly nong nghiep

## Overview
Agricultural operations management system with two roles: Manager and Farmer. Built with React + Express + PostgreSQL.

## Architecture
- **Frontend**: React + TypeScript + Tailwind CSS + Shadcn UI + Recharts
- **Backend**: Express.js + Drizzle ORM + PostgreSQL
- **Routing**: wouter (frontend), Express (backend API)
- **State**: TanStack React Query

## Structure
```
client/src/
  App.tsx              - Main app with sidebar layout and routing
  components/
    app-sidebar.tsx    - Navigation sidebar
    ui/                - Shadcn components
  pages/
    dashboard.tsx      - KPI cards, today tasks, charts, alerts
    crops.tsx          - Crop management (CRUD)
    seasons.tsx        - Season management (CRUD)
    season-progress.tsx - Stage timeline (planting/caring/harvesting)
    tasks.tsx          - Task board with status tabs
    work-logs.tsx      - Production diary
    supplies.tsx       - Inventory with stock alerts
    climate.tsx        - Climate charts (temp/humidity/rain/light/soil/pH)
    users-page.tsx     - User management

server/
  index.ts             - Express server entry
  db.ts                - Database connection (Drizzle + pg)
  storage.ts           - Database storage layer (IStorage interface)
  routes.ts            - REST API routes (/api/*)
  seed.ts              - Seed data for demo

shared/
  schema.ts            - Drizzle schema + Zod validation + TypeScript types
```

## Database Tables
- users (roles: manager/farmer)
- crops (crop catalog with growing info)
- seasons (season tracking with stages)
- tasks (task management with status/priority)
- work_logs (production diary entries)
- supplies (inventory with stock levels)
- supply_transactions (import/export history)
- climate_readings (sensor data)
- alerts (system notifications)

## Key Features
- Dashboard with KPI cards, today's tasks, climate charts, alerts panel
- Crop management with growing conditions
- Season tracking with 3-stage timeline (Planting > Caring > Harvesting)
- Task board with status tabs (Todo/Doing/Done/Overdue)
- Inventory management with low-stock alerts
- Climate monitoring with 6 metric charts
- User management with role-based access
