-- Enable RLS
alter table profiles enable row level security;
alter table institutions enable row level security;
alter table households enable row level security;
alter table household_members enable row level security;
alter table accounts enable row level security;
alter table centers enable row level security;
alter table payees enable row level security;
alter table categories enable row level security;
alter table tags enable row level security;
alter table rules enable row level security;
alter table cards enable row level security;
alter table card_invoices enable row level security;
alter table transactions enable row level security;
alter table transaction_splits enable row level security;
alter table transaction_tags enable row level security;
alter table card_installments enable row level security;
alter table budgets enable row level security;
alter table goals enable row level security;
alter table debts enable row level security;
alter table debt_installments enable row level security;
alter table investments enable row level security;
alter table investment_movements enable row level security;
alter table recurrences enable row level security;
alter table attachments enable row level security;
alter table notifications enable row level security;
alter table audit_log enable row level security;

-- Policies: profiles
create policy "Profiles are owner-only" on profiles
for select using (user_id = auth.uid());

create policy "Profiles insert" on profiles
for insert with check (user_id = auth.uid());

create policy "Profiles update" on profiles
for update using (user_id = auth.uid());

-- Institutions
create policy "Institutions owner" on institutions
for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Households
create policy "Households owner" on households
for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "Household members owner" on household_members
for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Accounts
create policy "Accounts owner" on accounts
for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Centers
create policy "Centers owner" on centers
for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Payees
create policy "Payees owner" on payees
for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Categories
create policy "Categories owner" on categories
for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Tags
create policy "Tags owner" on tags
for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Rules
create policy "Rules owner" on rules
for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Cards
create policy "Cards owner" on cards
for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Card invoices
create policy "Card invoices owner" on card_invoices
for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Transactions
create policy "Transactions owner" on transactions
for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Transaction splits
create policy "Transaction splits owner" on transaction_splits
for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Transaction tags
create policy "Transaction tags owner" on transaction_tags
for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Card installments
create policy "Card installments owner" on card_installments
for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Budgets
create policy "Budgets owner" on budgets
for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Goals
create policy "Goals owner" on goals
for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Debts
create policy "Debts owner" on debts
for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Debt installments
create policy "Debt installments owner" on debt_installments
for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Investments
create policy "Investments owner" on investments
for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Investment movements
create policy "Investment movements owner" on investment_movements
for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Recurrences
create policy "Recurrences owner" on recurrences
for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Attachments
create policy "Attachments owner" on attachments
for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Notifications
create policy "Notifications owner" on notifications
for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Audit log
create policy "Audit owner" on audit_log
for select using (user_id = auth.uid());
