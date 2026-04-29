# Overview

This is a mobile application for internal use by a construction and HVAC services company, designed for managing projects and tracking expenses. It supports two user roles: Directors (administrators) with full access, and Masters/Workers who can track their own expenses. Key capabilities include project management, expense tracking with receipt uploads, document management, advance payment tracking, and financial reporting. The system also features an "Implementation Sheets" functionality for tracking work progress from estimates, including photo documentation and audit logs. The application aims to provide a comprehensive, mobile-first solution for operational efficiency and financial oversight in construction and HVAC projects.

# User Preferences

Preferred communication style: Simple, everyday language.

# Localization Rule (MANDATORY for all future changes)

**Every UI change must be done in all three languages — Russian (`ru`), English (`en`), and Hindi (`hi`) — at the same time. No exceptions.**

Hard rules for any new feature, edit, bug fix, refactor, or addition that touches the UI:

1. **No hardcoded strings.** Every visible string in JSX, props, placeholders, labels, button text, toasts, modal titles/descriptions, alerts, table headers, validation messages, empty states, tooltips, etc. must be wrapped in `t('keyName')` from `useLanguage()` (`@/components/LanguageProvider`).
2. **Add the key to all three blocks at once.** Whenever a new translation key is added to `client/src/lib/translations.ts`, it must be added to **all three** language blocks (`ru`, `en`, `hi`) in the same edit. Never leave a key in only one or two languages.
3. **Real translations only.** Hindi must be real Devanagari, English must be professional English. No Russian-into-English copy-paste, no `TODO` placeholders, no transliteration.
4. **Reuse before adding.** Before adding a new key, grep `client/src/lib/translations.ts` for an existing key with the same meaning and reuse it. Avoid duplicates and near-synonyms.
5. **Unique prefixes for new feature scopes.** When adding a batch of keys for a new screen/component, use a short unique prefix (e.g. `myFeature_xxx`) to prevent collisions.
6. **Dates and numbers via locale helpers.** Never call `toLocaleDateString('ru-RU')` / `toLocaleString('ru-RU')` directly. Use `fmtDate(date, language)` / `fmtDateTime(date, language)` / `fmtMonth(date, language)` from `@/lib/locale` and `fmtNum` from `@/components/corp-ui`. The `language` value comes from `useLanguage()`.
7. **Server error messages.** Errors surfaced to the user from API responses must go through `getServerErrorMessage(err, t)` from `@/lib/serverErrors` so unknown statuses fall back to the localized `err_*` keys.
8. **Interpolation pattern.** For dynamic values inside translated strings, use `t('keyTpl').replace('{var}', String(value))`. Define the template with `{var}` placeholders in all three languages.
9. **Verification before completing the change.** After any UI edit, the developer agent must run:
   - `grep -n "[А-Яа-яЁё]" <changed-file>` — only matches inside JS/JSX comments are allowed.
   - `npx tsc --noEmit` — must be clean for the changed files.
   - Confirm every new key exists in all three language blocks.
10. **Comments are exempt.** Russian text inside `//` or `/* */` code comments does not need to be translated — only user-visible strings.

This rule overrides any conflicting instruction. If a task description says “just add a button”, the button still must be localized in all three languages.

# System Architecture

## Frontend Architecture
- **Framework**: React with TypeScript using Vite.
- **UI Components**: shadcn/ui built on Radix UI.
- **Styling**: Tailwind CSS for responsive design with CSS variables.
- **State Management**: TanStack Query (React Query) for server state.
- **Routing**: Wouter for lightweight client-side routing.
- **Internationalization**: Custom language provider for Russian, English and Hindi (`ru` / `en` / `hi`), persisted in localStorage. Compact globe-icon `LanguageSwitcher` lives in the top header of the main dashboard and on the login page.

## Backend Architecture
- **Runtime**: Node.js with Express.js.
- **Database**: PostgreSQL with Drizzle ORM.
- **Authentication**: Session-based with bcrypt password hashing.
- **File Storage**: Google Cloud Storage.
- **API Design**: RESTful API with role-based access control.

## Database Schema
- **Core Entities**: Users (roles: director/master), Projects, Expenses, Documents, Advances, Contractors.
- **Relationships**: User-Project, Contractor-Project relations.
- **New Features**: Implementation Sheets for detailed work progress tracking, including items, photos, and change logs.

