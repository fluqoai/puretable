-- Editable plan definitions. No billing, renewals or per-business feature copies.
create table public.subscription_plans (
  id text primary key check (id in ('free','pro','premium')),
  branch_limit integer check (branch_limit between 1 and 1000),
  photo_limit integer not null check (photo_limit between 1 and 100),
  description_limit integer check (description_limit between 20 and 10000),
  show_links boolean not null,
  analytics text not null check (analytics in ('none','basic','full')),
  revision integer not null default 1,
  updated_at timestamptz not null default now()
);
insert into public.subscription_plans(id,branch_limit,photo_limit,description_limit,show_links,analytics)
values ('free',1,1,160,false,'none'),('pro',3,8,null,true,'basic'),('premium',null,15,null,true,'full');

alter table public.subscription_plans enable row level security;
grant select on public.subscription_plans to anon, authenticated;
grant update(branch_limit,photo_limit,description_limit,show_links,analytics) on public.subscription_plans to authenticated;
grant all on public.subscription_plans to service_role;
create policy plans_read on public.subscription_plans for select to anon,authenticated using (true);
create policy plans_admin_update on public.subscription_plans for update to authenticated
using ((select public.has_role((select auth.uid()),'admin')))
with check ((select public.has_role((select auth.uid()),'admin')));

alter table public.businesses add constraint businesses_plan_definition_fk
  foreign key (plan) references public.subscription_plans(id);
create index if not exists businesses_plan_idx on public.businesses(plan);

create function public.version_subscription_plan() returns trigger
language plpgsql set search_path='' as $$
begin
  new.revision := old.revision + 1;
  new.updated_at := now();
  return new;
end $$;
revoke all on function public.version_subscription_plan() from public,anon,authenticated;
create trigger version_subscription_plan before update on public.subscription_plans
for each row execute function public.version_subscription_plan();

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
  if not new.published or new.permanently_closed then
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

  select branch_limit into strict v_limit from public.subscription_plans where id = v_plan;
  if v_limit is null then
    return new;
  end if;

  select count(*)
    into v_count
  from public.business_branches br
  where br.business_id = new.business_id
    and br.published
    and not br.permanently_closed
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
  select branch_limit into strict v_limit from public.subscription_plans where id = new.plan;

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
    and br.published
    and not br.permanently_closed;

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

drop trigger enforce_branch_limit on public.business_branches;
create trigger enforce_branch_limit before insert or update of business_id,published,permanently_closed
on public.business_branches for each row execute function public.enforce_branch_limit();

-- Reuse the same transaction-safe reconciliation for a plan edit and a business upgrade.
create function public.propagate_subscription_plan() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if new.branch_limit is distinct from old.branch_limit then
    -- Stable row-lock order keeps concurrent administrator updates predictable.
    perform id from public.businesses where plan=new.id order by id for update;
    update public.businesses set plan=plan where plan=new.id;
  end if;
  if auth.uid() is not null then
    insert into public.admin_audit_log(user_id,user_email,action,entity,entity_id,entity_label,details)
    values(auth.uid(),auth.jwt()->>'email','update_plan_definition','subscription_plan',new.id,new.id,
      jsonb_build_object('before',to_jsonb(old),'after',to_jsonb(new)));
  end if;
  return new;
end $$;
revoke all on function public.propagate_subscription_plan() from public,anon,authenticated;
create trigger propagate_subscription_plan after update on public.subscription_plans
for each row execute function public.propagate_subscription_plan();

-- Enforce link entitlements in the Data API, not only by hiding frontend buttons.
alter policy links_public_read on public.business_links using (
  exists(select 1 from public.businesses b join public.subscription_plans p on p.id=b.plan
    where b.id=business_id and b.published and p.show_links)
);
alter policy links_authenticated_read on public.business_links using (
  exists(select 1 from public.businesses b join public.subscription_plans p on p.id=b.plan
    where b.id=business_id and b.published and p.show_links)
  or (select public.has_role((select auth.uid()),'admin'))
);
