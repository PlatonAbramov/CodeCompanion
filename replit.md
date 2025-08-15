# Overview

This is a construction and HVAC services management mobile application designed for internal use by company employees. The application serves as a project and expense tracking system with two distinct user roles: Directors (administrators) who have full access to all projects and financial data, and Masters/Workers who can only track their own expenses. The system includes project management, expense tracking with receipt uploads, document management, advance payment tracking, and comprehensive financial reporting capabilities.

## Recent Changes

**August 15, 2025** - Database synchronization and admin panel fixes:
- Fixed database schema synchronization between development and production environments
- Renamed session_token to session_id in user_sessions table for consistency
- Added missing columns (email, failure_reason, user_id) to login_attempts table
- Fixed React Hooks ordering in AdminPanel.tsx to prevent rendering errors
- Ensured all admin panel queries use enabled: isAdmin for optimization
- Database schema now properly synced for consistent authentication across deployments

**August 15, 2025** - Completed admin panel implementation with full functionality:
- Added admin panel database tables (userSessions, loginAttempts, adminActions) with proper schema
- Created comprehensive AdminPanel.tsx component with user management interface
- Implemented admin-only access controls restricted to platonabramov90@gmail.com
- Added admin panel navigation button in DirectorDashboard.tsx for authorized user
- Created full server-side API routes for admin functionality in routes.ts
- Updated storage interface with admin methods for user management and action logging
- Successfully migrated database schema to include email column and admin tables
- Created admin user account with proper authentication credentials

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
- **Role-Based Access**: Directors have full system access, Masters can only view/edit their own expenses
- **Route Protection**: Middleware functions enforce authentication and role-based permissions
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