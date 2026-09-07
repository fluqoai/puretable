-- Make first-party analytics idempotent and include durable favourite activity.
alter table public.analytics_events
  add column if not exists dedupe_key text
  check (dedupe_key is null or length(dedupe_key) between 16 and 128);

create unique index if not exists analytics_events_dedupe_key
  on public.analytics_events (dedupe_key);

create or replace function public.log_favorite_analytics()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.analytics_events (
      event_type, business_id, is_admin, metadata, dedupe_key, created_at
    ) values (
      'favorite_add', new.business_id,
      coalesce(public.has_role(auth.uid(), 'admin'), false),
      jsonb_build_object('source', 'favorites_trigger'),
      'favorite-add:' || new.id::text, new.created_at
    ) on conflict (dedupe_key) do nothing;
    return new;
  end if;

  insert into public.analytics_events (
    event_type, business_id, is_admin, metadata, dedupe_key
  ) values (
    'favorite_remove', old.business_id,
    coalesce(public.has_role(auth.uid(), 'admin'), false),
    jsonb_build_object('source', 'favorites_trigger'),
    'favorite-remove:' || old.id::text
  ) on conflict (dedupe_key) do nothing;
  return old;
end
$$;

revoke all on function public.log_favorite_analytics() from public, anon, authenticated;

drop trigger if exists favorites_log_analytics on public.favorites;
create trigger favorites_log_analytics
after insert or delete on public.favorites
for each row execute function public.log_favorite_analytics();

-- Preserve the creation date of favourites that existed before event tracking.
insert into public.analytics_events (
  event_type, business_id, is_admin, metadata, dedupe_key, created_at
)
select
  'favorite_add', f.business_id, false,
  jsonb_build_object('source', 'favorites_backfill'),
  'favorite-add:' || f.id::text, f.created_at
from public.favorites f
on conflict (dedupe_key) do nothing;

create or replace function public.business_report(_business_id uuid, _since timestamptz)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare result jsonb;
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'Forbidden'; end if;
  with ev as (
    select *
    from public.analytics_events
    where not is_admin
      and business_id = _business_id
      and (_since is null or created_at >= _since)
  ), daily as (
    select
      (created_at at time zone 'Asia/Riyadh')::date d,
      count(*) filter (where event_type = 'page_view') views,
      count(*) filter (where event_type like 'click%') clicks
    from ev
    group by 1
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
    'contactClicks', count(*) filter (
      where event_type in ('click_whatsapp', 'click_website', 'click_phone')
    ),
    'favorites', count(*) filter (where event_type = 'favorite_add'),
    'timeseries', (
      select coalesce(
        jsonb_agg(
          jsonb_build_object('date', to_char(d, 'YYYY-MM-DD'), 'views', views, 'clicks', clicks)
          order by d
        ), '[]'
      )
      from daily
    )
  ) into result
  from ev;
  return result;
end
$$;

revoke all on function public.business_report(uuid, timestamptz) from public, anon;
grant execute on function public.business_report(uuid, timestamptz) to authenticated;

