-- Keep subscription-driven branch visibility reversible. A branch hidden by an
-- admin remains hidden; only branches hidden automatically by a plan downgrade
-- are restored when the package is upgraded later.
alter table public.business_branches
  add column if not exists plan_limited boolean not null default false;

comment on column public.business_branches.plan_limited is
  'True only when the system hid this branch because the business plan branch limit was exceeded.';

create index if not exists business_branches_plan_limited_idx
  on public.business_branches (business_id, sort_order, created_at)
  where plan_limited;

-- Reconcile legacy rows before the stricter automation is installed. Closed
-- branches and branches hidden manually are left untouched unless they are
-- beyond the active package allowance in a business that has excess branches.
with ranked as (
  select
    br.id,
    b.plan,
    row_number() over (
      partition by br.business_id
      order by br.published desc, br.sort_order, br.created_at, br.id
    ) as branch_number
  from public.business_branches br
  join public.businesses b on b.id = br.business_id
  where not br.permanently_closed
), excess as (
  select id
  from ranked
  where (plan = 'free' and branch_number > 1)
     or (plan = 'pro' and branch_number > 3)
)
update public.business_branches br
set published = false,
    plan_limited = true
where br.id in (select id from excess);

create or replace function public.enforce_branch_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_plan text;
  v_limit integer;
  v_count integer;
begin
  -- Publishing a branch is an explicit admin choice, so it is no longer marked
  -- as plan-limited once it passes the package check.
  if not new.published then
    return new;
  end if;

  new.plan_limited := false;

  select b.plan
    into v_plan
  from public.businesses b
  where b.id = new.business_id
  for update;

  if not found then
    raise exception 'Business does not exist' using errcode = 'foreign_key_violation';
  end if;

  v_limit := case v_plan when 'free' then 1 when 'pro' then 3 else null end;
  if v_limit is null then
    return new;
  end if;

  select count(*)
    into v_count
  from public.business_branches br
  where br.business_id = new.business_id
    and br.published
    and br.id <> new.id;

  if v_count >= v_limit then
    raise exception 'Branch limit reached for % plan (maximum %)', v_plan, v_limit
      using errcode = 'check_violation';
  end if;

  return new;
end
$$;

revoke all on function public.enforce_branch_limit() from public, anon, authenticated;

create or replace function public.apply_plan_branch_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_limit integer;
  v_published integer;
  v_slots integer;
begin
  if new.plan = old.plan then
    return new;
  end if;

  v_limit := case new.plan when 'free' then 1 when 'pro' then 3 else null end;

  -- Premium has no branch limit. Restore only branches hidden by an earlier
  -- downgrade; never publish branches an admin intentionally hid or closed.
  if v_limit is null then
    update public.business_branches br
       set published = true,
           plan_limited = false
     where br.business_id = new.id
       and br.plan_limited
       and not br.permanently_closed;
    return new;
  end if;

  -- On downgrade, retain the first branches in the admin-defined order and
  -- remember which remaining branches were hidden by the package rule.
  with keep as (
    select br.id
    from public.business_branches br
    where br.business_id = new.id
      and br.published
      and not br.permanently_closed
    order by br.sort_order, br.created_at, br.id
    limit v_limit
  )
  update public.business_branches br
     set published = false,
         plan_limited = true
   where br.business_id = new.id
     and br.published
     and br.id not in (select id from keep);

  -- On upgrade from Free to Pro, restore as many automatically hidden branches
  -- as the new allowance permits, in the same stable display order.
  select count(*)
    into v_published
  from public.business_branches br
  where br.business_id = new.id
    and br.published;

  v_slots := greatest(v_limit - v_published, 0);
  if v_slots > 0 then
    with restore as (
      select br.id
      from public.business_branches br
      where br.business_id = new.id
        and br.plan_limited
        and not br.permanently_closed
      order by br.sort_order, br.created_at, br.id
      limit v_slots
    )
    update public.business_branches br
       set published = true,
           plan_limited = false
     where br.id in (select id from restore);
  end if;

  return new;
end
$$;

revoke all on function public.apply_plan_branch_limit() from public, anon, authenticated;
