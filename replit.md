# Overview

This is a construction and HVAC services management mobile application designed for internal use by company employees. The application serves as a project and expense tracking system with two distinct user roles: Directors (administrators) who have full access to all projects and financial data, and Masters/Workers who can only track their own expenses. The system includes project management, expense tracking with receipt uploads, document management, advance payment tracking, and comprehensive financial reporting capabilities.

## Recent Changes

**January 19, 2025** - Implementation Sheets feature (Смета → Лист реализации):
- Created comprehensive system for tracking work progress from estimates
- Implemented database tables for implementation sheets, items, photos, and change logs
- Added file upload functionality with Google Cloud Storage integration
- Created UI components for viewing and managing implementation sheets
- Implemented progress tracking with percentage completion for each work item
- Added photo documentation system with upload and viewing capabilities
- Integrated role-based permissions - only admins/directors can create/edit sheets
- Added navigation from project details to implementation sheets
- System tracks changes with audit logs for progress updates and photo uploads

**August 16, 2025** - Critical debugging and PDF parser fixes:
- Successfully resolved critical PDF parser crash that was preventing application startup
- Fixed "require is not defined in ES module scope" error by implementing safe dynamic loading
- Corrected database schema type errors and circular dependency issues in shared/schema.ts
- Added missing getUserProject method to DatabaseStorage class  
- Resolved multiple TypeScript compilation errors across server files
- Application now successfully starts on port 5000 with working authentication system
- All core features including project management, expense tracking, and user authentication are operational
- PDF invoice parsing functionality restored with proper ES module compatibility

**August 16, 2025** - Complete PDF invoice parsing and implementation sheet creation:
- Fixed critical numeric field overflow issues by implementing proper value limiting (max 999999999)
- Successfully completed end-to-end PDF parsing workflow for construction invoices
- Resolved database insertion errors by sanitizing numeric values to string format for decimal columns
- Added missing implementation_sheets table columns (auto_generated, parsed_from_format, parse_errors)
- PDF parser now successfully extracts and processes construction work items with Russian/English descriptions
- Full integration working: PDF upload → parsing → implementation sheet creation → database storage
- Successfully tested with real construction invoice containing 43 line items with quantities, prices, and costs

**August 16, 2025** - Improved PDF parsing accuracy and table structure detection:
- Enhanced PDF parser to correctly identify table headers "No. Description Quantity Unit Price (AED) Total (AED)"
- Implemented proper table boundary detection - parsing starts after header and stops before "Subtotal"
- Fixed multi-line description handling to correctly combine split descriptions into single items
- Parser now correctly handles Russian construction invoice format with proper item separation
- Successfully parsing 8+ construction work items with accurate quantities, prices, and total costs
- Improved table row detection using regex patterns for "number description quantity price total" format

**August 16, 2025** - Complete API request format standardization and fixes:
- Fixed document upload functionality - now properly creates database records after file upload
- Standardized all API request calls across the entire codebase to use new format: `apiRequest(url, { method, body })`
- Updated 15+ files including Tools.tsx, AdminPanel.tsx, AddAdvance.tsx, AddExpense.tsx, Contractors.tsx, and others
- Removed all instances of old format: `apiRequest('METHOD', url, data)` 
- Added missing document deletion endpoint on server side
- All CRUD operations now use consistent API request format for better maintainability

**August 16, 2025** - Complete role-based access control system implementation:
- Migrated from email-based admin checks to proper role-based authentication system
- Updated existing admin user (platonabramov90@gmail.com) to 'admin' role in database
- Implemented comprehensive role hierarchy: admin > director > master > client
- Updated AdminPanel.tsx to use role-based permissions instead of email checks
- Modified DirectorDashboard.tsx admin panel button to show only for 'admin' role users
- Enhanced API endpoints with role-specific access controls for project management
- Removed all public registration endpoints - user creation now exclusively through admin panel
- Added support for multiple user roles in admin panel UI with proper role badges
- System now enforces strict access controls where only admin can create/manage all users

**August 15, 2025** - Database synchronization and admin panel fixes:
- Fixed database schema synchronization between development and production environments
- Renamed session_token to session_id in user_sessions table for consistency
- Added missing columns (email, failure_reason, user_id) to login_attempts table
- Fixed React Hooks ordering in AdminPanel.tsx to prevent rendering errors
- Ensured all admin panel queries use enabled: isAdmin for optimization
- Database schema now properly synced for consistent authentication across deployments

