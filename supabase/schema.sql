-- Okapi Climb — Supabase schema

create table if not exists public.okapi_rounds (
  id uuid primary key default gen_random_uuid(),
  crash_point decimal(10,2) not null,
  started_at timestamptz not null default now(),
  ended_at timestamptz
);

create table if not exists public.okapi_bets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  round_id uuid references public.okapi_rounds(id),
  amount_cdf decimal(15,2) not null,
  cashout_multiplier decimal(10,2),
  win_amount_cdf decimal(15,2),
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

create index if not exists okapi_bets_user_idx on public.okapi_bets(user_id);
create index if not exists okapi_bets_round_idx on public.okapi_bets(round_id);
create index if not exists okapi_rounds_started_idx on public.okapi_rounds(started_at desc);
