-- KPrints ERP — Supabase RLS policies for auth-related tables
-- Run manually in the Supabase SQL editor after schema is applied.
-- Table/column names use snake_case (matches prisma/schema.prisma @@map / @map).
-- Hono + Prisma (service role) remains the primary authorization layer for ERP data.

-- Helper: true when JWT user is approved + active in app_users
CREATE OR REPLACE FUNCTION is_approved_active_user()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM app_users
    WHERE id = auth.uid() AND is_approved = true AND is_active = true
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- app_users: any authenticated user reads own row (pending approval screen)
CREATE POLICY app_users_select_own ON app_users
  FOR SELECT USING (auth.uid() = id);

-- app_users: approved+active users read all profiles (user management)
CREATE POLICY app_users_select_team ON app_users
  FOR SELECT USING (auth.role() = 'authenticated' AND is_approved_active_user());

-- user_invitations: block direct client access (backend uses service role)
CREATE POLICY invitations_no_direct_client ON user_invitations
  FOR ALL USING (false);

-- audit_logs: approved+active users read; inserts via service role only
CREATE POLICY audit_logs_select ON audit_logs
  FOR SELECT USING (auth.role() = 'authenticated' AND is_approved_active_user());
