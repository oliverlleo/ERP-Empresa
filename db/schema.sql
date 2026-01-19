-- Schema for Personal Finance Management (PFM)

create extension if not exists pgcrypto;

-- Enums
create type account_type as enum ('bank','cash','wallet','investment','credit');
create type transaction_kind as enum ('income','expense','transfer_out','transfer_in','adjustment','refund','chargeback');
create type transaction_status as enum ('planned','posted','reconciled','canceled');
create type source_type as enum ('manual','import','rule','integration');
create type category_type as enum ('income','expense');
create type card_invoice_status as enum ('open','closed','paid','overdue');
create type recurrence_cadence as enum ('daily','weekly','monthly','yearly');
create type debt_status as enum ('active','closed','defaulted');
create type investment_movement_type as enum ('buy','sell','dividend','fee');
create type notification_channel as enum ('email','push');
create type member_role as enum ('owner','editor','viewer');

-- Base tables
create table profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  currency text not null default 'BRL',
  timezone text not null default 'America/Sao_Paulo',
  phone text,
  birth_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table institutions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  code text,
  type text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table households (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table household_members (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role member_role not null default 'viewer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (household_id, user_id)
);

create table accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  household_id uuid references households(id) on delete set null,
  institution_id uuid references institutions(id) on delete set null,
  name text not null,
  type account_type not null,
  currency text not null default 'BRL',
  opening_balance numeric(14,2) not null default 0,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table centers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table payees (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type category_type not null,
  icon text not null,
  parent_id uuid references categories(id) on delete set null,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  color text not null default '#FF6A00',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name)
);

create table rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  match_type text not null,
  pattern text not null,
  category_id uuid references categories(id) on delete set null,
  tag_ids uuid[] default '{}',
  is_active boolean not null default true,
  priority int not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  institution_id uuid references institutions(id) on delete set null,
  name text not null,
  last4 text,
  limit_amount numeric(14,2) not null default 0,
  closing_day int not null check (closing_day between 1 and 28),
  due_day int not null check (due_day between 1 and 28),
  timezone text not null default 'America/Sao_Paulo',
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table card_invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  card_id uuid not null references cards(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  closing_date date not null,
  due_date date not null,
  status card_invoice_status not null default 'open',
  amount_due numeric(14,2) not null default 0,
  amount_paid numeric(14,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid references accounts(id) on delete set null,
  card_id uuid references cards(id) on delete set null,
  invoice_id uuid references card_invoices(id) on delete set null,
  center_id uuid references centers(id) on delete set null,
  payee_id uuid references payees(id) on delete set null,
  category_id uuid references categories(id) on delete set null,
  recurrence_id uuid,
  kind transaction_kind not null,
  status transaction_status not null default 'planned',
  amount numeric(14,2) not null,
  currency text not null default 'BRL',
  exchange_rate numeric(12,6) default 1,
  fee_amount numeric(14,2) default 0,
  occurred_on date not null,
  posted_on date not null,
  description text not null,
  notes text,
  source source_type not null default 'manual',
  source_hash text,
  transfer_pair_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table transaction_splits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  transaction_id uuid not null references transactions(id) on delete cascade,
  category_id uuid references categories(id) on delete set null,
  amount numeric(14,2) not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table transaction_tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  transaction_id uuid not null references transactions(id) on delete cascade,
  tag_id uuid not null references tags(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (transaction_id, tag_id)
);

create table card_installments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  card_id uuid not null references cards(id) on delete cascade,
  transaction_id uuid not null references transactions(id) on delete cascade,
  installment_number int not null,
  total_installments int not null,
  amount numeric(14,2) not null,
  due_month int not null check (due_month between 1 and 12),
  due_year int not null,
  invoice_id uuid references card_invoices(id) on delete set null,
  created_at timestamptz not null default now()
);

create table budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid not null references categories(id) on delete cascade,
  period text not null,
  amount numeric(14,2) not null,
  alert_threshold numeric(5,2) not null default 0.8,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, category_id, period)
);

