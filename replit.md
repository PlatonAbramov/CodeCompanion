# Overview

This is a construction and HVAC services management mobile application designed for internal use by company employees. The application serves as a project and expense tracking system with two distinct user roles: Directors (administrators) who have full access to all projects and financial data, and Masters/Workers who can only track their own expenses. The system includes project management, expense tracking with receipt uploads, document management, advance payment tracking, and comprehensive financial reporting capabilities.

## Recent Changes

**August 15, 2025** - Fixed deployment issues and authentication problems:
- Added error handling to prevent startup crashes when object storage environment variables are missing
- Implemented automatic default configuration for object storage based on REPL_ID
- Added graceful fallbacks for object storage functionality when credentials are unavailable
- Enhanced `ObjectStorageService` methods to handle missing environment variables without throwing errors
- **Added automatic admin user creation**: When database is empty, creates admin with username `platonabramov90@gmail.com` and password `123456`
- **Added password visibility toggle**: Users can now show/hide password in login form with eye icon
- **Added manual admin initialization endpoint**: `/api/init-admin` endpoint for creating admin user in production

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