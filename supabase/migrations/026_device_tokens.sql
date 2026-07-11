-- 026: Device push tokens for the mobile app (Capacitor push notifications).
--
-- Stores APNs/FCM tokens so the backend can send order/message push to a user's
-- devices. Populated by the native app via /api/push/register. Harmless on web
-- (the table just stays empty until the mobile app is live).

create table if not exists device_tokens (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles(id) on delete cascade,
  token       text not null unique,
  platform    text check (platform in ('ios', 'android', 'web')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_device_tokens_user_id on device_tokens(user_id);

alter table device_tokens enable row level security;

-- A user can see/manage their own device tokens. Registration goes through the
-- service role (upsert on token) so a device that changes hands re-points to the
-- new owner.
create policy "device_tokens: user owns"
  on device_tokens for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
