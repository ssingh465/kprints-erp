# KPrints ERP

KPrints ERP is a frontend-only, SaaS-style ERP web application for a poster printing and selling business. It supports offline store sales, website orders, ready-made posters, custom print jobs, personalized poster orders, inventory, production workflow, shipments, expenses, and lightweight financial analytics.

The app currently runs fully on sample data with `localStorage` persistence. The architecture is intentionally API-ready so the storage/repository layer can later be swapped for FastAPI endpoints without rewriting feature screens.

## Tech Stack

- Angular 21 with standalone components and strict TypeScript
- Angular Router with lazy-loaded feature routes
- PrimeNG 21, PrimeFlex, PrimeIcons
- Chart.js through PrimeNG charts
- RxJS for async repository APIs
- Angular signals for local UI and data state
- Angular PWA service worker and web manifest
- LocalStorage-backed persistence with repository abstraction

## Application Modules

Implemented route surfaces include:

- Dashboard
- Orders
- Customers
- Products / Posters Catalog
- Inventory / Material Inventory
- Production Workflow
- Print Queue
- Shipment Tracking
- Vendors / Suppliers
- Purchases
- Coupons & Discounts
- Artwork Uploads
- Finance
- Reports & Analytics
- Settings

Some secondary modules currently use the generic operational screen pattern so they are routable and ready for domain-specific expansion.

## Core Features

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
- Mock seed data and localStorage persistence

## Folder Structure

```text
src/app/
  core/
    services/
      api-client.service.ts        # Future FastAPI HTTP abstraction
      mock-seed.service.ts         # Seeds and exposes repositories
      repository.service.ts        # Repository contract + localStorage implementation
      storage.service.ts           # Generic localStorage helper
      theme.service.ts             # Dark/light theme state
  features/
    catalog/
    customers/
    dashboard/
    finance/
    inventory/
    operations/                    # Generic ERP operational surface
    orders/
    production/
    reports/
    settings/
  layout/
    app-shell/                     # Sidebar, topbar, drawers, breadcrumbs
  mock-data/
    seed-data.ts                   # Sample ERP domain data
  models/
    erp.models.ts                  # Shared domain interfaces and status types
  shared/
    components/
      kpi-card/
      status-chip/
    pipes/
      inr.pipe.ts
```

## Architecture Notes

The app follows a feature-based structure. Each feature owns its page components and presentation logic, while cross-cutting services live in `core` and reusable UI lives in `shared`.

Data access goes through repository abstractions:

- Feature screens consume repositories exposed by `MockSeedService`.
- Repositories currently persist entities to `localStorage`.
- `ApiClientService` and environment configuration define the future FastAPI integration point.
- Models are DTO-ready TypeScript interfaces in `src/app/models/erp.models.ts`.

This keeps feature components decoupled from storage details and makes backend migration a service-layer change rather than a UI rewrite.

## PWA

PWA support is enabled through Angular service worker configuration:

- `ngsw-config.json`
- `public/manifest.webmanifest`
- app icons under `public/icons/`
- production service worker registration in `src/app/app.config.ts`

The service worker is enabled only for production builds.

## Development

Install dependencies:

```bash
npm install
```

Start the local development server:

```bash
npm start
```

Open:

```text
http://localhost:4200/
```

On Windows PowerShell, if script execution blocks `npm`, use:

```bash
npm.cmd start
```

## Build

Create a production build:

```bash
npm run build
```

Build output is written to:

```text
dist/kprints-erp/
```

## Tests

Run unit tests once:

```bash
npx ng test --watch=false
```

Or on Windows PowerShell:

```bash
npx.cmd ng test --watch=false
```

## Future FastAPI Integration

Planned backend migration path:

1. Add real HTTP methods to `ApiClientService`.
2. Introduce API-backed repository implementations matching the existing `Repository<T>` contract.
3. Switch `environment.storageMode` from `localStorage` to `api`.
4. Keep feature screens consuming repositories instead of calling HTTP directly.
5. Add authentication and authorization at route/service boundaries when backend auth is available.

## Current Scope

This is a production-grade frontend foundation with realistic mock data and local persistence. It intentionally does not implement GST, ledger accounting, journal entries, TDS, or authentication yet.
