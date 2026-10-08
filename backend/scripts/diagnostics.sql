-- Read-only. Run as the database owner in the trusted Studio SQL Editor.
-- Does not print keys, passwords, emails or financial records.
begin transaction read only;
select n.nspname as schema_name, c.relname as table_name, c.relrowsecurity as rls_enabled
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where (n.nspname = 'public' and c.relname in ('stores','profiles','expenses','expense_audit','device_sync'))
   or (n.nspname = 'private' and c.relname = 'sync_operations');
select schemaname, tablename, policyname, roles, cmd, qual
from pg_policies where schemaname in ('public','private')
and tablename in ('stores','profiles','expenses','expense_audit','device_sync','sync_operations');
select n.nspname as schema_name, p.proname, p.prosecdef as security_definer,
       pg_get_function_identity_arguments(p.oid) as arguments
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname in ('public','private')
and p.proname in ('admin_command','sync_expense','finish_expense_sync','apply_sync','finish_sync','is_admin','active_user','my_store');
-- The following requires migrations to have been applied; a missing table is a schema error.
select count(*) as active_admins
from public.profiles p join auth.users u on u.id = p.id
where p.role = 'admin' and p.is_active;
select count(*) as stores from public.stores;
commit;