create table goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  target_amount numeric(14,2) not null,
  target_date date not null,
  current_amount numeric(14,2) not null default 0,
  account_id uuid references accounts(id) on delete set null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table debts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  principal numeric(14,2) not null,
  interest_rate numeric(6,3) not null,
  start_date date not null,
  term_months int not null,
  creditor_payee_id uuid references payees(id) on delete set null,
  account_id uuid references accounts(id) on delete set null,
  status debt_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table debt_installments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  debt_id uuid not null references debts(id) on delete cascade,
  due_date date not null,
  amount numeric(14,2) not null,
  principal_amount numeric(14,2) not null,
  interest_amount numeric(14,2) not null,
  status text not null default 'open',
  transaction_id uuid references transactions(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table investments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  institution_id uuid references institutions(id) on delete set null,
  name text not null,
  type text not null,
  account_id uuid references accounts(id) on delete set null,
  currency text not null default 'BRL',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table investment_movements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  investment_id uuid not null references investments(id) on delete cascade,
  movement_type investment_movement_type not null,
  amount numeric(14,2) not null,
  units numeric(18,6),
  price numeric(18,6),
  occurred_on date not null,
  transaction_id uuid references transactions(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table recurrences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  cadence recurrence_cadence not null,
  next_run date not null,
  last_run date,
  amount numeric(14,2) not null,
  kind transaction_kind not null,
  account_id uuid references accounts(id) on delete set null,
  category_id uuid references categories(id) on delete set null,
  payee_id uuid references payees(id) on delete set null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table attachments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  mime_type text not null,
  size int not null,
  linked_table text not null,
  linked_id uuid not null,
  created_at timestamptz not null default now()
);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  channel notification_channel not null,
  trigger text not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  table_name text not null,
  record_id uuid not null,
  action text not null,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now(),
  actor_id uuid not null
);

-- Triggers
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create or replace function log_audit()
returns trigger as $$
begin
  insert into audit_log (user_id, table_name, record_id, action, before_data, after_data, actor_id)
  values (
    coalesce(new.user_id, old.user_id),
    tg_table_name,
    coalesce(new.id, old.id),
    tg_op,
    to_jsonb(old),
    to_jsonb(new),
    auth.uid()
  );
  return new;
end;
$$ language plpgsql;

-- Updated at triggers
create trigger profiles_set_updated_at before update on profiles for each row execute function set_updated_at();
create trigger institutions_set_updated_at before update on institutions for each row execute function set_updated_at();
create trigger accounts_set_updated_at before update on accounts for each row execute function set_updated_at();
create trigger categories_set_updated_at before update on categories for each row execute function set_updated_at();
create trigger tags_set_updated_at before update on tags for each row execute function set_updated_at();
create trigger cards_set_updated_at before update on cards for each row execute function set_updated_at();
create trigger card_invoices_set_updated_at before update on card_invoices for each row execute function set_updated_at();
create trigger transactions_set_updated_at before update on transactions for each row execute function set_updated_at();
create trigger transaction_splits_set_updated_at before update on transaction_splits for each row execute function set_updated_at();
create trigger budgets_set_updated_at before update on budgets for each row execute function set_updated_at();
create trigger goals_set_updated_at before update on goals for each row execute function set_updated_at();
create trigger debts_set_updated_at before update on debts for each row execute function set_updated_at();
create trigger debt_installments_set_updated_at before update on debt_installments for each row execute function set_updated_at();
create trigger investments_set_updated_at before update on investments for each row execute function set_updated_at();
create trigger investment_movements_set_updated_at before update on investment_movements for each row execute function set_updated_at();
create trigger recurrences_set_updated_at before update on recurrences for each row execute function set_updated_at();
create trigger notifications_set_updated_at before update on notifications for each row execute function set_updated_at();
create trigger households_set_updated_at before update on households for each row execute function set_updated_at();
create trigger household_members_set_updated_at before update on household_members for each row execute function set_updated_at();

