# KPrints ERP

KPrints ERP is a SaaS-style ERP platform for a poster printing and selling business. It supports offline store sales, website orders, ready-made posters, custom print jobs, personalized poster orders, inventory, production workflow, shipments, expenses, and lightweight financial analytics.

The repository is a **monorepo** with two packages:

- **`frontend/`** — Angular ERP web app (PWA-ready UI)
- **`backend/`** — Hono REST API with Prisma and Supabase PostgreSQL

The frontend loads all operational data from the Hono REST API backed by PostgreSQL.

## Tech Stack

### Frontend (`frontend/`)

- Angular 21 with standalone components and strict TypeScript
- Angular Router with lazy-loaded feature routes
- PrimeNG 21, PrimeFlex, PrimeIcons
- Chart.js through PrimeNG charts
- RxJS for async repository APIs
- Angular signals for local UI and data state
- Angular PWA service worker and web manifest
- Repository abstraction over HTTP via `ApiClientService`

### Backend (`backend/`)

- Node.js with TypeScript (ES modules)
- Hono web framework with `@hono/node-server`
- Zod validation via `@hono/zod-validator`
- Prisma ORM with PostgreSQL (Supabase)
- Supabase Storage for artwork uploads
- Deployable to Vercel (`backend/vercel.json`)

## Application Modules

Implemented route surfaces in the frontend (backed by matching API modules where noted):

| Module | Frontend route | Backend API |
| --- | --- | --- |
| Dashboard | Yes | `/api/dashboard` |
| Orders | Yes | `/api/orders` |
| Customers | Yes | `/api/customers` |
| Products / Posters Catalog | Yes | `/api/posters` |
| Inventory / Material Inventory | Yes | `/api/inventory` |
| Production Workflow | Yes | `/api/production` |
| Print Queue | Yes (production) | `/api/production` |
| Shipment Tracking | Yes | `/api/shipments` |
| Vendors / Suppliers | Yes (operations) | via inventory & expenses |
| Purchases | Yes (operations) | — |
| Coupons & Discounts | Yes (operations) | Prisma `Coupon` model |
| Artwork Uploads | Yes (operations) | `/api/upload` |
| Finance | Yes | `/api/expenses` |
| Reports & Analytics | Yes | `/api/reports` |
| Settings | Yes | `/api/setup` |

Some secondary modules use the generic operational screen pattern so they are routable and ready for domain-specific expansion.

## Core Features

### Frontend

- Responsive ERP app shell with collapsible sidebar, mobile navigation drawer, top navbar, breadcrumbs, and notification drawer
- Dashboard with revenue KPIs, order summary, pending print jobs, inventory alerts, charts, recent orders, production pipeline, top-selling posters, and activity timeline
- Order management for ready-made, custom design, and personalized poster orders
- Poster workflow statuses from design pending through printing, lamination, framing, packaging, shipping/pickup, delivered, and cancelled
- Dense PrimeNG operational tables with search, filters, bulk action affordances, status chips, pagination, and horizontal scrolling
- Customer, catalog, and inventory master-data screens
- Inventory tracking for paper rolls, ink, frames, lamination sheets, packaging materials, poster stock, and accessories
- Kanban-style production workflow and print queue table
- Finance screen with revenue, collected amount, expenses, profit, recent expenses, and P&L chart
- Dark/light theme architecture using CSS tokens and PrimeNG theme configuration
- INR-only currency formatting
- PWA-ready manifest, icons, and service worker configuration
### Backend

- REST API under `/api` with consistent `{ success, data, error?, message? }` responses
- Modular route groups: customers, posters, inventory, orders, production, shipments, expenses, dashboard, reports, upload, setup
- PostgreSQL persistence via Prisma (customers, orders, posters, inventory, suppliers, expenses, production jobs, shipments, coupons, invoices, artwork metadata, settings)
- Database setup endpoints: status check, demo seed, and fresh blank initialization (`/api/setup`)
- Artwork file upload to Supabase Storage with metadata stored in the database (`/api/upload`)
- CORS enabled for local and deployed frontends
- OpenAPI placeholder at `/api/openapi.json`

## Folder Structure

