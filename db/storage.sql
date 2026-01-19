-- Storage bucket for receipts
insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', false)
on conflict do nothing;

-- Policies for receipts bucket
create policy "Receipts read" on storage.objects
for select using (
  bucket_id = 'receipts'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Receipts insert" on storage.objects
for insert with check (
  bucket_id = 'receipts'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Receipts update" on storage.objects
for update using (
  bucket_id = 'receipts'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Receipts delete" on storage.objects
for delete using (
  bucket_id = 'receipts'
  and auth.uid()::text = (storage.foldername(name))[1]
);
