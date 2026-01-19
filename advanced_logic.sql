
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
