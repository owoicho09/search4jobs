-- Private CV storage bucket. Objects are keyed "<user_id>/<filename>" so RLS
-- can scope access per user without a lookup table.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'cvs',
  'cvs',
  false,
  10485760, -- 10 MB
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do nothing;

create policy "cv_objects_select_own" on storage.objects
  for select using (
    bucket_id = 'cvs' and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "cv_objects_insert_own" on storage.objects
  for insert with check (
    bucket_id = 'cvs' and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "cv_objects_update_own" on storage.objects
  for update using (
    bucket_id = 'cvs' and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "cv_objects_delete_own" on storage.objects
  for delete using (
    bucket_id = 'cvs' and (storage.foldername(name))[1] = auth.uid()::text
  );
