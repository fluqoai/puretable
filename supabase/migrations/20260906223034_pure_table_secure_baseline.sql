-- Pure Table clean baseline. No legacy data is seeded by this migration.
create extension if not exists pgcrypto with schema extensions;

create type public.app_role as enum ('admin', 'moderator', 'user');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.user_roles where user_id = _user_id and role = _role) $$;
revoke all on function public.has_role(uuid, public.app_role) from public, anon;
grant execute on function public.has_role(uuid, public.app_role) to authenticated, service_role;

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = ''
as $$ begin new.updated_at = now(); return new; end $$;
revoke all on function public.set_updated_at() from public, anon, authenticated;

create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name text not null check (length(name) between 1 and 200),
  name_ar text,
  category text not null check (category ~ '^[a-z_]+$|^cf_[a-z0-9-]+$'),
  categories text[] not null default '{}',
  safety text not null default 'red' check (safety in ('green', 'red', 'none')),
  region text,
  city text not null,
  cities text[] not null default '{}',
  city_ar text,
  district text,
  district_ar text,
  address text,
  address_ar text,
  lat double precision check (lat is null or lat between -90 and 90),
  lng double precision check (lng is null or lng between -180 and 180),
  phone text,
  whatsapp text,
  instagram text,
  website text,
  maps_url text,
  cover_url text,
  photos text[] not null default '{}',
  description text,
  description_ar text,
  products text,
  products_ar text,
  hours jsonb not null default '{}',
  plan text not null default 'free' check (plan in ('free', 'pro', 'premium')),
  offers_booking boolean not null default false,
  discount_code text check (discount_code is null or length(discount_code) <= 80),
  verified boolean not null default false,
  dedicated_gf boolean not null default false,
  shared_kitchen boolean not null default false,
  precautions_note text,
  no_location boolean not null default false,
  published boolean not null default true,
  needs_review boolean not null default false,
  review_notes text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index businesses_listing_idx on public.businesses (published, plan, created_at desc);
create index businesses_category_idx on public.businesses (category) where published;
create index businesses_city_district_idx on public.businesses (lower(city), lower(district)) where published;
create index businesses_location_idx on public.businesses (lat, lng) where published and lat is not null and lng is not null;
create trigger businesses_set_updated_at before update on public.businesses
for each row execute function public.set_updated_at();

create table public.business_branches (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  place_id text,
  name text not null,
  name_ar text,
  address text,
  address_ar text,
  city text,
  city_ar text,
  district text,
  district_ar text,
  region text,
  lat double precision check (lat is null or lat between -90 and 90),
  lng double precision check (lng is null or lng between -180 and 180),
  maps_url text,
  phone text,
  whatsapp text,
  hours jsonb not null default '{}',
  sort_order integer not null default 0,
  permanently_closed boolean not null default false,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index business_branches_business_idx on public.business_branches (business_id, published, sort_order);
create index business_branches_city_district_idx on public.business_branches (lower(city), lower(district)) where published;
create unique index business_branches_place_key on public.business_branches (business_id, place_id) where place_id is not null;
create trigger business_branches_set_updated_at before update on public.business_branches
for each row execute function public.set_updated_at();

create or replace function public.enforce_branch_limit()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare v_plan text; v_limit integer; v_count integer;
begin
  if not new.published then return new; end if;
  select plan into v_plan from public.businesses where id = new.business_id for update;
  v_limit := case v_plan when 'free' then 1 when 'pro' then 3 else null end;
  if v_limit is null then return new; end if;
  select count(*) into v_count from public.business_branches
   where business_id = new.business_id and published and id <> new.id;
  if v_count >= v_limit then
    raise exception 'Branch limit reached for % plan (maximum %)', v_plan, v_limit using errcode = 'check_violation';
  end if;
  return new;
end $$;
revoke all on function public.enforce_branch_limit() from public, anon, authenticated;
create trigger enforce_branch_limit before insert or update of business_id, published on public.business_branches
for each row execute function public.enforce_branch_limit();

create or replace function public.apply_plan_branch_limit()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare v_limit integer;
begin
  if new.plan = old.plan then return new; end if;
  v_limit := case new.plan when 'free' then 1 when 'pro' then 3 else null end;
  if v_limit is not null then
    update public.business_branches set published = false
    where business_id = new.id and published and id not in (
      select id from public.business_branches where business_id = new.id and published
      order by sort_order, created_at, id limit v_limit
    );
  end if;
  return new;
end $$;
revoke all on function public.apply_plan_branch_limit() from public, anon, authenticated;
create trigger apply_plan_branch_limit after update of plan on public.businesses
for each row execute function public.apply_plan_branch_limit();

create table public.business_links (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  branch_id uuid references public.business_branches(id) on delete cascade,
  platform text not null check (platform in ('hungerstation','jahez','thechefz','toyou','keeta','requeue','mytable','website','instagram','x','tiktok','snapchat','facebook','whatsapp','email','maps','phone')),
  label text,
  url text not null check (length(url) between 1 and 2000),
  product_name text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index business_links_business_idx on public.business_links (business_id, sort_order);
create index business_links_branch_idx on public.business_links (branch_id) where branch_id is not null;

create table public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, business_id)
);
create index favorites_business_idx on public.favorites (business_id, created_at desc);

