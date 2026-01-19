import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const config = window.__SUPABASE__ || {};
const supabase = createClient(config.url, config.anonKey);

const state = {
  session: null,
  activeView: 'dashboard'
};

const views = {
  login: document.getElementById('login-view'),
  dashboard: document.getElementById('dashboard-view'),
  transactions: document.getElementById('transactions-view'),
  cards: document.getElementById('cards-view'),
  budgets: document.getElementById('budgets-view'),
  goals: document.getElementById('goals-view'),
  debts: document.getElementById('debts-view'),
  investments: document.getElementById('investments-view'),
  imports: document.getElementById('imports-view'),
  reports: document.getElementById('reports-view'),
  settings: document.getElementById('settings-view')
};

const toast = document.getElementById('toast');
const modalOverlay = document.getElementById('modal-overlay');

const showToast = (message) => {
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
};

const setView = (view) => {
  Object.values(views).forEach((v) => v.classList.remove('active'));
  views[view]?.classList.add('active');
  document.querySelectorAll('[data-view]').forEach((item) => {
    item.classList.toggle('active', item.dataset.view === view);
  });
  state.activeView = view;
};

const toggleModal = (id, open) => {
  const modal = document.getElementById(id);
  modal.classList.toggle('hidden', !open);
  modalOverlay.classList.toggle('hidden', !open);
};

const requireSession = async () => {
  const { data } = await supabase.auth.getSession();
  state.session = data.session;
  if (!data.session) {
    setView('login');
    return false;
  }
  return true;
};

const listToCards = (items, renderFn) => {
  if (!items.length) return '<div class="muted">Nenhum registro.</div>';
  return items.map(renderFn).join('');
};

const loadDashboard = async () => {
  const balances = await supabase.from('v_account_balances').select('*').limit(20);
  const commitments = await supabase.from('v_upcoming_commitments').select('*').order('due_date', { ascending: true }).limit(10);
  const netWorth = await supabase.from('v_net_worth').select('*').single();

  const balancesEl = document.getElementById('account-balances');
  balancesEl.classList.remove('skeleton');
  balancesEl.innerHTML = listToCards(balances.data || [], (row) => `
    <div class="table-row">
      <div>${row.name}</div>
      <div>${row.currency}</div>
      <div>${row.balance}</div>
    </div>
  `);

  const commitmentsEl = document.getElementById('upcoming-commitments');
  commitmentsEl.classList.remove('skeleton');
  commitmentsEl.innerHTML = listToCards(commitments.data || [], (row) => `
    <div class="table-row">
      <div>${row.source}</div>
      <div>${row.due_date}</div>
      <div>${row.amount}</div>
    </div>
  `);

  const netWorthEl = document.getElementById('net-worth');
  netWorthEl.textContent = netWorth.data ? `R$ ${netWorth.data.net_worth}` : '--';
};

const loadReports = async () => {
  const cashflow = await supabase.from('v_cashflow_monthly').select('*').order('month', { ascending: false }).limit(6);
  const categoryTotals = await supabase.from('v_monthly_category_totals').select('*').order('month', { ascending: false }).limit(10);

  const cashflowEl = document.getElementById('cashflow-report');
  cashflowEl.classList.remove('skeleton');
  cashflowEl.innerHTML = listToCards(cashflow.data || [], (row) => `
    <div class="table-row">
      <div>${row.month}</div>
      <div>Entradas: ${row.total_income}</div>
      <div>Saídas: ${row.total_expense}</div>
      <div>Saldo: ${row.net}</div>
    </div>
  `);

  const categoryEl = document.getElementById('category-report');
  categoryEl.classList.remove('skeleton');
  categoryEl.innerHTML = listToCards(categoryTotals.data || [], (row) => `
    <div class="table-row">
      <div>${row.month}</div>
      <div>${row.category_id}</div>
      <div>${row.total}</div>
    </div>
  `);
};

const loadTransactions = async () => {
  const { data } = await supabase.from('transactions').select('*').order('posted_on', { ascending: false }).limit(50);
  const list = document.getElementById('transactions-list');
  list.classList.remove('skeleton');
  list.innerHTML = listToCards(data || [], (row) => `
    <div class="table-row">
      <div>${row.posted_on}</div>
      <div>${row.description}</div>
      <div>${row.kind}</div>
      <div>${row.amount}</div>
      <div>${row.status}</div>
    </div>
  `);
};

const loadCards = async () => {
  const { data } = await supabase.from('v_card_invoice_summary').select('*').order('due_date', { ascending: false }).limit(12);
  const list = document.getElementById('card-invoices');
  list.classList.remove('skeleton');
  list.innerHTML = listToCards(data || [], (row) => `
    <div class="table-row">
      <div>${row.period_start} → ${row.period_end}</div>
      <div>${row.status}</div>
      <div>Devido: ${row.amount_due}</div>
      <div>Pago: ${row.amount_paid}</div>
    </div>
  `);
};