create or replace function public.admin_dashboard(_since timestamptz)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare result jsonb;
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'Forbidden'; end if;
  with ev as (
    select * from public.analytics_events where not is_admin
  ), rng as (
    select * from ev where _since is null or created_at >= _since
  ), vis as (
    select coalesce(visitor_id, session_id) v, session_id, created_at
    from ev
    where coalesce(visitor_id, session_id, '') <> ''
  ), perbiz as (
    select
      business_id,
      count(*) filter (where event_type = 'page_view') views,
      count(*) filter (where event_type = 'impression') impressions,
      count(*) filter (where event_type = 'click_maps') maps,
      count(*) filter (where event_type = 'click_delivery') delivery,
      count(*) filter (where event_type = 'click_booking') booking,
      count(*) filter (where event_type = 'click_whatsapp') whatsapp,
      count(*) filter (where event_type = 'click_website') website,
      count(*) filter (where event_type = 'click_phone') phone,
      count(*) filter (where event_type = 'click_social') social,
      count(*) filter (where event_type = 'favorite_add') favorites,
      count(*) filter (
        where event_type like 'click%'
          and event_type not in (
            'click_maps', 'click_delivery', 'click_booking', 'click_whatsapp',
            'click_website', 'click_phone', 'click_social'
          )
      ) other
    from rng
    where business_id is not null
    group by business_id
  ), daily as (
    select
      (created_at at time zone 'Asia/Riyadh')::date d,
      count(*) filter (where event_type = 'page_view') views,
      count(*) filter (where event_type like 'click%') clicks
    from rng
    group by 1
  )
  select jsonb_build_object(
    'visitors', jsonb_build_object(
      'online', (
        select count(distinct session_id) from ev
        where session_id is not null and created_at >= now() - interval '5 minutes'
      ),
      'today', (
        select count(distinct v) from vis
        where created_at >= (
          date_trunc('day', now() at time zone 'Asia/Riyadh') at time zone 'Asia/Riyadh'
        )
      ),
      'week', (select count(distinct v) from vis where created_at >= now() - interval '7 days'),
      'month', (select count(distinct v) from vis where created_at >= now() - interval '30 days'),
      'quarter', (select count(distinct v) from vis where created_at >= now() - interval '90 days'),
      'allTime', (select count(distinct v) from vis),
      'inRange', (select count(distinct visitor_id) from rng where visitor_id is not null)
    ),
    'totals', jsonb_build_object(
      'pageViews', (select count(*) from rng where event_type = 'page_view'),
      'businessPageViews', (
        select count(*) from rng where event_type = 'page_view' and business_id is not null
      ),
      'clicks', (select count(*) from rng where event_type like 'click%'),
      'uniqueVisitors', (select count(distinct visitor_id) from rng where visitor_id is not null),
      'sessions', (select count(distinct session_id) from rng where session_id is not null)
    ),
    'businesses', (
      select coalesce(jsonb_agg(to_jsonb(x) order by x.views desc, x.clicks desc, x.name), '[]')
      from (
        select
          b.id, b.name, b.slug, b.city, b.plan,
          coalesce(p.views, 0) views,
          coalesce(p.impressions, 0) impressions,
          coalesce(p.maps, 0) maps,
          coalesce(p.delivery, 0) delivery,
          coalesce(p.booking, 0) booking,
          coalesce(p.whatsapp, 0) whatsapp,
          coalesce(p.website, 0) website,
          coalesce(p.phone, 0) phone,
          coalesce(p.social, 0) social,
          coalesce(p.favorites, 0) favorites,
          coalesce(p.other, 0) other,
          coalesce(p.whatsapp, 0) + coalesce(p.website, 0) + coalesce(p.phone, 0) "contactClicks",
          coalesce(p.maps, 0) + coalesce(p.delivery, 0) + coalesce(p.booking, 0) +
            coalesce(p.whatsapp, 0) + coalesce(p.website, 0) + coalesce(p.phone, 0) +
            coalesce(p.social, 0) + coalesce(p.other, 0) clicks
        from public.businesses b
        left join perbiz p on p.business_id = b.id
      ) x
    ),
    'deliveryLinks', (
      select coalesce(jsonb_agg(to_jsonb(x) order by x.count desc), '[]')
      from (
        select e.link_id id, count(*) count, l.platform, l.product_name product,
          l.url, b.name business
        from rng e
        join public.business_links l on l.id = e.link_id
        join public.businesses b on b.id = l.business_id
        where e.link_id is not null and e.event_type like 'click%'
        group by e.link_id, l.platform, l.product_name, l.url, b.name
      ) x
    ),
    'filters', (
      select coalesce(jsonb_agg(to_jsonb(x) order by x.count desc), '[]')
      from (
        select label, count(*) count from rng
        where event_type in ('filter', 'filter_click') and label is not null
        group by label limit 25
      ) x
    ),
    'mainFilters', (
      select coalesce(jsonb_agg(to_jsonb(x) order by x.count desc), '[]')
      from (
        select label, count(*) count from rng
        where event_type in ('filter', 'filter_click') and label is not null
          and platform is distinct from 'secondary'
        group by label limit 25
      ) x
    ),
    'secondaryFilters', (
      select coalesce(jsonb_agg(to_jsonb(x) order by x.count desc), '[]')
      from (
        select label, count(*) count from rng
        where event_type in ('filter', 'filter_click') and label is not null and platform = 'secondary'
        group by label limit 25
      ) x
    ),
    'searches', (
      select coalesce(jsonb_agg(to_jsonb(x) order by x.count desc), '[]')
      from (
        select lower(btrim(query)) term, count(*) count from rng
        where event_type = 'search' and btrim(coalesce(query, '')) <> ''
        group by 1 limit 25
      ) x
    ),
    'platforms', (
      select coalesce(jsonb_agg(to_jsonb(x) order by x.count desc), '[]')
      from (
        select platform, count(*) count from rng
        where event_type like 'click%' and platform is not null
        group by platform limit 25
      ) x
    ),
    'cities', (
      select coalesce(jsonb_agg(to_jsonb(x) order by x.count desc), '[]')
      from (
        select city, count(*) count from rng
        where event_type = 'page_view' and city is not null
        group by city limit 12
      ) x
    ),
    'timeseries', (
      select coalesce(
        jsonb_agg(
          jsonb_build_object('date', to_char(d, 'YYYY-MM-DD'), 'views', views, 'clicks', clicks)
          order by d
        ), '[]'
      )
      from daily
    )
  ) into result;
  return result;
end
$$;

revoke all on function public.admin_dashboard(timestamptz) from public, anon;
grant execute on function public.admin_dashboard(timestamptz) to authenticated;