-- Audit triggers on core tables
create trigger audit_transactions after insert or update or delete on transactions for each row execute function log_audit();
create trigger audit_transaction_splits after insert or update or delete on transaction_splits for each row execute function log_audit();
create trigger audit_card_invoices after insert or update or delete on card_invoices for each row execute function log_audit();
create trigger audit_debts after insert or update or delete on debts for each row execute function log_audit();

-- Views (no frontend aggregation)
create view v_account_balances as
select
  a.id as account_id,
  a.user_id,
  a.name,
  a.currency,
  a.opening_balance + coalesce(sum(
    case
      when t.kind in ('income','transfer_in','refund') then t.amount
      when t.kind in ('expense','transfer_out','chargeback') then -t.amount
      when t.kind = 'adjustment' then t.amount
      else 0
    end
  ) filter (where t.status <> 'canceled'), 0) as balance
from accounts a
left join transactions t on t.account_id = a.id
group by a.id;

create view v_monthly_category_totals as
select
  t.user_id,
  date_trunc('month', t.posted_on)::date as month,
  coalesce(ts.category_id, t.category_id) as category_id,
  sum(
    case
      when t.kind in ('expense','transfer_out') then ts.amount * -1
      when t.kind = 'income' then ts.amount
      else 0
    end
  ) as total
from transactions t
left join transaction_splits ts on ts.transaction_id = t.id
where t.status <> 'canceled'
  and coalesce(ts.amount, t.amount) is not null
group by t.user_id, month, category_id;

create view v_cashflow_monthly as
select
  t.user_id,
  date_trunc('month', t.posted_on)::date as month,
  sum(case when t.kind = 'income' then t.amount else 0 end) as total_income,
  sum(case when t.kind in ('expense','transfer_out') then t.amount else 0 end) as total_expense,
  sum(case when t.kind = 'income' then t.amount else -t.amount end) as net
from transactions t
where t.status <> 'canceled'
group by t.user_id, month;

create view v_investment_position as
select
  i.user_id,
  i.id as investment_id,
  i.name,
  sum(case when m.movement_type in ('buy','dividend') then m.amount else -m.amount end) as position_value
from investments i
left join investment_movements m on m.investment_id = i.id
group by i.user_id, i.id;

create view v_debt_balance as
select
  d.user_id,
  d.id as debt_id,
  sum(case when di.status = 'paid' then 0 else di.amount end) as remaining
from debts d
left join debt_installments di on di.debt_id = d.id
group by d.user_id, d.id;

create view v_net_worth as
select
  u.user_id,
  coalesce(ab.total_accounts,0) + coalesce(ip.total_investments,0) - coalesce(db.total_debts,0) as net_worth
from (
  select user_id from profiles
) u
left join (
  select user_id, sum(balance) as total_accounts from v_account_balances group by user_id
) ab on ab.user_id = u.user_id
left join (
  select user_id, sum(position_value) as total_investments from v_investment_position group by user_id
) ip on ip.user_id = u.user_id
left join (
  select user_id, sum(remaining) as total_debts from v_debt_balance group by user_id
) db on db.user_id = u.user_id;

create view v_upcoming_commitments as
select
  user_id,
  due_date,
  amount,
  'debt_installment' as source
from debt_installments
where status = 'open'
union all
select
  user_id,
  make_date(due_year, due_month, 1) as due_date,
  amount,
  'card_installment' as source
from card_installments
union all
select
  user_id,
  next_run as due_date,
  amount,
  'recurrence' as source
from recurrences
where status = 'active';

create view v_card_invoice_summary as
select
  i.id as invoice_id,
  i.user_id,
  i.card_id,
  i.period_start,
  i.period_end,
  i.due_date,
  i.status,
  i.amount_due,
  i.amount_paid,
  sum(t.amount) filter (where t.kind = 'expense') as total_purchases
