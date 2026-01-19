-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- PROFILES (Users)
create table profiles (
  id uuid references auth.users not null primary key,
  email text,
  full_name text,
  currency text default 'BRL',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table profiles enable row level security;
create policy "Users can view own profile" on profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);

-- ACCOUNTS (Bank, Wallet, etc.)
create table accounts (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  name text not null,
  type text not null check (type in ('CHECKING', 'SAVINGS', 'WALLET', 'INVESTMENT')),
  initial_balance numeric(12,2) default 0,
  current_balance numeric(12,2) default 0, -- Denormalized for performance, updated via trigger
  color text default '#000000',
  is_archived boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table accounts enable row level security;
create policy "Users can crud own accounts" on accounts for all using (auth.uid() = user_id);

-- CREDIT CARDS
create table credit_cards (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  name text not null,
  limit_amount numeric(12,2) default 0,
  closing_day integer not null check (closing_day between 1 and 31),
  due_day integer not null check (due_day between 1 and 31),
  brand text, -- Visa, Mastercard
  color text default '#000000',
  is_archived boolean default false,
  created_at timestamptz default now()
);
alter table credit_cards enable row level security;
create policy "Users can crud own cards" on credit_cards for all using (auth.uid() = user_id);

-- CATEGORIES
create table categories (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  name text not null,
  icon text, -- Phosphor icon name
  type text not null check (type in ('INCOME', 'EXPENSE')),
  color text default '#000000',
  created_at timestamptz default now()
);
alter table categories enable row level security;
create policy "Users can crud own categories" on categories for all using (auth.uid() = user_id);

-- PAYEES / FAVORECIDOS
create table payees (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  name text not null,
  created_at timestamptz default now()
);
alter table payees enable row level security;
create policy "Users can crud own payees" on payees for all using (auth.uid() = user_id);

-- TAGS
create table tags (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  name text not null,
  color text default '#000000',
  created_at timestamptz default now()
);
alter table tags enable row level security;
create policy "Users can crud own tags" on tags for all using (auth.uid() = user_id);

-- TRANSACTIONS (The Core)
create table transactions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  account_id uuid references accounts(id), -- Null if it's a credit card transaction not yet paid
  card_id uuid references credit_cards(id), -- Null if cash/debit
  category_id uuid references categories(id),
  payee_id uuid references payees(id),
  description text not null,
  amount numeric(12,2) not null, -- Positive for Income, Negative for Expense
  type text not null check (type in ('INCOME', 'EXPENSE', 'TRANSFER')),
  status text not null default 'CONFIRMED' check (status in ('PENDING', 'CONFIRMED', 'CANCELLED')),
  date date not null,
  competence_date date, -- Data de competência

  -- Transfer specifics
  transfer_account_id uuid references accounts(id), -- Target account if transfer

  -- Installments
  installment_number int,
  installment_total int,
  parent_transaction_id uuid references transactions(id), -- For recurring or installments

  attachments text[], -- Array of storage paths

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table transactions enable row level security;
create policy "Users can crud own transactions" on transactions for all using (auth.uid() = user_id);

-- TRANSACTION SPLITS (One transaction, multiple categories)
create table transaction_splits (
  id uuid default uuid_generate_v4() primary key,
  transaction_id uuid references transactions(id) on delete cascade not null,
  category_id uuid references categories(id) not null,
  amount numeric(12,2) not null
);
alter table transaction_splits enable row level security;
create policy "Users can crud own splits" on transaction_splits for all using (
  exists (select 1 from transactions t where t.id = transaction_splits.transaction_id and t.user_id = auth.uid())
);

-- INVOICES (Credit Card Bills)
-- This table is strictly managed by logic/triggers usually, or manually generated
create table invoices (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  card_id uuid references credit_cards(id) not null,
  month int not null,
  year int not null,
  amount numeric(12,2) default 0,
  status text default 'OPEN' check (status in ('OPEN', 'CLOSED', 'PAID')),
  due_date date not null,
  closing_date date not null,
  created_at timestamptz default now()
);
alter table invoices enable row level security;
create policy "Users can crud own invoices" on invoices for all using (auth.uid() = user_id);

-- CARD INSTALLMENTS (Future Parcels)
create table card_installments (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  transaction_id uuid references transactions(id),
  card_id uuid references credit_cards(id),
  amount numeric(12,2) not null,
  month int not null,
  year int not null,
  status text default 'PENDING',
  created_at timestamptz default now()
);
alter table card_installments enable row level security;
create policy "Users can crud own card installments" on card_installments for all using (auth.uid() = user_id);


-- BUDGETS (Orçamentos)
create table budgets (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  category_id uuid references categories(id),
  amount numeric(12,2) not null,
  period text default 'MONTHLY', -- Monthly
  created_at timestamptz default now()
);
alter table budgets enable row level security;
create policy "Users can crud own budgets" on budgets for all using (auth.uid() = user_id);

-- GOALS (Metas)
create table goals (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  name text not null,
  target_amount numeric(12,2) not null,
  current_amount numeric(12,2) default 0,
  deadline date,
  color text default '#FF6A00',
  created_at timestamptz default now()
);
alter table goals enable row level security;
create policy "Users can crud own goals" on goals for all using (auth.uid() = user_id);

-- DEBTS & LOANS
create table debts (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  name text not null,
  total_amount numeric(12,2) not null,
  remaining_amount numeric(12,2) not null,
  interest_rate numeric(5,2) default 0,
  due_day int,
  type text check (type in ('LOAN', 'DEBT')), -- Empréstimo (Peguei) vs Dívida (Devo)
  created_at timestamptz default now()
);
alter table debts enable row level security;
create policy "Users can crud own debts" on debts for all using (auth.uid() = user_id);

create table debt_installments (
  id uuid default uuid_generate_v4() primary key,
  debt_id uuid references debts(id) on delete cascade,
  amount numeric(12,2) not null,
  due_date date not null,
  status text default 'PENDING',
  paid_at timestamptz
);
alter table debt_installments enable row level security;
create policy "Users can crud own debt installments" on debt_installments for all using (
    exists (select 1 from debts d where d.id = debt_installments.debt_id and d.user_id = auth.uid())
);


-- INVESTMENTS (Simple Model)
create table investments (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  name text not null,
  type text, -- Stock, Fixed Income, Crypto
  current_value numeric(12,2) default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table investments enable row level security;
create policy "Users can crud own investments" on investments for all using (auth.uid() = user_id);

-- AUDIT LOG
create table audit_log (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users,
  table_name text not null,
  record_id uuid,
  action text not null, -- INSERT, UPDATE, DELETE
  old_data jsonb,
  new_data jsonb,
  changed_at timestamptz default now()
);
alter table audit_log enable row level security;
create policy "Users can view own audit logs" on audit_log for select using (auth.uid() = user_id);


-- --- FUNCTIONS & TRIGGERS ---

-- 1. Trigger to update Account Balance automatically
create or replace function update_account_balance()
returns trigger as $$
begin
  if (TG_OP = 'INSERT') then
    if NEW.status = 'CONFIRMED' and NEW.account_id is not null then
      update accounts set current_balance = current_balance + NEW.amount where id = NEW.account_id;
    end if;
    -- Handle Transfer (Debit Source, Credit Target)
    if NEW.type = 'TRANSFER' and NEW.transfer_account_id is not null and NEW.status = 'CONFIRMED' then
       -- Amount is negative for source, so we add positive for target
       update accounts set current_balance = current_balance + abs(NEW.amount) where id = NEW.transfer_account_id;
    end if;
  elsif (TG_OP = 'DELETE') then
     if OLD.status = 'CONFIRMED' and OLD.account_id is not null then
      update accounts set current_balance = current_balance - OLD.amount where id = OLD.account_id;
    end if;
     if OLD.type = 'TRANSFER' and OLD.transfer_account_id is not null and OLD.status = 'CONFIRMED' then
       update accounts set current_balance = current_balance - abs(OLD.amount) where id = OLD.transfer_account_id;
    end if;
  end if;
  return null;
end;
$$ language plpgsql security definer;

create trigger tr_update_balance
after insert or delete on transactions
for each row execute function update_account_balance();

-- 2. Handle Profile Creation on Auth Signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');

  -- Create default categories
  insert into public.categories (user_id, name, type, icon, color) values
  (new.id, 'Salário', 'INCOME', 'money', '#22C55E'),
  (new.id, 'Moradia', 'EXPENSE', 'house', '#EF4444'),
  (new.id, 'Alimentação', 'EXPENSE', 'pizza', '#F97316'),
  (new.id, 'Transporte', 'EXPENSE', 'car', '#3B82F6'),
  (new.id, 'Lazer', 'EXPENSE', 'confetti', '#8B5CF6');

  -- Create default account
  insert into public.accounts (user_id, name, type, initial_balance, current_balance)
  values (new.id, 'Carteira', 'WALLET', 0, 0);

  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 3. Audit Log Trigger
create or replace function audit_trigger_func()
returns trigger as $$
begin
  insert into audit_log (user_id, table_name, record_id, action, old_data, new_data)
  values (
    auth.uid(),
    TG_TABLE_NAME,
    coalesce(NEW.id, OLD.id),
    TG_OP,
    to_jsonb(OLD),
    to_jsonb(NEW)
  );
  return NEW;
end;
$$ language plpgsql security definer;

create trigger tr_audit_transactions
after insert or update or delete on transactions
for each row execute function audit_trigger_func();


-- --- VIEWS (For Frontend Performance) ---

-- View: Dashboard Summary (Balances & Totals)
create or replace view view_dashboard_summary as
select
  u.id as user_id,
  (select coalesce(sum(current_balance), 0) from accounts where user_id = u.id) as total_balance,
  (select coalesce(sum(amount), 0) from transactions where user_id = u.id and type='INCOME' and date_trunc('month', date) = date_trunc('month', now())) as month_income,
  (select coalesce(sum(amount), 0) from transactions where user_id = u.id and type='EXPENSE' and date_trunc('month', date) = date_trunc('month', now())) as month_expense,
  (select count(*) from invoices where user_id = u.id and status = 'OPEN') as open_invoices
from auth.users u;

-- View: Monthly Category Report
create or replace view view_monthly_category_report as
select
  t.user_id,
  c.name as category_name,
  c.color as category_color,
  c.type as category_type,
  to_char(t.date, 'YYYY-MM') as month_year,
  sum(abs(t.amount)) as total_amount
from transactions t
join categories c on t.category_id = c.id
where t.status = 'CONFIRMED'
group by 1, 2, 3, 4, 5;

-- STORAGE POLICIES (Conceptual - run in Storage dashboard)
-- bucket: 'attachments'
-- policy: give select/insert/update/delete to auth.uid() = owner

-- Append this to schema.sql

-- RPC: Create Transaction with Installments
-- Handles logic to create N records for credit card installments
create or replace function create_transaction_with_installments(
  p_description text,
  p_amount numeric,
  p_date date,
  p_category_id uuid,
  p_user_id uuid,
  p_account_id uuid default null,
  p_card_id uuid default null,
  p_installments int default 1
) returns jsonb as $$
declare
  v_trx_id uuid;
  v_installment_amount numeric;
  v_current_date date;
  i int;
begin
  -- 1. Insert the main "Head" transaction (shows as the total or the first one? Usually the full purchase)
  -- For Credit Cards, usually we create one record per month in the invoice.
  -- Strategy: If p_card_id is present and p_installments > 1:
  -- We create N transactions, one for each month, with future dates.

  if p_card_id is not null and p_installments > 1 then
    v_installment_amount := round(p_amount / p_installments, 2);
    v_current_date := p_date;

    for i in 1..p_installments loop
      insert into transactions (
        user_id, account_id, card_id, category_id, description, amount, type, status, date, installment_number, installment_total
      ) values (
        p_user_id, null, p_card_id, p_category_id,
        p_description || ' (' || i || '/' || p_installments || ')',
        v_installment_amount,
        'EXPENSE',
        'CONFIRMED', -- Confirmed inside the invoice?
        v_current_date,
        i,
        p_installments
      );

      -- Add 1 month for next installment
      v_current_date := v_current_date + interval '1 month';
    end loop;

    return jsonb_build_object('success', true, 'message', 'Parcelas criadas');

  else
    -- Standard Single Transaction
    insert into transactions (
      user_id, account_id, card_id, category_id, description, amount, type, status, date
    ) values (
      p_user_id, p_account_id, p_card_id, p_category_id, p_description, p_amount,
      case when p_amount >= 0 then 'INCOME' else 'EXPENSE' end,
      'CONFIRMED',
      p_date
    ) returning id into v_trx_id;

    return jsonb_build_object('success', true, 'id', v_trx_id);
  end if;
end;
$$ language plpgsql security definer;

-- RPC: Get Monthly Budget Performance
create or replace function get_budget_status(p_month_str text) -- 'YYYY-MM'
returns table (
  category_name text,
  budget_amount numeric,
  spent_amount numeric,
  percentage numeric
) as $$
begin
  return query
  select
    c.name,
    b.amount as budget,
    coalesce(sum(abs(t.amount)), 0) as spent,
    case when b.amount > 0 then round((coalesce(sum(abs(t.amount)), 0) / b.amount) * 100, 2) else 0 end
  from budgets b
  join categories c on b.category_id = c.id
  left join transactions t on t.category_id = c.id
    and to_char(t.date, 'YYYY-MM') = p_month_str
    and t.type = 'EXPENSE'
  where b.user_id = auth.uid()
  group by c.name, b.amount;
end;
$$ language plpgsql security definer;
