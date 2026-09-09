-- Member data is private; membership never grants administrative privileges.
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 100),
  city text not null default '' check (char_length(city) <= 100),
  avatar_path text check (avatar_path is null or avatar_path = id::text || '/avatar'),
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update(display_name, city, avatar_path) on public.profiles to authenticated;
grant all on public.profiles to service_role;
create policy profiles_own_read on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy profiles_own_update on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create schema if not exists private;
-- Auth invokes this trigger; it is not a callable user API.
create function private.create_member_profile() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id, display_name)
  values (new.id, left(coalesce(new.raw_user_meta_data->>'display_name',''),100));
  return new;
end;
$$;
revoke all on function private.create_member_profile() from public, anon, authenticated;
create trigger create_member_profile after insert on auth.users for each row execute function private.create_member_profile();
insert into public.profiles(id) select id from auth.users on conflict do nothing;

-- Disable legacy role claiming even for old deployed clients.
create or replace function public.claim_admin_role() returns boolean
language sql security invoker set search_path = '' as $$
  select public.has_role(auth.uid(), 'admin');
$$;
revoke all on function public.claim_admin_role() from public, anon, authenticated;
-- Only trusted server-side administration may assign roles.
revoke insert, update, delete on public.user_roles from authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('member-avatars','member-avatars',false,2097152,array['image/jpeg','image/png','image/webp']);
create policy member_avatar_read on storage.objects for select to authenticated using (bucket_id='member-avatars' and name=(select auth.uid())::text || '/avatar');
create policy member_avatar_insert on storage.objects for insert to authenticated with check (bucket_id='member-avatars' and name=(select auth.uid())::text || '/avatar');
create policy member_avatar_update on storage.objects for update to authenticated using (bucket_id='member-avatars' and name=(select auth.uid())::text || '/avatar') with check (bucket_id='member-avatars' and name=(select auth.uid())::text || '/avatar');
create policy member_avatar_delete on storage.objects for delete to authenticated using (bucket_id='member-avatars' and name=(select auth.uid())::text || '/avatar');