create table public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (length(event_type) between 1 and 40),
  business_id uuid references public.businesses(id) on delete set null,
  link_id uuid references public.business_links(id) on delete set null,
  platform text check (platform is null or length(platform) <= 60),
  label text check (label is null or length(label) <= 200),
  path text check (path is null or length(path) <= 500),
  visitor_id text check (visitor_id is null or length(visitor_id) <= 64),
  session_id text check (session_id is null or length(session_id) <= 64),
  city text,
  query text check (query is null or length(query) <= 200),
  is_admin boolean not null default false,
  metadata jsonb not null default '{}',
  referrer text check (referrer is null or length(referrer) <= 400),
  user_agent text check (user_agent is null or length(user_agent) <= 400),
  created_at timestamptz not null default now()
);
create index analytics_events_created_idx on public.analytics_events (created_at desc);
create index analytics_events_type_created_idx on public.analytics_events (event_type, created_at desc);
create index analytics_events_business_created_idx on public.analytics_events (business_id, created_at desc) where business_id is not null;
create index analytics_events_link_created_idx on public.analytics_events (link_id, created_at desc) where link_id is not null;

create table public.site_settings (
  id text primary key default 'default',
  theme jsonb not null default '{}',
  content jsonb not null default '{}',
  sections jsonb not null default '{}',
  layout jsonb not null default '{}',
  draft jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger site_settings_set_updated_at before update on public.site_settings
for each row execute function public.set_updated_at();
insert into public.site_settings (id) values ('default');

create table public.cities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  name_ar text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create unique index cities_name_key on public.cities (lower(name));

create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  subject text,
  message text not null,
  read boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger contact_messages_set_updated_at before update on public.contact_messages
for each row execute function public.set_updated_at();

create table public.partner_leads (
  id uuid primary key default gen_random_uuid(),
  business_name text not null,
  business_type text,
  city text,
  contact_name text,
  phone text,
  email text,
  website text,
  instagram text,
  notes text,
  status text not null default 'new' check (status in ('new','contacted','interested','agreed','not_interested')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger partner_leads_set_updated_at before update on public.partner_leads
for each row execute function public.set_updated_at();

create table public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  city text,
  source text,
  created_at timestamptz not null default now()
);
create unique index waitlist_email_key on public.waitlist (lower(email));

create table public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  user_email text,
  action text not null,
  entity text,
  entity_id text,
  entity_label text,
  details jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index admin_audit_log_created_idx on public.admin_audit_log (created_at desc);
create index admin_audit_log_user_idx on public.admin_audit_log (user_id, created_at desc) where user_id is not null;

create table public.app_config (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);
create trigger app_config_set_updated_at before update on public.app_config
for each row execute function public.set_updated_at();

-- Row-level security is mandatory on every exposed table.
alter table public.user_roles enable row level security;
alter table public.businesses enable row level security;
alter table public.business_branches enable row level security;
alter table public.business_links enable row level security;
alter table public.favorites enable row level security;
alter table public.analytics_events enable row level security;
alter table public.site_settings enable row level security;
alter table public.cities enable row level security;
alter table public.contact_messages enable row level security;
alter table public.partner_leads enable row level security;
alter table public.waitlist enable row level security;
alter table public.admin_audit_log enable row level security;
alter table public.app_config enable row level security;

create policy user_roles_own_read on public.user_roles for select to authenticated
using ((select auth.uid()) = user_id);
create policy user_roles_admin_all on public.user_roles for all to authenticated
using ((select public.has_role((select auth.uid()), 'admin'))) with check ((select public.has_role((select auth.uid()), 'admin')));

create policy businesses_public_read on public.businesses for select to anon using (published);
create policy businesses_authenticated_read on public.businesses for select to authenticated
using (published or (select public.has_role((select auth.uid()), 'admin')));
create policy businesses_admin_write on public.businesses for all to authenticated
using ((select public.has_role((select auth.uid()), 'admin'))) with check ((select public.has_role((select auth.uid()), 'admin')));

create policy branches_public_read on public.business_branches for select to anon
using (published and exists (select 1 from public.businesses b where b.id = business_id and b.published));
create policy branches_authenticated_read on public.business_branches for select to authenticated
using ((published and exists (select 1 from public.businesses b where b.id = business_id and b.published)) or (select public.has_role((select auth.uid()), 'admin')));
create policy branches_admin_write on public.business_branches for all to authenticated
using ((select public.has_role((select auth.uid()), 'admin'))) with check ((select public.has_role((select auth.uid()), 'admin')));

create policy links_public_read on public.business_links for select to anon
using (exists (select 1 from public.businesses b where b.id = business_id and b.published and b.plan in ('pro','premium')));
create policy links_authenticated_read on public.business_links for select to authenticated
using (exists (select 1 from public.businesses b where b.id = business_id and b.published and b.plan in ('pro','premium')) or (select public.has_role((select auth.uid()), 'admin')));
create policy links_admin_write on public.business_links for all to authenticated
using ((select public.has_role((select auth.uid()), 'admin'))) with check ((select public.has_role((select auth.uid()), 'admin')));

create policy favorites_own_read on public.favorites for select to authenticated using ((select auth.uid()) = user_id);
create policy favorites_own_insert on public.favorites for insert to authenticated with check ((select auth.uid()) = user_id);
create policy favorites_own_delete on public.favorites for delete to authenticated using ((select auth.uid()) = user_id);

create policy site_settings_public_read on public.site_settings for select to anon, authenticated using (true);
create policy site_settings_admin_write on public.site_settings for all to authenticated
using ((select public.has_role((select auth.uid()), 'admin'))) with check ((select public.has_role((select auth.uid()), 'admin')));
create policy cities_public_read on public.cities for select to anon, authenticated using (true);
create policy cities_admin_write on public.cities for all to authenticated
using ((select public.has_role((select auth.uid()), 'admin'))) with check ((select public.has_role((select auth.uid()), 'admin')));

create policy contact_public_insert on public.contact_messages for insert to anon, authenticated
with check (length(name) between 1 and 120 and length(message) between 1 and 4000 and (email is null or length(email) <= 255) and (subject is null or length(subject) <= 200) and not read);
create policy contact_admin_all on public.contact_messages for all to authenticated
using ((select public.has_role((select auth.uid()), 'admin'))) with check ((select public.has_role((select auth.uid()), 'admin')));

create policy partner_public_insert on public.partner_leads for insert to anon, authenticated
with check (length(business_name) between 1 and 160 and status = 'new' and (notes is null or length(notes) <= 2000));
create policy partner_admin_all on public.partner_leads for all to authenticated
using ((select public.has_role((select auth.uid()), 'admin'))) with check ((select public.has_role((select auth.uid()), 'admin')));
create policy waitlist_public_insert on public.waitlist for insert to anon, authenticated
with check (length(email) between 3 and 255 and email like '%@%' and (city is null or length(city) <= 80) and (source is null or length(source) <= 80));
create policy waitlist_admin_read on public.waitlist for select to authenticated using ((select public.has_role((select auth.uid()), 'admin')));
create policy waitlist_admin_delete on public.waitlist for delete to authenticated using ((select public.has_role((select auth.uid()), 'admin')));

create policy audit_admin_read on public.admin_audit_log for select to authenticated using ((select public.has_role((select auth.uid()), 'admin')));
create policy audit_admin_insert on public.admin_audit_log for insert to authenticated
with check ((select public.has_role((select auth.uid()), 'admin')) and (select auth.uid()) = user_id);
create policy app_config_admin_all on public.app_config for all to authenticated
using ((select public.has_role((select auth.uid()), 'admin'))) with check ((select public.has_role((select auth.uid()), 'admin')));

-- Least-privilege table grants; analytics writes remain server-only.
revoke all on all tables in schema public from anon, authenticated;
grant select on public.businesses, public.business_branches, public.business_links, public.site_settings, public.cities to anon, authenticated;
grant select on public.user_roles, public.favorites, public.analytics_events, public.contact_messages, public.partner_leads, public.waitlist, public.admin_audit_log, public.app_config to authenticated;
grant insert, update, delete on public.businesses, public.business_branches, public.business_links, public.site_settings, public.cities, public.contact_messages, public.partner_leads, public.app_config to authenticated;
grant insert, delete on public.favorites, public.waitlist to authenticated;
grant insert on public.contact_messages, public.partner_leads, public.waitlist to anon;
grant insert on public.admin_audit_log to authenticated;
grant all on all tables in schema public to service_role;
revoke select on public.site_settings from anon, authenticated;
grant select (id, theme, content, sections, layout, created_at, updated_at) on public.site_settings to anon, authenticated;

create or replace function public.claim_admin_role()
returns boolean language plpgsql security definer set search_path = ''
as $$
declare v_email text;
begin
  if auth.uid() is null then return false; end if;
  select lower(email) into v_email from auth.users where id = auth.uid();
  if v_email is null or v_email not in ('renadalharbi648@gmail.com', 'remasalharbi26@gmail.com') then
    return public.has_role(auth.uid(), 'admin');
  end if;
  insert into public.user_roles (user_id, role) values (auth.uid(), 'admin') on conflict do nothing;
  return true;
end $$;
revoke all on function public.claim_admin_role() from public, anon;
grant execute on function public.claim_admin_role() to authenticated;

create or replace function public.get_site_draft()
returns jsonb language sql stable security definer set search_path = ''
as $$ select case when public.has_role(auth.uid(), 'admin') then (select draft from public.site_settings where id = 'default') else null end $$;
revoke all on function public.get_site_draft() from public, anon;
grant execute on function public.get_site_draft() to authenticated;

create or replace function public.business_report(_business_id uuid, _since timestamptz)
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare result jsonb;
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'Forbidden'; end if;
  with ev as (
    select * from public.analytics_events where not is_admin and business_id = _business_id and (_since is null or created_at >= _since)
  ), daily as (
    select (created_at at time zone 'UTC')::date d,
      count(*) filter (where event_type = 'page_view') views,
      count(*) filter (where event_type like 'click%') clicks from ev group by 1
  )
  select jsonb_build_object(
    'impressions', count(*) filter (where event_type = 'impression'),
    'views', count(*) filter (where event_type = 'page_view'),
    'maps', count(*) filter (where event_type = 'click_maps'),
    'delivery', count(*) filter (where event_type = 'click_delivery'),
    'booking', count(*) filter (where event_type = 'click_booking'),
    'whatsapp', count(*) filter (where event_type = 'click_whatsapp'),
    'website', count(*) filter (where event_type = 'click_website'),
    'phone', count(*) filter (where event_type = 'click_phone'),
    'social', count(*) filter (where event_type = 'click_social'),
    'favorites', (select count(*) from public.favorites where business_id = _business_id and (_since is null or created_at >= _since)),
    'timeseries', (select coalesce(jsonb_agg(jsonb_build_object('date', to_char(d,'YYYY-MM-DD'), 'views',views,'clicks',clicks) order by d), '[]') from daily)
  ) into result from ev;
  return result;
end $$;
revoke all on function public.business_report(uuid, timestamptz) from public, anon;
grant execute on function public.business_report(uuid, timestamptz) to authenticated;

create or replace function public.admin_dashboard(_since timestamptz)
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare result jsonb;
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'Forbidden'; end if;
  with ev as (select * from public.analytics_events where not is_admin),
  rng as (select * from ev where _since is null or created_at >= _since),
  vis as (select coalesce(visitor_id, session_id) v, session_id, created_at from ev where coalesce(visitor_id, session_id, '') <> ''),
  perbiz as (
    select business_id,
      count(*) filter (where event_type='page_view') views,
      count(*) filter (where event_type='impression') impressions,
      count(*) filter (where event_type='click_maps') maps,
      count(*) filter (where event_type='click_delivery') delivery,
      count(*) filter (where event_type='click_booking') booking,
      count(*) filter (where event_type='click_whatsapp') whatsapp,
      count(*) filter (where event_type='click_website') website,
      count(*) filter (where event_type='click_phone') phone,
      count(*) filter (where event_type='click_social') social,
      count(*) filter (where event_type like 'click%' and event_type not in ('click_maps','click_delivery','click_booking','click_whatsapp','click_website','click_phone','click_social')) other
    from rng where business_id is not null group by business_id
  ), daily as (
    select (created_at at time zone 'UTC')::date d, count(*) filter (where event_type='page_view') views,
      count(*) filter (where event_type like 'click%') clicks from rng group by 1
  )
  select jsonb_build_object(
    'visitors', jsonb_build_object(
      'online',(select count(distinct session_id) from ev where session_id is not null and created_at >= now()-interval '5 minutes'),
      'today',(select count(distinct v) from vis where created_at >= date_trunc('day',now())),
      'week',(select count(distinct v) from vis where created_at >= now()-interval '7 days'),
      'month',(select count(distinct v) from vis where created_at >= now()-interval '30 days'),
      'quarter',(select count(distinct v) from vis where created_at >= now()-interval '90 days'),
      'allTime',(select count(distinct v) from vis),
      'inRange',(select count(distinct visitor_id) from rng where visitor_id is not null)),
    'totals', jsonb_build_object(
      'pageViews',(select count(*) from rng where event_type='page_view'),
      'businessPageViews',(select count(*) from rng where event_type='page_view' and business_id is not null),
      'clicks',(select count(*) from rng where event_type like 'click%'),
      'uniqueVisitors',(select count(distinct visitor_id) from rng where visitor_id is not null),
      'sessions',(select count(distinct session_id) from rng where session_id is not null)),
    'businesses',(select coalesce(jsonb_agg(to_jsonb(x) order by x.views desc,x.clicks desc),'[]') from (
      select p.business_id id,b.name,b.slug,b.city,b.plan,p.*,
        (p.maps+p.delivery+p.booking+p.whatsapp+p.website+p.phone+p.social+p.other) clicks
      from perbiz p join public.businesses b on b.id=p.business_id) x),
    'deliveryLinks',(select coalesce(jsonb_agg(to_jsonb(x) order by x.count desc),'[]') from (
      select e.link_id id,count(*) count,l.platform,l.product_name product,l.url,b.name business from rng e
      join public.business_links l on l.id=e.link_id join public.businesses b on b.id=l.business_id
      where e.link_id is not null and e.event_type like 'click%' group by e.link_id,l.platform,l.product_name,l.url,b.name) x),
    'filters',(select coalesce(jsonb_agg(to_jsonb(x) order by x.count desc),'[]') from (select label,count(*) count from rng where event_type in ('filter','filter_click') and label is not null group by label limit 25) x),
    'mainFilters',(select coalesce(jsonb_agg(to_jsonb(x) order by x.count desc),'[]') from (select label,count(*) count from rng where event_type in ('filter','filter_click') and label is not null and platform is distinct from 'secondary' group by label limit 25) x),
    'secondaryFilters',(select coalesce(jsonb_agg(to_jsonb(x) order by x.count desc),'[]') from (select label,count(*) count from rng where event_type in ('filter','filter_click') and label is not null and platform='secondary' group by label limit 25) x),
    'searches',(select coalesce(jsonb_agg(to_jsonb(x) order by x.count desc),'[]') from (select lower(btrim(query)) term,count(*) count from rng where event_type='search' and btrim(coalesce(query,''))<>'' group by 1 limit 25) x),
    'platforms',(select coalesce(jsonb_agg(to_jsonb(x) order by x.count desc),'[]') from (select platform,count(*) count from rng where event_type like 'click%' and platform is not null group by platform limit 25) x),
    'cities',(select coalesce(jsonb_agg(to_jsonb(x) order by x.count desc),'[]') from (select city,count(*) count from rng where event_type='page_view' and city is not null group by city limit 12) x),
    'timeseries',(select coalesce(jsonb_agg(jsonb_build_object('date',to_char(d,'YYYY-MM-DD'),'views',views,'clicks',clicks) order by d),'[]') from daily)
  ) into result;
  return result;
end $$;
revoke all on function public.admin_dashboard(timestamptz) from public, anon;
grant execute on function public.admin_dashboard(timestamptz) to authenticated;

-- Private storage: the app issues short-lived signed upload/read URLs server-side.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('business-covers', 'business-covers', false, 10485760, array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
