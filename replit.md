# Overview

This is a mobile application for internal use by a construction and HVAC services company, designed for managing projects and tracking expenses. It supports two user roles: Directors (administrators) with full access, and Masters/Workers who can track their own expenses. Key capabilities include project management, expense tracking with receipt uploads, document management, advance payment tracking, and financial reporting. The system also features an "Implementation Sheets" functionality for tracking work progress from estimates, including photo documentation and audit logs. The application aims to provide a comprehensive, mobile-first solution for operational efficiency and financial oversight in construction and HVAC projects.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React with TypeScript using Vite.
- **UI Components**: shadcn/ui built on Radix UI.
- **Styling**: Tailwind CSS for responsive design with CSS variables.
- **State Management**: TanStack Query (React Query) for server state.
- **Routing**: Wouter for lightweight client-side routing.
- **Internationalization**: Custom language provider for Russian and English.

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
- **Role-Based Access Control**: Five tiers (Admin, Director, Master, Worker, Client) with specific permissions enforced via middleware.
- **User Creation**: Admin-only user creation; no public registration.
- **Password Security**: Bcrypt hashing.
- **Client User Permissions**: Client users have standardized read-only access to assigned projects, implementation sheets, and photos, but cannot edit content or change completion status.
- **Worker (Рабочий) Permissions**: Sees a list of all active projects (name + status only, no financials) and can open any project to view implementation sheets, view all photos, upload new photos, and delete only own photos. No access to finance, expenses, documents, contractors, clients, personnel, tools, analytics, or admin sections. Vehicles section is reserved for users with the personnel «Водитель» flag (wiring pending). Enforced server-side via a `denyWorker` middleware bundle plus inline checks on `/api/projects/:id/{expenses,documents,financial-summary}`.

## File Management
- **Upload System**: Uppy integrated with Google Cloud Storage for receipts, documents, and implementation sheet photos/videos.
- **Access Control**: Object-level ACL policies.
- **Supported Files**: Images, PDFs, and videos (up to 100MB per file).
- **Storage Integration**: Direct-to-cloud uploads using presigned URLs.

## Permissions Framework (Phase 1, additive)
- **Tables**: `role_permissions`, `user_permission_overrides`, `permission_audit_log`.
- **Registry**: `shared/permissions.ts` defines 46 permission keys across 7 categories with RU labels and per-role defaults that exactly mirror the current behavior of the role-based middleware. Phase 1 release is a no-op for all existing users.
- **Server framework**: `server/lib/permissions.ts` exposes `getEffectivePermissions(user)` (override > role row > registry default), `userHasPermission`, and a `requirePermission(key)` middleware. Per-request cache via `req._permissionsCache`. Defaults are seeded idempotently at startup.
- **Admin endpoints**: `GET/PUT /api/permissions/role/:role`, `POST /api/permissions/role/:role/reset`, `GET/PUT /api/permissions/user/:userId`, `POST /api/permissions/user/:userId/reset`, `GET /api/permissions/registry`, `GET /api/permissions/audit?limit=100`. All gated by `users.manage_permissions`. `GET /api/permissions/me` returns the caller's effective map (no manage perm needed).
- **Safety**: `users.manage_permissions` is `isSystem` and rejected on write. Last-admin protection and self-lock confirmation (`confirmSelfLock`) are also enforced as defensive layers in case `isSystem` is ever lifted.
- **Admin UI**: `/permissions` (admin only) — three tabs «По ролям», «По сотрудникам», «Журнал». Per-role on/off toggles, per-user three-state override (По умолчанию / Включено / Выключено), audit table.
- **Phase 2 (future, separate task)**: migrate existing role middleware (`requireDirector`, `requireMaster`, `denyWorker`, etc.) to `requirePermission(...)`.

## Key Features
- **Project Management**: Creation, tracking, budget oversight.
- **Expense Tracking**: Mobile-friendly entry with mandatory receipt uploads.
- **Financial Reporting**: Real-time profit/loss, financial summaries.
- **Document Management**: Centralized storage for project documents.
- **Implementation Sheets**: Detailed tracking of work progress from estimates, including photo documentation.
- **Vehicles Photo Control**: Weekly Sunday 8-step photo control of fleet vehicles with watermarked photos, mileage tracking, server-time validation, PDF reports stored in GCS, mileage statistics, full audit log, and director-only mileage correction with monotonic ordering safeguards.
- **Enhanced Photo Viewing**: Full-screen photo viewer with zoom, rotation, navigation, and keyboard shortcuts.
- **Real-time Updates**: Automatic cache invalidation and refresh for client users.
- **Multi-language Support**: Russian and English.
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