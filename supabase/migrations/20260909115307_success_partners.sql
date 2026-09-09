create table public.success_partners (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('business', 'external')),
  business_id uuid unique references public.businesses(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 160),
  name_ar text check (name_ar is null or char_length(name_ar) <= 160),
  logo_url text check (
    logo_url is null or (char_length(logo_url) <= 1000 and logo_url ~* '^https?://')
  ),
  link_url text check (
    link_url is null or (
      char_length(link_url) <= 1000
      and (link_url ~* '^https?://' or link_url ~ '^/business/[a-zA-Z0-9_-]+$')
    )
  ),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint success_partners_kind_business_check check (
    (kind = 'business' and business_id is not null)
    or (kind = 'external' and business_id is null)
  )
);

create index success_partners_active_created_idx
  on public.success_partners (active, created_at);

create trigger success_partners_set_updated_at
before update on public.success_partners
for each row execute function public.set_updated_at();

alter table public.success_partners enable row level security;
revoke all on public.success_partners from anon, authenticated;
grant select on public.success_partners to anon, authenticated;
grant insert, update, delete on public.success_partners to authenticated;
grant all on public.success_partners to service_role;

create policy success_partners_public_read
on public.success_partners for select to anon, authenticated
using (active);

create policy success_partners_admin_read
on public.success_partners for select to authenticated
using ((select public.has_role((select auth.uid()), 'admin')));

create policy success_partners_admin_insert
on public.success_partners for insert to authenticated
with check ((select public.has_role((select auth.uid()), 'admin')));

create policy success_partners_admin_update
on public.success_partners for update to authenticated
using ((select public.has_role((select auth.uid()), 'admin')))
with check ((select public.has_role((select auth.uid()), 'admin')));

create policy success_partners_admin_delete
on public.success_partners for delete to authenticated
using ((select public.has_role((select auth.uid()), 'admin')));

create or replace function private.sync_success_partner_business()
returns trigger language plpgsql security invoker set search_path = ''
as $$
begin
  update public.success_partners
     set name = new.name,
         name_ar = new.name_ar,
         logo_url = new.cover_url,
         link_url = '/business/' || new.slug
   where business_id = new.id;
  return new;
end;
$$;
revoke all on function private.sync_success_partner_business() from public, anon, authenticated;

create trigger sync_success_partner_from_business
after update of name, name_ar, cover_url, slug on public.businesses
for each row execute function private.sync_success_partner_business();
