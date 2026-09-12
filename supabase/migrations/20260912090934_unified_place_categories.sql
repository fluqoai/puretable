-- A single, admin-managed catalogue for the two category levels shown on the
-- homepage and in the business editor. Business membership continues to use
-- businesses.categories during the compatibility migration.
create table if not exists public.place_categories (
  id uuid primary key default gen_random_uuid(),
  value text not null unique check (value ~ '^[a-z_]+$|^cf_[a-z0-9-]+$'),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name_ar text not null check (length(btrim(name_ar)) between 1 and 80),
  name_en text not null check (length(btrim(name_en)) between 1 and 80),
  description_ar text not null default '' check (length(description_ar) <= 180),
  description_en text not null default '' check (length(description_en) <= 180),
  level text not null check (level in ('main', 'sub')),
  behavior text not null default 'manual' check (behavior in ('manual', 'booking', 'featured', 'nearby')),
  icon text not null default 'tag' check (icon in ('tag','calendar','star','map-pin','truck','shopping-bag','utensils','coffee','cookie','cake','home','shopping-cart')),
  visible boolean not null default true,
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists place_categories_set_updated_at on public.place_categories;
create trigger place_categories_set_updated_at before update on public.place_categories
for each row execute function public.set_updated_at();

create index if not exists place_categories_level_order_idx
  on public.place_categories (level, sort_order, created_at);

insert into public.place_categories
  (value, slug, name_ar, name_en, description_ar, description_en, level, behavior, icon, visible, sort_order)
values
  ('near_me', 'near-me', 'بالقرب مني', 'Near me', 'اعثر على الخيارات الأقرب لموقعك', 'Find options closest to your location', 'main', 'nearby', 'map-pin', true, 10),
  ('svc_dine_in', 'dine-in', 'احجز طاولتك', 'Book a table', 'أماكن توفر حجز الطاولات', 'Places that offer table booking', 'main', 'booking', 'calendar', true, 20),
  ('featured', 'featured', 'أماكن مميزة', 'Featured places', 'اختيارات مميزة من بيور تيبل', 'Featured Pure Table picks', 'main', 'featured', 'star', true, 30),
  ('svc_delivery', 'delivery', 'توصيل', 'Delivery', 'أماكن توفر خدمة التوصيل', 'Places offering delivery', 'main', 'manual', 'truck', false, 40),
  ('svc_pickup', 'pickup', 'استلام', 'Pickup', 'اطلب واستلم من المكان', 'Order and collect from the place', 'main', 'manual', 'shopping-bag', false, 50),
  ('restaurant', 'restaurants', 'مطاعم', 'Restaurants', '', '', 'sub', 'manual', 'utensils', true, 10),
  ('cafe', 'cafes', 'مقاهي', 'Cafes', '', '', 'sub', 'manual', 'coffee', true, 20),
  ('bakery', 'bakeries', 'مخابز', 'Bakeries', '', '', 'sub', 'manual', 'cookie', true, 30),
  ('dessert', 'desserts', 'حلويات', 'Desserts', '', '', 'sub', 'manual', 'cake', true, 40),
  ('home', 'home-businesses', 'أسر منتجة', 'Home businesses', '', '', 'sub', 'manual', 'home', true, 50),
  ('supermarket', 'supermarkets', 'سوبرماركت', 'Supermarkets', '', '', 'sub', 'manual', 'shopping-cart', true, 60)
on conflict (value) do nothing;

-- Preserve custom filters that may already exist in the legacy JSON settings.
insert into public.place_categories
  (value, slug, name_ar, name_en, level, behavior, icon, visible, sort_order)
select
  'cf_' || (item->>'slug'),
  item->>'slug',
  coalesce(nullif(item->>'name_ar', ''), item->>'slug'),
  coalesce(nullif(item->>'name_en', ''), item->>'slug'),
  case when coalesce((item->>'primary')::boolean, false) then 'main' else 'sub' end,
  'manual',
  'tag',
  coalesce((item->>'visible')::boolean, true),
  100 + coalesce((item->>'order')::integer, 0)
from public.site_settings s
cross join lateral jsonb_array_elements(coalesce(s.layout->'filters', '[]'::jsonb)) item
where s.id = 'default'
  and coalesce(item->>'slug', '') ~ '^[a-z0-9-]+$'
on conflict (value) do nothing;

-- Preserve visibility choices made with the older appearance controls.
update public.place_categories c
set visible = coalesce((s.sections->>('cat_' || c.value))::boolean, c.visible)
from public.site_settings s
where s.id = 'default' and c.level = 'sub';

alter table public.place_categories enable row level security;

drop policy if exists place_categories_anon_read on public.place_categories;
create policy place_categories_anon_read on public.place_categories for select to anon
using (visible);
drop policy if exists place_categories_authenticated_read on public.place_categories;
create policy place_categories_authenticated_read on public.place_categories for select to authenticated
using (visible or (select public.has_role((select auth.uid()), 'admin')));
drop policy if exists place_categories_admin_insert on public.place_categories;
create policy place_categories_admin_insert on public.place_categories for insert to authenticated
with check ((select public.has_role((select auth.uid()), 'admin')));
drop policy if exists place_categories_admin_update on public.place_categories;
create policy place_categories_admin_update on public.place_categories for update to authenticated
using ((select public.has_role((select auth.uid()), 'admin')))
with check ((select public.has_role((select auth.uid()), 'admin')));
drop policy if exists place_categories_admin_delete on public.place_categories;
create policy place_categories_admin_delete on public.place_categories for delete to authenticated
using ((select public.has_role((select auth.uid()), 'admin')));

revoke all on public.place_categories from anon, authenticated;
grant select on public.place_categories to anon, authenticated;
grant insert, update, delete on public.place_categories to authenticated;
grant all on public.place_categories to service_role;
