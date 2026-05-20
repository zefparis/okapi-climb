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

-- User balances + atomic adjustment RPC (used by /api/game/bet and /api/game/cashout)
create table if not exists public.balances (
  user_id uuid primary key,
  amount_cdf numeric not null default 0
);

create or replace function public.adjust_balance(
  p_user_id uuid, p_amount numeric
)
returns numeric language plpgsql as $$
declare new_bal numeric;
begin
  insert into public.balances(user_id, amount_cdf) values (p_user_id, 0)
    on conflict (user_id) do nothing;
  update public.balances
    set amount_cdf = amount_cdf + p_amount
    where user_id = p_user_id and amount_cdf + p_amount >= 0
    returning amount_cdf into new_bal;
  if new_bal is null then
    raise exception 'Insufficient balance';
  end if;
  return new_bal;
end $$;

alter table public.balances enable row level security;
