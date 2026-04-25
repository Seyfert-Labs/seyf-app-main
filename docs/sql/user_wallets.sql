create table if not exists user_wallets (
  id uuid primary key,
  user_id text not null unique references users(id),
  pollar_wallet_id text unique,
  stellar_public_key text unique,
  status text not null default 'provisioning' check (
    status in ('provisioning', 'active', 'error')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_wallets_user_id_idx
  on user_wallets (user_id);
