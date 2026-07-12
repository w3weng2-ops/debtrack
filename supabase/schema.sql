create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.lenders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name)
);

create table if not exists public.loans (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  lender_id uuid references public.lenders(id) on delete set null,
  lender_name text not null,
  loan_name text not null,
  loan_type text not null default 'Personal Loan',
  original_amount numeric(14, 2) not null check (original_amount >= 0),
  interest_rate numeric(8, 4) not null default 0 check (interest_rate >= 0),
  estimated_interest_amount numeric(14, 2) not null default 0 check (estimated_interest_amount >= 0),
  total_loan_amount numeric(14, 2) not null check (total_loan_amount >= 0),
  installments integer not null check (installments > 0),
  monthly_payment numeric(14, 2) not null default 0 check (monthly_payment >= 0),
  start_date date not null,
  due_date date not null,
  remaining_balance numeric(14, 2) not null default 0 check (remaining_balance >= 0),
  amount_paid numeric(14, 2) not null default 0 check (amount_paid >= 0),
  progress numeric(7, 3) not null default 0 check (progress >= 0 and progress <= 100),
  status text not null default 'active' check (status in ('active', 'completed', 'overdue', 'upcoming', 'paused')),
  next_unpaid_due date,
  days_remaining integer not null default 0,
  payment_frequency text not null default 'Monthly',
  grace_period integer not null default 0 check (grace_period >= 0),
  notes text not null default '',
  completion_date timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.loan_installments (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  loan_id text not null references public.loans(id) on delete cascade,
  installment_no integer not null check (installment_no > 0),
  due_date date not null,
  expected_amount numeric(14, 2) not null check (expected_amount >= 0),
  principal numeric(14, 2) not null default 0 check (principal >= 0),
  interest numeric(14, 2) not null default 0 check (interest >= 0),
  status text not null default 'upcoming' check (status in ('upcoming', 'paid', 'late', 'missed', 'partial')),
  paid_date date,
  remaining_balance numeric(14, 2) not null default 0 check (remaining_balance >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (loan_id, installment_no)
);

create table if not exists public.payments (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  loan_id text not null references public.loans(id) on delete cascade,
  payment_date date not null,
  amount_paid numeric(14, 2) not null check (amount_paid > 0),
  principal_paid numeric(14, 2) not null default 0 check (principal_paid >= 0),
  interest_paid numeric(14, 2) not null default 0 check (interest_paid >= 0),
  remaining_balance numeric(14, 2) not null default 0 check (remaining_balance >= 0),
  reference_number text,
  payment_method text not null default 'Bank Transfer',
  recorded_by text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.activity_logs (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  loan_id text references public.loans(id) on delete set null,
  type text not null check (
    type in (
      'loan_created',
      'loan_updated',
      'payment_added',
      'loan_completed',
      'loan_deleted',
      'notes_updated'
    )
  ),
  description text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  loan_id text references public.loans(id) on delete cascade,
  title text not null,
  message text not null,
  severity text not null default 'info' check (severity in ('info', 'success', 'warning', 'danger')),
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists lenders_user_name_idx on public.lenders(user_id, name);
create index if not exists loans_user_status_idx on public.loans(user_id, status);
create index if not exists loans_user_due_idx on public.loans(user_id, due_date);
create index if not exists loans_user_lender_idx on public.loans(user_id, lender_name);
create index if not exists installments_user_due_idx on public.loan_installments(user_id, due_date, status);
create index if not exists payments_user_date_idx on public.payments(user_id, payment_date desc);
create index if not exists activity_user_date_idx on public.activity_logs(user_id, created_at desc);
create index if not exists notifications_user_read_idx on public.notifications(user_id, is_read, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists users_set_updated_at on public.users;
create trigger users_set_updated_at
before update on public.users
for each row execute function public.set_updated_at();

drop trigger if exists lenders_set_updated_at on public.lenders;
create trigger lenders_set_updated_at
before update on public.lenders
for each row execute function public.set_updated_at();

drop trigger if exists loans_set_updated_at on public.loans;
create trigger loans_set_updated_at
before update on public.loans
for each row execute function public.set_updated_at();

drop trigger if exists installments_set_updated_at on public.loan_installments;
create trigger installments_set_updated_at
before update on public.loan_installments
for each row execute function public.set_updated_at();

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, display_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)))
  on conflict (id) do update
    set email = excluded.email,
        display_name = excluded.display_name,
        updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

alter table public.users enable row level security;
alter table public.lenders enable row level security;
alter table public.loans enable row level security;
alter table public.loan_installments enable row level security;
alter table public.payments enable row level security;
alter table public.activity_logs enable row level security;
alter table public.notifications enable row level security;

create policy "Users can read themselves" on public.users
  for select using (id = auth.uid());
create policy "Users can update themselves" on public.users
  for update using (id = auth.uid()) with check (id = auth.uid());

create policy "Users manage own lenders" on public.lenders
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "Users manage own loans" on public.loans
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "Users manage own installments" on public.loan_installments
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "Users manage own payments" on public.payments
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "Users manage own activity logs" on public.activity_logs
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "Users manage own notifications" on public.notifications
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
