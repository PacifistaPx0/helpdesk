-- Initial database setup for Help Desk System
-- This file runs automatically when PostgreSQL container starts for the first time

-- Create extensions for enhanced functionality
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";       -- UUID generation
CREATE EXTENSION IF NOT EXISTS "pg_trgm";         -- Text search optimization
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements"; -- Query performance monitoring

-- Set default timezone
SET timezone = 'UTC';

-- Create application user with proper permissions
DO $$
BEGIN
    -- Grant all privileges on the database
    EXECUTE 'GRANT ALL PRIVILEGES ON DATABASE helpdesk TO helpdesk_user';
    
    -- Grant schema permissions
    GRANT ALL ON SCHEMA public TO helpdesk_user;
    GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO helpdesk_user;
    GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO helpdesk_user;
    
    -- Set default privileges for future objects
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO helpdesk_user;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO helpdesk_user;
    
    RAISE NOTICE 'Help Desk Database initialized successfully!';
    RAISE NOTICE 'Database: helpdesk';
    RAISE NOTICE 'User: helpdesk_user';
    RAISE NOTICE 'Extensions: uuid-ossp, pg_trgm, pg_stat_statements';
    RAISE NOTICE 'Timezone: UTC';
END $$;