## Authentication & Authorization
- **Session Management**: Express-session.
- **Role-Based Access Control**: Five tiers (Admin, Director, Master, Worker, Client) with default permissions per role, plus per-role and personal per-user overrides. All API endpoints enforce permissions via `requirePermission` / `requireAnyPermission` middleware (`server/lib/permissions.ts`); the frontend mirrors these checks via the `usePermissions` hook backed by `GET /api/permissions/me`. Hard role gates in route handlers must NOT be reintroduced — always use permission keys so admin-issued personal overrides work.
- **User Creation**: Admin-only user creation; no public registration.
- **Password Security**: Bcrypt hashing.
- **Client User Permissions**: Client users have standardized read-only access to assigned projects, implementation sheets, and photos, but cannot edit content or change completion status.
- **Worker (Рабочий) Permissions**: Sees a list of all active projects (name + status only, no financials) and can open any project to view implementation sheets, view all photos, upload new photos, and delete only own photos. No access to finance, expenses, documents, contractors, clients, personnel, tools, analytics, or admin sections. Vehicles section is reserved for users with the personnel «Водитель» flag (wiring pending). Enforced server-side via a `denyWorker` middleware bundle plus inline checks on `/api/projects/:id/{expenses,documents,financial-summary}`.

## File Management
- **Upload System**: Uppy integrated with Google Cloud Storage for receipts, documents, and implementation sheet photos/videos.
- **Access Control**: Object-level ACL policies.
- **Supported Files**: Images, PDFs, and videos (up to 100MB per file).
- **Storage Integration**: Direct-to-cloud uploads using presigned URLs.

## Permissions Framework (Phases 1 + 2)
- **Tables**: `role_permissions`, `user_permission_overrides`, `permission_audit_log`.
- **Registry**: `shared/permissions.ts` defines 47 permission keys across 7 categories with RU labels and per-role defaults that exactly mirror the original role-based middleware behavior. Phase 1 added the framework as a no-op; Phase 2 wired it into real routes.
- **Server framework**: `server/lib/permissions.ts` exposes `getEffectivePermissions(user)` (override > role row > registry default), `userHasPermission`, and a `requirePermission(key)` middleware. Per-request cache via `req._permissionsCache`. Defaults are seeded idempotently at startup.
- **Admin endpoints**: `GET/PUT /api/permissions/role/:role`, `POST /api/permissions/role/:role/reset`, `GET/PUT /api/permissions/user/:userId`, `POST /api/permissions/user/:userId/reset`, `GET /api/permissions/registry`, `GET /api/permissions/audit?limit=100`. All gated by `users.manage_permissions`. `GET /api/permissions/me` returns the caller's effective map (no manage perm needed).
- **Safety**: `users.manage_permissions` is `isSystem` and rejected on write. Last-admin protection and self-lock confirmation (`confirmSelfLock`) are also enforced as defensive layers in case `isSystem` is ever lifted.
- **Phase 2 — route migration**: All hard-coded role middleware in `server/routes.ts` (`requireDirector`, `requireDirectorOrAdmin`, `requireAdminOrForeman`) has been replaced with `requirePermission(KEY)` per route. Admin permission edits made in the `/permissions` UI now take effect on real endpoints. Migrated areas: users, projects (incl. delete/archive), advances, customer advances, revenues, documents (upload/delete), contractor-projects, implementation sheets parse-invoice, vehicles (manage + audit log), analytics, personnel (view + manage), contractors, clients, client-projects, tools (incl. movements). Pre-existing duplicate route definitions that bypassed the permission check (`DELETE /api/documents/:id`, `PUT /api/contractor-projects/:id`) were consolidated. `/api/admin/*` routes intentionally remain on `requireAdmin` (admin-panel sub-functions tied to `system.access_admin_panel`). `denyWorker` path-level middleware remains as defense-in-depth.
- **Admin UI**: `/permissions` (admin only) — four tabs «По ролям», «По сотрудникам», «По персоналу», «Журнал». Per-role on/off toggles, per-user three-state override (По умолчанию / Включено / Выключено), audit table.
- **Phase 3 — Personnel ↔ User link**: `personnel.user_id` (varchar, unique, FK→users(id) ON DELETE SET NULL) ties an HR record to a login. Backend: `PUT /api/personnel/:id` accepts `userId` and pre-validates uniqueness with friendly errors; `POST /api/personnel/:id/create-user` (gated by `users.create`) creates a bcrypt-hashed account and links it in one step; `storage.getPersonnelByUserId(userId)` is the lookup primitive. Personnel card («Учётная запись» section, admin-only) lets admins create a fresh login or pick a free existing user, view linked username/role, and unlink (account remains, link is cleared). The new «По персоналу» tab in `/permissions` lists all personnel with «есть учётка» / «без учётки» badges; selecting a linked person reuses `/api/permissions/user/:userId` to edit their effective permissions, while unlinked personnel get a one-click jump back to the personnel card to create/link an account.