const loadBudgets = async () => {
  const { data } = await supabase.from('budgets').select('*').order('period', { ascending: false });
  const list = document.getElementById('budgets-list');
  list.classList.remove('skeleton');
  list.innerHTML = listToCards(data || [], (row) => `
    <div class="table-row">
      <div>${row.period}</div>
      <div>${row.category_id}</div>
      <div>${row.amount}</div>
    </div>
  `);
};

const loadGoals = async () => {
  const { data } = await supabase.from('goals').select('*');
  const list = document.getElementById('goals-list');
  list.classList.remove('skeleton');
  list.innerHTML = listToCards(data || [], (row) => `
    <div class="table-row">
      <div>${row.name}</div>
      <div>${row.current_amount}/${row.target_amount}</div>
      <div>${row.target_date}</div>
    </div>
  `);
};

const loadDebts = async () => {
  const { data } = await supabase.from('debts').select('*');
  const list = document.getElementById('debts-list');
  list.classList.remove('skeleton');
  list.innerHTML = listToCards(data || [], (row) => `
    <div class="table-row">
      <div>${row.name}</div>
      <div>${row.principal}</div>
      <div>${row.status}</div>
    </div>
  `);
};

const loadInvestments = async () => {
  const { data } = await supabase.from('investments').select('*');
  const list = document.getElementById('investments-list');
  list.classList.remove('skeleton');
  list.innerHTML = listToCards(data || [], (row) => `
    <div class="table-row">
      <div>${row.name}</div>
      <div>${row.type}</div>
    </div>
  `);
};

const loadSettings = async () => {
  const [accounts, categories, tags, payees] = await Promise.all([
    supabase.from('accounts').select('*'),
    supabase.from('categories').select('*'),
    supabase.from('tags').select('*'),
    supabase.from('payees').select('*')
  ]);

  const accountsList = document.getElementById('accounts-list');
  accountsList.classList.remove('skeleton');
  accountsList.innerHTML = listToCards(accounts.data || [], (row) => `
    <div class="table-row">
      <div>${row.name}</div>
      <div>${row.type}</div>
      <div>${row.opening_balance}</div>
    </div>
  `);

  const categoriesList = document.getElementById('categories-list');
  categoriesList.classList.remove('skeleton');
  categoriesList.innerHTML = listToCards(categories.data || [], (row) => `
    <div class="table-row">
      <div>${row.name}</div>
      <div>${row.type}</div>
      <div>${row.icon}</div>
    </div>
  `);

  const tagsList = document.getElementById('tags-list');
  tagsList.classList.remove('skeleton');
  tagsList.innerHTML = listToCards(tags.data || [], (row) => `
    <div class="table-row">
      <div>${row.name}</div>
      <div>${row.color}</div>
    </div>
  `);

  const payeesList = document.getElementById('payees-list');
  payeesList.classList.remove('skeleton');
  payeesList.innerHTML = listToCards(payees.data || [], (row) => `
    <div class="table-row">
      <div>${row.name}</div>
      <div>${row.type}</div>
    </div>
  `);
};

const loadSelects = async () => {
  const [accounts, categories, payees, cards] = await Promise.all([
    supabase.from('accounts').select('id,name'),
    supabase.from('categories').select('id,name'),
    supabase.from('payees').select('id,name'),
    supabase.from('cards').select('id,name')
  ]);

  const fillSelect = (id, rows) => {
    const el = document.getElementById(id);
    el.innerHTML = '<option value="">Selecione</option>';
    (rows || []).forEach((row) => {
      const opt = document.createElement('option');
      opt.value = row.id;
      opt.textContent = row.name;
      el.appendChild(opt);
    });
  };

  fillSelect('tx-account', accounts.data);
  fillSelect('tx-category', categories.data);
  fillSelect('tx-payee', payees.data);
  fillSelect('tx-card', cards.data);
  fillSelect('budget-category', categories.data);
};

const refreshAll = async () => {
  await loadSelects();
  await loadDashboard();
  await loadTransactions();
  await loadCards();
  await loadBudgets();
  await loadGoals();
  await loadDebts();
  await loadInvestments();
  await loadReports();
  await loadSettings();
};

// Auth
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');

document.getElementById('btn-magic').addEventListener('click', async () => {
  const email = document.getElementById('login-email').value;
  const { error } = await supabase.auth.signInWithOtp({ email });
  if (error) return showToast(error.message);
  showToast('Magic link enviado.');
});

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return showToast(error.message);
  await onAuth();
});

signupForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const email = document.getElementById('signup-email').value;
  const password = document.getElementById('signup-password').value;
  const full_name = document.getElementById('signup-name').value;
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name } }
  });
  if (error) return showToast(error.message);
  showToast('Conta criada. Confirme seu email.');
});

document.getElementById('btn-logout').addEventListener('click', async () => {
  await supabase.auth.signOut();
  setView('login');
});

// Navigation
Array.from(document.querySelectorAll('[data-view]')).forEach((item) => {
  item.addEventListener('click', async () => {
    const view = item.dataset.view;
    setView(view);
  });
});

// Modals
Array.from(document.querySelectorAll('[data-open-modal]')).forEach((btn) => {
  btn.addEventListener('click', () => toggleModal(btn.dataset.openModal, true));
});

Array.from(document.querySelectorAll('[data-close-modal]')).forEach((btn) => {
  btn.addEventListener('click', () => toggleModal(btn.closest('.modal').id, false));
});

modalOverlay.addEventListener('click', () => {
  document.querySelectorAll('.modal').forEach((modal) => modal.classList.add('hidden'));
  modalOverlay.classList.add('hidden');
});

// CRUD forms

document.getElementById('account-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const name = document.getElementById('account-name').value;
  const type = document.getElementById('account-type').value;
  const opening_balance = document.getElementById('account-opening').value;
  const { error } = await supabase.from('accounts').insert({ name, type, opening_balance });
  if (error) return showToast(error.message);
  toggleModal('account-modal', false);
  await refreshAll();
  showToast('Conta criada.');
});

document.getElementById('category-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const name = document.getElementById('category-name').value;
  const type = document.getElementById('category-type').value;
  const icon = document.getElementById('category-icon').value;
  const { error } = await supabase.from('categories').insert({ name, type, icon });
  if (error) return showToast(error.message);
  toggleModal('category-modal', false);
  await refreshAll();
  showToast('Categoria criada.');
});

document.getElementById('tag-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const name = document.getElementById('tag-name').value;
  const color = document.getElementById('tag-color').value;
  const { error } = await supabase.from('tags').insert({ name, color });
  if (error) return showToast(error.message);
  toggleModal('tag-modal', false);
  await refreshAll();
  showToast('Tag criada.');
});

document.getElementById('payee-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const name = document.getElementById('payee-name').value;
  const type = document.getElementById('payee-type').value;
  const { error } = await supabase.from('payees').insert({ name, type });
  if (error) return showToast(error.message);
  toggleModal('payee-modal', false);
  await refreshAll();
  showToast('Favorecido criado.');
});

document.getElementById('card-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const name = document.getElementById('card-name').value;
  const limit_amount = document.getElementById('card-limit').value;
  const closing_day = document.getElementById('card-closing').value;
  const due_day = document.getElementById('card-due').value;
  const { error } = await supabase.from('cards').insert({ name, limit_amount, closing_day, due_day });
  if (error) return showToast(error.message);
  toggleModal('card-modal', false);
  await refreshAll();
  showToast('Cartão criado.');
});

document.getElementById('budget-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const category_id = document.getElementById('budget-category').value;
  const period = document.getElementById('budget-period').value;
  const amount = document.getElementById('budget-amount').value;
  const { error } = await supabase.from('budgets').insert({ category_id, period, amount });
  if (error) return showToast(error.message);
  toggleModal('budget-modal', false);
  await loadBudgets();
  showToast('Orçamento criado.');
});

document.getElementById('goal-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const name = document.getElementById('goal-name').value;
  const target_amount = document.getElementById('goal-amount').value;
  const target_date = document.getElementById('goal-date').value;
  const { error } = await supabase.from('goals').insert({ name, target_amount, target_date });
  if (error) return showToast(error.message);
  toggleModal('goal-modal', false);
  await loadGoals();
  showToast('Meta criada.');
});

document.getElementById('debt-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const name = document.getElementById('debt-name').value;
  const principal = document.getElementById('debt-principal').value;
  const interest_rate = document.getElementById('debt-interest').value;
  const term_months = document.getElementById('debt-term').value;
  const { error } = await supabase.from('debts').insert({ name, principal, interest_rate, term_months, start_date: new Date().toISOString().slice(0, 10) });
  if (error) return showToast(error.message);
  toggleModal('debt-modal', false);
  await loadDebts();
  showToast('Dívida criada.');
});

document.getElementById('investment-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const name = document.getElementById('investment-name').value;
  const type = document.getElementById('investment-type').value;
  const { error } = await supabase.from('investments').insert({ name, type });
  if (error) return showToast(error.message);
  toggleModal('investment-modal', false);
  await loadInvestments();
  showToast('Investimento criado.');
});