```text
kprints-erp/
  package.json                 # Monorepo scripts (frontend + backend)
  frontend/
    src/app/
      core/services/
        api-client.service.ts    # HTTP client for backend API
        erp-data.service.ts      # Repository wiring for domain entities
        repository.service.ts    # HTTP repository contract
        storage.service.ts       # Theme preference persistence
        theme.service.ts
      features/                  # catalog, customers, dashboard, finance, ...
      layout/app-shell/
      models/erp.models.ts
    src/environments/
      environment.ts             # production: apiBaseUrl '/api'
      environment.development.ts # dev: http://localhost:8000/api
    public/                      # PWA manifest, icons
    ngsw-config.json
  backend/
    prisma/schema.prisma         # PostgreSQL schema
    src/
      app.ts                     # Hono app + route registration
      config/index.ts
      lib/prisma.ts
      lib/supabase.ts
      middleware/error.ts
      modules/                   # customers, orders, posters, inventory, ...
      types/api.ts
    .env.example
    vercel.json
```

## Architecture Notes

### Frontend

The app follows a feature-based structure. Each feature owns its page components and presentation logic, while cross-cutting services live in `core` and reusable UI lives in `shared`.

Data access goes through repository abstractions:

- Feature screens consume repositories exposed by `ErpDataService`.
- `RepositoryFactory` returns `ApiRepository` instances for each collection.
- `ApiClientService` maps REST responses to typed observables.
- Models are DTO-ready TypeScript interfaces in `frontend/src/app/models/erp.models.ts`.

This keeps feature components decoupled from storage details.

### Backend

The API is organized by domain module under `backend/src/modules/`. Each module typically provides routes, services, and validators. Prisma is the single data access layer; Supabase is used for object storage (artwork buckets), not as the primary ORM.

### Frontend ↔ backend

| Concern | Development | Production |
| --- | --- | --- |
| Frontend URL | `http://localhost:4200` | Static build / hosting |
| API URL | `http://localhost:8000/api` | `/api` (same origin or reverse proxy) |
| Database | Supabase PostgreSQL via `DATABASE_URL` | Same |

Use **Settings** in the app (or `/api/setup/demo` / `/api/setup/fresh`) to load demo data or start with a blank database.

## PWA

PWA support is enabled through Angular service worker configuration in the **frontend**:

- `frontend/ngsw-config.json`
- `frontend/public/manifest.webmanifest`
- app icons under `frontend/public/icons/`
- production service worker registration in `frontend/src/app/app.config.ts`

The service worker is enabled only for production builds.

## Environment Configuration

### Backend

Copy `backend/.env.example` to `backend/.env` and configure:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Supabase PostgreSQL connection string |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (storage uploads) |
| `PORT` | API port (default `8000`) |
| `NODE_ENV` | `development` or `production` |

Apply the schema:

```bash
npm run db:push
```

### Frontend

`frontend/src/environments/environment.development.ts` points the app at `http://localhost:8000/api`. Production uses `apiBaseUrl: '/api'` for same-origin deployment behind a reverse proxy or Vercel routes.

## Development

From the **repository root**, install both packages:

```bash
npm install --prefix frontend
npm install --prefix backend
```

### Frontend only

```bash
npm start
```

Open `http://localhost:4200/`.

On Windows PowerShell, if script execution blocks `npm`, use `npm.cmd start`.

### Backend only

```bash
npm run backend:dev
```

API available at `http://localhost:8000/api`.

Generate Prisma client after schema changes:

```bash
npm run prisma:generate --prefix backend
```

### Frontend + backend together

```bash
npm run dev:all
```

Ensure `backend/.env` is configured and the database schema is pushed before using API mode.

## Build

### Frontend

```bash
npm run build
```

Output: `frontend/dist/kprints-erp/`

### Backend

```bash
npm run backend:build
npm run backend:start
```

Compiled output: `backend/dist/`

The backend can also be deployed as a Vercel serverless function (see `backend/vercel.json`).

## Tests

### Frontend

Run unit tests once:

```bash
npx ng test --watch=false --prefix frontend
```

Or on Windows PowerShell:

```bash
npx.cmd ng test --watch=false --prefix frontend
```

### Backend

Automated tests are not set up yet. Validate manually via `npm run backend:dev` and the `/api` health route.

## API Integration

The frontend is wired for the Hono backend:

1. `ApiClientService` performs GET/POST/PUT/DELETE against `environment.apiBaseUrl`.
2. `ApiRepository` implements the `Repository<T>` contract used by feature screens.
3. Use `/api/setup/demo` or Settings UI flows to seed the database when starting fresh.
4. Authentication and authorization are planned but not implemented yet.

## Current Scope

**Implemented:** Full ERP UI, REST API, Prisma schema, Supabase PostgreSQL persistence, demo/fresh setup, artwork uploads to Supabase Storage, dashboard and domain CRUD endpoints.

**Not yet implemented:** User authentication, role-based access control, GST, ledger accounting, journal entries, and TDS.