## Key Features
- **Project Management**: Creation, tracking, budget oversight.
- **Expense Tracking**: Mobile-friendly entry with mandatory receipt uploads.
- **Financial Reporting**: Real-time profit/loss, financial summaries.
- **Document Management**: Centralized storage for project documents.
- **Implementation Sheets**: Detailed tracking of work progress from estimates, including photo documentation.
- **Vehicles Photo Control**: Weekly Sunday 8-step photo control of fleet vehicles with watermarked photos, mileage tracking, server-time validation, PDF reports stored in GCS, mileage statistics, full audit log, and director-only mileage correction with monotonic ordering safeguards.
- **Enhanced Photo Viewing**: Full-screen photo viewer with zoom, rotation, navigation, and keyboard shortcuts.
- **Real-time Updates**: Automatic cache invalidation and refresh for client users.
- **Multi-language Support**: Full localization in Russian, English, and Hindi (RU/EN/HI). Every visible UI string is rendered via the `t()` helper from `client/src/components/LanguageProvider.tsx`, all dates/times use the locale-aware formatters from `client/src/lib/locale.ts` (`fmtDate`, `fmtDateTime`, `fmtMonth`), and server error responses are mapped to localized messages through `client/src/lib/serverErrors.ts`. Translations live in `client/src/lib/translations.ts` (~4400 lines, three language blocks `ru` / `en` / `hi`, ~1500 keys grouped by domain prefixes — `pd_`, `prDet_`, `pcm_`, `tools_`, `is_`, `isv_`, `iic_`, `perm_`, `anal_`, `acm_`, `paf_`, `sys_`, `err_`, etc.). Language is selectable from the login screen and from the in-app navigation; choice persists per user.
- **Mobile-First Design**: Optimized for mobile devices.

## UI Redesign — Pag CRM Corporate v1
Migrating to a corporate brandbook UI in batches of pages. Shared building blocks live in `client/src/components/corp-ui.tsx`: `CorpHeader`, `CorpEmpty`, `CorpHeroSummary`, `MoneyAED`, `fmtNum`, `fmtDateRu`. Foundation tokens are defined in `client/src/index.css` (`--corp-bg`, `--corp-surface`, `--corp-ink`, `--corp-accent`, `--corp-pos`, `--corp-neg`, `--corp-brand`, `--corp-mono`, `--corp-font`, etc.). Pages migrated so far: Login, DirectorDashboard, MasterDashboard, ExpensesList, AdvancesList, CustomerAdvancesList, RevenuesList, ArchivedProjects.

# External Dependencies

## Core Infrastructure
- **Database**: Neon PostgreSQL.
- **File Storage**: Google Cloud Storage.
- **Build Tools**: Vite (frontend), esbuild (backend).

## Authentication & Security
- **Password Hashing**: bcrypt.
- **Session Management**: express-session.

## Frontend Libraries
- **UI Framework**: React.
- **Component Library**: Radix UI, shadcn/ui.
- **State Management**: TanStack React Query.
- **Styling**: Tailwind CSS, PostCSS.
- **File Upload**: Uppy.
- **Form Handling**: React Hook Form, Zod.

## Backend Dependencies
- **Web Framework**: Express.js.
- **Database ORM**: Drizzle with PostgreSQL adapter.
- **Development Tools**: tsx.
- **Cloud Integration**: Google Cloud Storage SDK.