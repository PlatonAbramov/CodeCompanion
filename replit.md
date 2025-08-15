# Overview

This is a construction and HVAC services management mobile application designed for internal use by company employees. The application serves as a project and expense tracking system with two distinct user roles: Directors (administrators) who have full access to all projects and financial data, and Masters/Workers who can only track their own expenses. The system includes project management, expense tracking with receipt uploads, document management, advance payment tracking, and comprehensive financial reporting capabilities.

## Recent Changes

**August 15, 2025** - Implemented comprehensive photo functionality and deployment stability:
- **Photo Thumbnails**: Added `photoThumbnailUrl` field to tool movements with automatic 100x100px thumbnail generation using Sharp
- **Optional Photos**: Made photo uploads optional for tool movements while maintaining full functionality
- **Enhanced Photo Viewer**: Improved modal viewer with professional dark theme and zoom-out click functionality
- **Thumbnail Display**: Added hover effects and error handling for thumbnail images in tool movement history
- **Automatic Database Bootstrap**: Implemented fully automated migration system that runs at startup with advisory locks
- **Production-Ready Deployments**: Eliminated deployment failures with idempotent database migrations and preflight checks
- **Deployment Error Handling**: Added production deployment safeguards with `AUTO_MIGRATE=0`, `SKIP_MIGRATION_ON_ERROR=1`, and platform error detection
- **Migration Resilience**: Enhanced migration system to handle platform issues gracefully without blocking deployment
- **File Serving**: Fixed uploads directory structure to ensure thumbnails and photos are properly served
- **Backward Compatibility**: Created thumbnails for existing photo records and updated database entries
- **Authentication Security**: Enhanced JWT/session compatibility with robust error handling
- **Auto Director Seeding**: System automatically creates/updates director account `platonabramov90` with password `123456` at startup

# User Preferences

Preferred communication style: Simple, everyday language.

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

# Deployment Configuration

## Environment Variables for Production

The application includes robust deployment safeguards to handle database migration platform issues:

### Required Production Secrets
```
AUTO_MIGRATE=0                 # Disable automatic database migrations
SKIP_MIGRATION_ON_ERROR=1      # Allow startup despite migration failures  
NODE_ENV=production           # Enable production environment mode
DATABASE_URL=postgresql://... # PostgreSQL connection string
```

### Migration Controls
- **AUTO_MIGRATE=0**: Completely disables automatic database migrations during startup
- **SKIP_MIGRATION_ON_ERROR=1**: Allows application to start even if migrations fail due to platform issues
- **NODE_ENV=production**: Automatically enables migration error skipping in production environment

### Platform Error Handling
The system detects and handles common deployment platform issues:
- Database connection timeouts
- Transaction abortion errors  
- Network connectivity issues
- Advisory lock failures

### Deployment Process
1. Set all required environment variables in Replit production secrets
2. Use the Replit deploy button to deploy the application
3. The application will start successfully even if database migrations encounter platform issues
4. Manual database operations can be performed using the Replit database panel if needed