# User Preferences

Preferred communication style: Simple, everyday language.

## Database Synchronization Guidelines

**Important**: To ensure user accounts work across all deployments:

1. **Development and Production Use Same Database**: Both environments connect to the same PostgreSQL database hosted on Neon, ensuring data persistence across deployments.

2. **Schema Synchronization**: When making database schema changes:
   - Run `npm run db:push` locally to apply schema changes
   - All schema changes are immediately reflected in production since both use the same database
   - User accounts, projects, and all data remain accessible after deployment

3. **Authentication Persistence**: 
   - User accounts created in development are immediately available in production
   - Session data persists across deployments
   - No need for separate production user creation

4. **Admin Access**: The admin user (platonabramov90@gmail.com) has permanent access across all deployments.

# System Architecture

## Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS for responsive design with CSS variables for theming
- **State Management**: TanStack Query (React Query) for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Internationalization**: Custom language provider supporting Russian and English

## Backend Architecture
- **Runtime**: Node.js with Express.js web framework
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Authentication**: Session-based authentication with bcrypt for password hashing
- **File Storage**: Google Cloud Storage for receipt and document uploads
- **API Design**: RESTful API endpoints with role-based access control

## Database Schema
- **Users**: Stores employee information with roles (director/master) and authentication data
- **Projects**: Contains project details, budget information, and status tracking
- **Expenses**: Records expense entries with categories, amounts, receipt references, and contractor links
- **Documents**: Manages project-related documents and file metadata
- **Advances**: Tracks advance payments made to projects
- **User-Project Relations**: Links employees to specific projects for access control
- **Contractors**: Stores contractor information, specialization, contact details, and license documents
- **Contractor-Project Relations**: Links contractors to specific projects with budget allocations and work descriptions

## Authentication & Authorization
- **Session Management**: Express-session middleware for persistent login sessions
- **Role-Based Access Control**: Four-tier hierarchy system with specific permissions:
  - **Admin**: Full system access, user management, project creation/editing, all data access
  - **Director**: Project management for assigned projects, expense tracking, team oversight
  - **Master**: Limited to assigned projects, expense tracking, own data management
  - **Client**: View-only access to projects where they are the client
- **Route Protection**: Middleware functions enforce authentication and role-based permissions
- **Admin-Only User Creation**: No public registration - all users created through admin panel
- **Password Security**: Bcrypt hashing with salt rounds for secure password storage

## File Management
- **Upload System**: Uppy file uploader integrated with Google Cloud Storage
- **Access Control**: Object-level ACL policies for secure file access
- **File Types**: Support for receipts (images/PDFs) and project documents
- **Storage Integration**: Direct-to-cloud uploads with presigned URLs

## Key Features
- **Project Management**: Create, track, and manage construction projects with budget oversight
- **Expense Tracking**: Mobile-friendly expense entry with mandatory receipt uploads
- **Financial Reporting**: Real-time profit/loss calculations and project financial summaries
- **Document Management**: Centralized storage for project documents, permits, and estimates
- **Multi-language Support**: Interface available in Russian and English
- **Mobile-First Design**: Responsive UI optimized for mobile device usage

# External Dependencies

## Core Infrastructure
- **Database**: Neon PostgreSQL serverless database
- **File Storage**: Google Cloud Storage for document and receipt storage
- **Build Tools**: Vite for frontend bundling, esbuild for backend compilation

## Authentication & Security
- **Password Hashing**: bcrypt for secure password storage
- **Session Management**: express-session for user authentication state

## Frontend Libraries
- **UI Framework**: React with TypeScript
- **Component Library**: Radix UI primitives with shadcn/ui components
- **State Management**: TanStack React Query for server state
- **Styling**: Tailwind CSS with PostCSS processing
- **File Upload**: Uppy dashboard with AWS S3 compatibility
- **Form Handling**: React Hook Form with Zod validation

## Backend Dependencies
- **Web Framework**: Express.js with TypeScript support
- **Database ORM**: Drizzle with PostgreSQL adapter
- **Development Tools**: tsx for TypeScript execution in development
- **Cloud Integration**: Google Cloud Storage SDK

## Development Environment
- **Replit Integration**: Vite plugins for Replit development environment
- **Code Quality**: TypeScript strict mode with comprehensive type checking
- **Hot Reload**: Vite HMR for frontend, tsx watch mode for backend development