document.getElementById('transaction-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  let splits = [];
  const rawSplits = document.getElementById('tx-splits').value.trim();
  if (rawSplits) {
    try {
      splits = JSON.parse(rawSplits);
    } catch (error) {
      return showToast('Split inválido. Use JSON válido.');
    }
  }

  const payload = {
    p_account_id: document.getElementById('tx-account').value || null,
    p_card_id: document.getElementById('tx-card').value || null,
    p_kind: document.getElementById('tx-kind').value,
    p_status: 'posted',
    p_amount: Number(document.getElementById('tx-amount').value),
    p_occurred_on: document.getElementById('tx-occurred').value,
    p_posted_on: document.getElementById('tx-posted').value,
    p_description: document.getElementById('tx-description').value,
    p_category_id: document.getElementById('tx-category').value || null,
    p_payee_id: document.getElementById('tx-payee').value || null,
    p_center_id: null,
    p_source: 'manual',
    p_splits: splits
  };

  const { error } = await supabase.rpc('rpc_create_transaction_with_splits', payload);
  if (error) return showToast(error.message);
  toggleModal('transaction-modal', false);
  await refreshAll();
  showToast('Lançamento criado.');
});

// Card actions
const closeInvoiceButton = document.getElementById('btn-close-invoice');
const payInvoiceButton = document.getElementById('btn-pay-invoice');

closeInvoiceButton.addEventListener('click', async () => {
  const card = await supabase.from('cards').select('id').limit(1).single();
  if (!card.data) return showToast('Cadastre um cartão.');
  const today = new Date().toISOString().slice(0, 10);
  const { error } = await supabase.rpc('rpc_close_card_invoice', { p_card_id: card.data.id, p_closing_date: today });
  if (error) return showToast(error.message);
  await loadCards();
  showToast('Fatura fechada.');
});

payInvoiceButton.addEventListener('click', async () => {
  const invoice = await supabase.from('card_invoices').select('id, amount_due, amount_paid').order('created_at', { ascending: false }).limit(1).single();
  const account = await supabase.from('accounts').select('id').limit(1).single();
  if (!invoice.data || !account.data) return showToast('Cadastre conta e fatura.');
  const amount = invoice.data.amount_due - invoice.data.amount_paid;
  const today = new Date().toISOString().slice(0, 10);
  const { error } = await supabase.rpc('rpc_pay_card_invoice', {
    p_invoice_id: invoice.data.id,
    p_payment_account: account.data.id,
    p_amount: amount,
    p_paid_on: today
  });
  if (error) return showToast(error.message);
  await loadCards();
  showToast('Fatura paga.');
});

// CSV Import
const parseCSV = (text) => {
  const [headerLine, ...lines] = text.trim().split('\n');
  const headers = headerLine.split(',').map((h) => h.trim());
  return lines.map((line) => {
    const values = line.split(',');
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index]?.trim();
    });
    return row;
  });
};

const hashRow = (row) => {
  const data = JSON.stringify(row);
  let hash = 0;
  for (let i = 0; i < data.length; i += 1) {
    hash = (hash << 5) - hash + data.charCodeAt(i);
    hash |= 0;
  }
  return `csv_${Math.abs(hash)}`;
};

document.getElementById('btn-import').addEventListener('click', async () => {
  const fileInput = document.getElementById('csv-file');
  if (!fileInput.files.length) return showToast('Selecione um CSV.');
  const file = fileInput.files[0];
  const text = await file.text();
  const rows = parseCSV(text);
  document.getElementById('import-preview').innerHTML = listToCards(rows.slice(0, 5), (row) => `
    <div class="table-row">
      <div>${row.description || row.descricao}</div>
      <div>${row.amount || row.valor}</div>
      <div>${row.date || row.data}</div>
    </div>
  `);

  const account = await supabase.from('accounts').select('id').limit(1).single();
  if (!account.data) return showToast('Cadastre uma conta antes de importar.');

  for (const row of rows) {
    const payload = {
      account_id: account.data.id,
      kind: 'expense',
      status: 'posted',
      amount: Number(row.amount || row.valor || 0),
      occurred_on: row.date || row.data,
      posted_on: row.date || row.data,
      description: row.description || row.descricao || 'Importado',
      source: 'import',
      source_hash: hashRow(row)
    };
    await supabase.from('transactions').insert(payload, { returning: 'minimal' });
  }
  await refreshAll();
  showToast('Importação concluída.');
});

document.getElementById('btn-sync').addEventListener('click', async () => {
  await refreshAll();
  showToast('Sincronizado.');
});

const onAuth = async () => {
  const ok = await requireSession();
  if (!ok) return;
  setView(state.activeView);
  await refreshAll();
};

supabase.auth.onAuthStateChange(() => {
  onAuth();
});

onAuth();
