# HorecaSmart Operations Platform

HorecaSmart is a multi-app operations platform for field sales, warehouse dispatch, driver delivery, admin control, finance, and Odoo-backed business data. The frontend is React/Vite, the backend is Supabase, and the integration layer uses Supabase Edge Functions for Odoo sync and privileged admin tasks.

## Active Apps

| App | Source | Purpose | Dev command |
| --- | --- | --- | --- |
| Admin | `src/` | Management, RBAC, orders, logistics, finance, reports, users | `npm run dev:admin` |
| Sales PWA | `sales_team/` with `sales/` HTML root | Field sales, visits, calls, customers, order intents | `npm run dev:sales` |
| Driver PWA | `driver_team/` | Delivery route execution, load confirmation, proof, collections | `npm run dev:driver` |
| Dispatcher PWA | `dispatcher/` | Warehouse preparation, plans, inventory, barcode scanning | `npm run dev:dispatcher` |

`driver/` is a legacy compatibility shell. Do not add new driver features there.

## Quick Start

```bash
npm install
npm run dev:admin
```

Run the other apps in separate terminals when needed:

```bash
npm run dev:sales
npm run dev:driver
npm run dev:dispatcher
```

## Core Commands

| Command | Description |
| --- | --- |
| `npm run build` | Build all active apps |
| `npm run build:admin` | Build admin app |
| `npm run build:sales` | Build sales app |
| `npm run build:driver` | Build driver app workspace |
| `npm run build:dispatcher` | Build dispatcher app workspace |
| `npm run lint` | Run ESLint |
| `npm run check:pwa` | PWA asset/readiness checks |
| `npm run check:arabic` | Arabic/RTL text regression checks |
| `npm run check:db-security` | Database security regression checks |
| `npm run check:edge-security` | Edge Function security regression checks |

## Architecture Docs

Start here:

- [Current architecture and repo stabilization](docs/current-architecture.md)
- [Workflow source of truth](docs/workflow-source-of-truth.md)
- [Onboarding guide](ONBOARDING_GUIDE.md)
- [Project issue tracker](PROJECT_ISSUES.md)
- [Code review report](CODE_REVIEW_REPORT.md)

## Backend

Supabase is the source of truth for auth, profiles, roles, business data, realtime subscriptions, storage, RPCs, and Edge Functions.

Important paths:

- `supabase/migrations/`
- `supabase/functions/`
- `supabase/functions/_shared/odoo.ts`
- `supabase/types-generated.ts`

When touching Supabase behavior, keep RLS, function grants, realtime publication, and generated TypeScript types in sync.

## Current Direction

The project intentionally uses separate apps for separate operational roles. The cleanup direction is not to merge them, but to make them feel like four apps on one platform:

- clear app ownership
- shared domain/status contracts
- shared Supabase/auth helpers
- backend-owned workflow transitions
- fewer legacy/demo/generated files in the main source tree
