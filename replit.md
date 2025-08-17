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
- **Role-Based Access Control**: Four tiers (Admin, Director, Master, Client) with specific permissions enforced via middleware.
- **User Creation**: Admin-only user creation; no public registration.
- **Password Security**: Bcrypt hashing.

## File Management
- **Upload System**: Uppy integrated with Google Cloud Storage for receipts, documents, and implementation sheet photos/videos.
- **Access Control**: Object-level ACL policies.
- **Supported Files**: Images, PDFs, and videos (up to 100MB per file).
- **Storage Integration**: Direct-to-cloud uploads using presigned URLs.

## Key Features
- **Project Management**: Creation, tracking, budget oversight.
- **Expense Tracking**: Mobile-friendly entry with mandatory receipt uploads.
- **Financial Reporting**: Real-time profit/loss, financial summaries.
- **Document Management**: Centralized storage for project documents.
- **Implementation Sheets**: Detailed tracking of work progress from estimates, including photo documentation.
- **Enhanced Photo Viewing**: Full-screen photo viewer with zoom, rotation, navigation, and keyboard shortcuts.
- **Real-time Updates**: Automatic cache invalidation and refresh for client users.
- **Multi-language Support**: Russian and English.
- **Mobile-First Design**: Optimized for mobile devices.

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