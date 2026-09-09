create table public.email_deliveries (
  id uuid primary key default gen_random_uuid(),
  event_key text not null unique check (char_length(event_key) between 1 and 256),
  notification_type text not null check (
    notification_type in (
      'contact_admin',
      'contact_receipt',
      'partner_admin',
      'partner_receipt',
      'waitlist_admin',
      'waitlist_receipt'
    )
  ),
  recipient text not null check (char_length(recipient) between 3 and 320),
  subject text not null check (char_length(subject) between 1 and 200),
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  provider_id text,
  error text check (error is null or char_length(error) <= 1000),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sent_at timestamptz
);

create index email_deliveries_status_created_idx
  on public.email_deliveries (status, created_at desc);

create trigger email_deliveries_set_updated_at
before update on public.email_deliveries
for each row execute function public.set_updated_at();

alter table public.email_deliveries enable row level security;
revoke all on public.email_deliveries from anon, authenticated;
grant select on public.email_deliveries to authenticated;
grant all on public.email_deliveries to service_role;

create policy email_deliveries_admin_read
on public.email_deliveries for select to authenticated
using ((select public.has_role((select auth.uid()), 'admin')));