from card_invoices i
left join transactions t on t.invoice_id = i.id
group by i.id;

-- RPCs
create or replace function rpc_create_transaction_with_splits(
  p_account_id uuid,
  p_card_id uuid,
  p_kind transaction_kind,
  p_status transaction_status,
  p_amount numeric,
  p_occurred_on date,
  p_posted_on date,
  p_description text,
  p_category_id uuid,
  p_payee_id uuid,
  p_center_id uuid,
  p_source source_type,
  p_splits jsonb default '[]'
)
returns uuid as $$
declare
  v_transaction_id uuid;
  v_split_sum numeric := 0;
  v_split jsonb;
begin
  insert into transactions (
    user_id, account_id, card_id, kind, status, amount, occurred_on, posted_on,
    description, category_id, payee_id, center_id, source
  ) values (
    auth.uid(), p_account_id, p_card_id, p_kind, p_status, p_amount, p_occurred_on, p_posted_on,
    p_description, p_category_id, p_payee_id, p_center_id, p_source
  ) returning id into v_transaction_id;

  for v_split in select * from jsonb_array_elements(p_splits)
  loop
    insert into transaction_splits (user_id, transaction_id, category_id, amount, notes)
    values (
      auth.uid(),
      v_transaction_id,
      (v_split->>'category_id')::uuid,
      (v_split->>'amount')::numeric,
      v_split->>'notes'
    );
    v_split_sum := v_split_sum + (v_split->>'amount')::numeric;
  end loop;

  if jsonb_array_length(p_splits) > 0 and v_split_sum <> p_amount then
    raise exception 'Split total (%) does not match transaction amount (%)', v_split_sum, p_amount;
  end if;

  return v_transaction_id;
end;
$$ language plpgsql;

create or replace function rpc_make_transfer(
  p_from_account uuid,
  p_to_account uuid,
  p_amount numeric,
  p_occurred_on date,
  p_description text
)
returns uuid as $$
declare
  v_pair_id uuid := gen_random_uuid();
begin
  insert into transactions (user_id, account_id, kind, status, amount, occurred_on, posted_on, description, transfer_pair_id)
  values (auth.uid(), p_from_account, 'transfer_out', 'posted', p_amount, p_occurred_on, p_occurred_on, p_description, v_pair_id);

  insert into transactions (user_id, account_id, kind, status, amount, occurred_on, posted_on, description, transfer_pair_id)
  values (auth.uid(), p_to_account, 'transfer_in', 'posted', p_amount, p_occurred_on, p_occurred_on, p_description, v_pair_id);

  return v_pair_id;
end;
$$ language plpgsql;

create or replace function rpc_close_card_invoice(p_card_id uuid, p_closing_date date)
returns uuid as $$
declare
  v_card cards;
  v_period_start date;
  v_period_end date;
  v_due_date date;
  v_invoice_id uuid;
  v_amount numeric;
begin
  select * into v_card from cards where id = p_card_id and user_id = auth.uid();
  if not found then
    raise exception 'Card not found';
  end if;

  v_period_end := p_closing_date;
  v_period_start := (p_closing_date - interval '1 month')::date + interval '1 day';
  v_due_date := make_date(extract(year from p_closing_date)::int, extract(month from p_closing_date)::int, v_card.due_day) + interval '1 month';

  insert into card_invoices (user_id, card_id, period_start, period_end, closing_date, due_date, status)
  values (auth.uid(), p_card_id, v_period_start, v_period_end, p_closing_date, v_due_date::date, 'closed')
  returning id into v_invoice_id;

  update transactions
  set invoice_id = v_invoice_id
  where card_id = p_card_id
    and occurred_on between v_period_start and v_period_end
    and invoice_id is null;

  select coalesce(sum(amount),0) into v_amount from transactions where invoice_id = v_invoice_id and kind = 'expense';
  update card_invoices set amount_due = v_amount where id = v_invoice_id;

  return v_invoice_id;
end;
$$ language plpgsql;

