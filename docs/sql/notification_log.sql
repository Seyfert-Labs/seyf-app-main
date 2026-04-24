create table if not exists notification_log (
  id uuid primary key,
  user_id text not null,
  channel text not null check (channel = 'sms'),
  event text not null check (
    event in (
      'deposit_deployed',
      'advance_confirmed',
      'withdrawal_completed',
      'withdrawal_failed',
      'kyc_approved',
      'kyc_rejected'
    )
  ),
  status text not null check (status in ('sent', 'failed', 'skipped')),
  attempt integer not null default 1,
  phone_number text,
  payload_json jsonb,
  sent_at timestamptz,
  error text,
  provider_message_id text,
  created_at timestamptz not null default now()
);

create index if not exists notification_log_user_idx
  on notification_log (user_id, created_at desc);

create index if not exists notification_log_event_idx
  on notification_log (event, created_at desc);
