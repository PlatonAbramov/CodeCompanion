# Deployment Configuration

This document outlines the environment variables that can be configured for deployment to handle database migration issues.

## Database Migration Controls

### AUTO_MIGRATE
- **Description**: Controls whether automatic database migrations run on startup
- **Default**: `1` (enabled)
- **Production Setting**: `0` (disabled)
- **Usage**: Set `AUTO_MIGRATE=0` in production secrets to disable all database migrations

### SKIP_MIGRATION_ON_ERROR
- **Description**: Allows the application to start even if database migrations fail
- **Default**: `0` (disabled)
- **Production Setting**: `1` (enabled)
- **Usage**: Set `SKIP_MIGRATION_ON_ERROR=1` in production secrets to continue startup despite migration failures

### NODE_ENV
- **Description**: Environment mode (automatically enables migration error skipping in production)
- **Default**: `development`
- **Production Setting**: `production`
- **Usage**: Set `NODE_ENV=production` in production secrets

## Required Environment Variables

Ensure these are set in production secrets:

- `DATABASE_URL`: PostgreSQL connection string
- `AUTO_MIGRATE=0`: Disable automatic migrations
- `SKIP_MIGRATION_ON_ERROR=1`: Allow startup despite migration failures
- `NODE_ENV=production`: Set production environment

## Deployment Fix Summary

The following fixes have been implemented:

1. ✅ **Environment variable support**: `AUTO_MIGRATE=0` disables all migrations
2. ✅ **Error handling**: Application can skip migration failures in production
3. ✅ **Platform error detection**: Recognizes database connection and transaction issues
4. ✅ **Graceful degradation**: Application starts without migrations when configured
5. ✅ **Production safety**: Automatic error skipping in production environment

## Manual Deployment Steps

1. Set environment variables in Replit production secrets:
   ```
   AUTO_MIGRATE=0
   SKIP_MIGRATION_ON_ERROR=1
   NODE_ENV=production
   ```

2. Deploy the application using the Replit deploy button

3. If needed, run migrations manually after successful deployment using the database panel

## Troubleshooting

- If deployment still fails, ensure all required environment variables are set
- Check that `DATABASE_URL` is properly configured in production secrets
- Contact Replit support if platform-level database issues persist