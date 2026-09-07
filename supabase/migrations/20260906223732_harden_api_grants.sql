-- Supabase projects may carry broad default API grants. Remove them explicitly,
-- then restore only the operations used by Pure Table. RLS remains enabled too.
revoke all on all tables in schema public from anon, authenticated;

grant select on public.businesses, public.business_branches, public.business_links, public.site_settings, public.cities to anon, authenticated;
grant select on public.user_roles, public.favorites, public.analytics_events, public.contact_messages, public.partner_leads, public.waitlist, public.admin_audit_log, public.app_config to authenticated;
grant insert, update, delete on public.businesses, public.business_branches, public.business_links, public.site_settings, public.cities, public.contact_messages, public.partner_leads, public.app_config to authenticated;
grant insert, delete on public.favorites, public.waitlist to authenticated;
grant insert on public.contact_messages, public.partner_leads, public.waitlist to anon;
grant insert on public.admin_audit_log to authenticated;

revoke select on public.site_settings from anon, authenticated;
grant select (id, theme, content, sections, layout, created_at, updated_at)
on public.site_settings to anon, authenticated;
