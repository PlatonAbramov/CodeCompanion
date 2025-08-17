-- Performance optimization indexes
-- Critical indexes for frequently used queries

-- User projects relationship
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_projects_user_id ON user_projects(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_projects_project_id ON user_projects(project_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_projects_composite ON user_projects(user_id, project_id);

-- Expenses queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_expenses_project_id ON expenses(project_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_expenses_user_id ON expenses(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_expenses_created_at ON expenses(created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_expenses_project_created ON expenses(project_id, created_at DESC);

-- Projects queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_created_at ON projects(created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_created_by ON projects(created_by);

-- Documents queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_documents_project_id ON documents(project_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_documents_uploaded_by ON documents(uploaded_by);

-- Advances queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_advances_project_id ON advances(project_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customer_advances_project_id ON customer_advances(project_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_revenues_project_id ON revenues(project_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_owner_investments_project_id ON owner_investments(project_id);

-- Contractor relationships
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contractor_projects_project_id ON contractor_projects(project_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contractor_projects_contractor_id ON contractor_projects(contractor_id);

-- Client relationships
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_client_projects_project_id ON client_projects(project_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_client_projects_client_id ON client_projects(client_id);

-- Implementation sheets
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_implementation_sheets_project_id ON implementation_sheets(project_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_implementation_items_sheet_id ON implementation_items(sheet_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_implementation_photos_item_id ON implementation_photos(item_id);

-- Audit logs
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_project_id ON audit_logs(project_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);

-- Session management
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_login_attempts_user_id ON login_attempts(user_id);

-- Tools
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tool_movements_tool_id ON tool_movements(tool_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tool_movements_user_id ON tool_movements(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tool_movements_project_id ON tool_movements(project_id);