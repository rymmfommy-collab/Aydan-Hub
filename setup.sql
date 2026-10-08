-- Aydan Hub: run this once in Supabase -> SQL Editor.
-- BEFORE RUNNING: replace YOUR_EMAIL_HERE (appears 4 times) with the email of the
-- admin account you create in Supabase -> Authentication -> Users.

-- 1) Photo bucket: public to read, 5 MB limit, images only
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', true, 5242880, array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do update
  set public = true,
      file_size_limit = 5242880,
      allowed_mime_types = array['image/jpeg','image/png','image/webp','image/gif'];

-- 2) Table rules: everyone can read, only the admin email can write
alter table public.files enable row level security;

-- remove any old policies on the table (including ones that let the public write)
do $$
declare p record;
begin
  for p in select policyname from pg_policies where schemaname = 'public' and tablename = 'files'
  loop
    execute format('drop policy %I on public.files', p.policyname);
  end loop;
end $$;

create policy "Anyone can read files"
  on public.files for select
  using (true);

create policy "Admin can insert files"
  on public.files for insert
  to authenticated
  with check ((auth.jwt() ->> 'email') = 'rymmfommy@gmail.com');

create policy "Admin can update files"
  on public.files for update
  to authenticated
  using ((auth.jwt() ->> 'email') = 'rymmfommy@gmail.com')
  with check ((auth.jwt() ->> 'email') = 'rymmfommy@gmail.com');

create policy "Admin can delete files"
  on public.files for delete
  to authenticated
  using ((auth.jwt() ->> 'email') = 'rymmfommy@gmail.com');

-- 3) Storage rules for the photos bucket: only the admin email can upload or delete
drop policy if exists "Admin can upload photos" on storage.objects;
drop policy if exists "Admin can delete photos" on storage.objects;

create policy "Admin can upload photos"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'photos' and (auth.jwt() ->> 'email') = 'rymmfommy@gmail.com');

create policy "Admin can delete photos"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'photos' and (auth.jwt() ->> 'email') = 'rymmfommy@gmail.com');