create or replace function rpc_pay_card_invoice(
  p_invoice_id uuid,
  p_payment_account uuid,
  p_amount numeric,
  p_paid_on date
)
returns void as $$
declare
  v_invoice card_invoices;
begin
  select * into v_invoice from card_invoices where id = p_invoice_id and user_id = auth.uid();
  if not found then
    raise exception 'Invoice not found';
  end if;

  insert into transactions (
    user_id, account_id, kind, status, amount, occurred_on, posted_on, description
  ) values (
    auth.uid(), p_payment_account, 'expense', 'posted', p_amount, p_paid_on, p_paid_on,
    'Pagamento de fatura'
  );

  update card_invoices
  set amount_paid = amount_paid + p_amount,
      status = case when amount_paid + p_amount >= amount_due then 'paid' else status end
  where id = p_invoice_id;
end;
$$ language plpgsql;

create or replace function rpc_generate_card_installments(
  p_transaction_id uuid,
  p_total_installments int,
  p_first_due date
)
returns void as $$
declare
  v_transaction transactions;
  v_i int;
  v_amount numeric;
  v_due_date date;
begin
  select * into v_transaction from transactions where id = p_transaction_id and user_id = auth.uid();
  if not found then
    raise exception 'Transaction not found';
  end if;

  v_amount := round(v_transaction.amount / p_total_installments, 2);

  for v_i in 1..p_total_installments loop
    v_due_date := (p_first_due + (v_i - 1) * interval '1 month')::date;
    insert into card_installments (
      user_id, card_id, transaction_id, installment_number, total_installments, amount, due_month, due_year
    ) values (
      auth.uid(), v_transaction.card_id, v_transaction.id, v_i, p_total_installments, v_amount,
      extract(month from v_due_date)::int, extract(year from v_due_date)::int
    );
  end loop;
end;
$$ language plpgsql;

create or replace function rpc_generate_recurrences(p_run_date date)
returns int as $$
declare
  v_count int := 0;
  v_rec recurrences;
  v_next date;
begin
  for v_rec in select * from recurrences where user_id = auth.uid() and status = 'active' and next_run <= p_run_date
  loop
    insert into transactions (
      user_id, account_id, kind, status, amount, occurred_on, posted_on, description, category_id, payee_id, source, recurrence_id
    ) values (
      auth.uid(), v_rec.account_id, v_rec.kind, 'planned', v_rec.amount, v_rec.next_run, v_rec.next_run, v_rec.name,
      v_rec.category_id, v_rec.payee_id, 'rule', v_rec.id
    );

    if v_rec.cadence = 'monthly' then
      v_next := (v_rec.next_run + interval '1 month')::date;
    elsif v_rec.cadence = 'weekly' then
      v_next := (v_rec.next_run + interval '7 days')::date;
    elsif v_rec.cadence = 'daily' then
      v_next := (v_rec.next_run + interval '1 day')::date;
    else
      v_next := (v_rec.next_run + interval '1 year')::date;
    end if;

    update recurrences set last_run = v_rec.next_run, next_run = v_next where id = v_rec.id;
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$ language plpgsql;

create or replace function rpc_reconcile_transaction(p_transaction_id uuid)
returns void as $$
begin
  update transactions
  set status = 'reconciled'
  where id = p_transaction_id and user_id = auth.uid();
end;
$$ language plpgsql;

-- Helper: create profile on user signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (user_id, full_name, currency, timezone)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', 'Novo usuário'), 'BRL', 'America/Sao_Paulo');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function handle_new_user();

-- Indexes
create index idx_transactions_user_date on transactions (user_id, posted_on);
create index idx_transactions_account on transactions (account_id);
create index idx_splits_transaction on transaction_splits (transaction_id);
create index idx_cards_user on cards (user_id);
create index idx_invoices_card on card_invoices (card_id);
create index idx_installments_card on card_installments (card_id);
create index idx_recurring_next_run on recurrences (user_id, next_run);
