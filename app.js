
// --- CONFIGURATION ---
const CONFIG_KEY = 'fp_config';
let supabase = null;
let currentUser = null;

// --- UTILS ---
const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('pt-BR').format(date); // DD/MM/YYYY
};

// --- TOAST ---
const showToast = (message, type = 'info') => {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    let icon = 'info';
    if(type === 'success') icon = 'check-circle';
    if(type === 'error') icon = 'warning-circle';

    toast.innerHTML = `
        <i class="ph ph-${icon} text-xl"></i>
        <div class="text-sm font-medium text-gray-800">${message}</div>
    `;

    container.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.3s ease-in forwards';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
};

// --- DATA SERVICE ---
const api = {
    async init() {
        const storedConfig = localStorage.getItem(CONFIG_KEY);
        if (storedConfig) {
            const { url, key } = JSON.parse(storedConfig);
            if (url && key) {
                try {
                    supabase = window.supabase.createClient(url, key);
                    return true;
                } catch (e) {
                    console.error("Supabase init error", e);
                    return false;
                }
            }
        }
        return false;
    },

    async checkAuth() {
        if (!supabase) return null;
        const { data: { session } } = await supabase.auth.getSession();
        currentUser = session?.user || null;
        return currentUser;
    },

    async signIn(email, password) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        currentUser = data.user;
        return data.user;
    },

    async signUp(email, password) {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { full_name: email.split('@')[0] }
            }
        });
        if (error) throw error;
        currentUser = data.user;
        return data.user;
    },

    async signOut() {
        await supabase.auth.signOut();
        currentUser = null;
        router.navigate('login');
    },

    // --- DASHBOARD ---
    async getDashboardSummary() {
        const { data, error } = await supabase.from('view_dashboard_summary').select('*').single();
        if (error && error.code !== 'PGRST116') throw error;
        return data || { total_balance: 0, month_income: 0, month_expense: 0 };
    },

    async getRecentTransactions() {
        const { data, error } = await supabase
            .from('transactions')
            .select('*, categories(name, icon, color, type), accounts(name)')
            .order('date', { ascending: false })
            .limit(5);
        if (error) throw error;
        return data;
    },

    // --- CRUD LISTS ---
    async getAccounts() {
        const { data, error } = await supabase.from('accounts').select('*').eq('is_archived', false).order('name');
        if (error) throw error;
        return data;
    },

    async getCategories(type) {
        let query = supabase.from('categories').select('*').order('name');
        if (type) query = query.eq('type', type);
        const { data, error } = await query;
        if (error) throw error;
        return data;
    },

    async getCards() {
        const { data, error } = await supabase.from('credit_cards').select('*').eq('is_archived', false).order('name');
        if (error) throw error;
        return data;
    },

    async getGoals() {
        const { data, error } = await supabase.from('goals').select('*').order('deadline', { ascending: true });
        if (error) throw error;
        return data;
    },

    async getDebts() {
        const { data, error } = await supabase.from('debts').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        return data;
    },

    async getInvestments() {
        const { data, error } = await supabase.from('investments').select('*').order('name');
        if (error) throw error;
        return data;
    },

    async getBudgets(monthStr) {
        // monthStr 'YYYY-MM'. This calls our RPC
        const { data, error } = await supabase.rpc('get_budget_status', { p_month_str: monthStr });
        if (error) throw error;
        return data;
    },

    // --- CREATION ---
    async createTransaction(payload) {
        // If installments > 1, use RPC
        if (payload.installments && parseInt(payload.installments) > 1 && payload.card_id) {
            const rpcPayload = {
                p_description: payload.description,
                p_amount: payload.amount,
                p_date: payload.date,
                p_category_id: payload.category_id,
                p_user_id: currentUser.id,
                p_card_id: payload.card_id,
                p_installments: parseInt(payload.installments)
            };

            const { data, error } = await supabase.rpc('create_transaction_with_installments', rpcPayload);
            if (error) throw error;
            return data;

        } else {
            // Standard Insert
            if (!payload.account_id) payload.account_id = null;
            if (!payload.card_id) payload.card_id = null;
            if (!payload.transfer_account_id) payload.transfer_account_id = null;
            // Clean up unneeded field
            delete payload.installments;

            const { data, error } = await supabase.from('transactions').insert(payload).select();
            if (error) throw error;
            return data[0];
        }
    },

    async createAccount(payload) {
        const { data, error } = await supabase.from('accounts').insert(payload).select();
        if (error) throw error;
        return data;
    },

    async createCategory(payload) {
        if(!payload.icon) payload.icon = 'tag';
        const { data, error } = await supabase.from('categories').insert(payload).select();
        if (error) throw error;
        return data;
    },

    async createCard(payload) {
        const { data, error } = await supabase.from('credit_cards').insert(payload).select();
        if (error) throw error;
        return data;
    },

    async createGoal(payload) {
        if(!payload.deadline) payload.deadline = null;
        const { data, error } = await supabase.from('goals').insert(payload).select();
        if (error) throw error;
        return data;
    },

    async createDebt(payload) {
        const { data, error } = await supabase.from('debts').insert(payload).select();
        if (error) throw error;
        return data;
    },

    async createInvestment(payload) {
        const { data, error } = await supabase.from('investments').insert(payload).select();
        if (error) throw error;
        return data;
    },

    async createBudget(payload) {
        const { data, error } = await supabase.from('budgets').insert(payload).select();
        if (error) throw error;
        return data;
    },

    async importTransactions(payloads) {
        const { data, error } = await supabase.from('transactions').insert(payloads).select();
        if (error) throw error;
        return data;
    },

    // --- REPORTS ---
    async getCategoryReport() {
        const { data, error } = await supabase.from('view_monthly_category_report').select('*');
        if (error) throw error;
        return data;
    }
};

// --- UI CONTROLLER ---
const ui = {
    toggleLoading(show) {
        const el = document.getElementById('loading-overlay');
        if (show) el.classList.remove('hidden');
        else el.classList.add('hidden');
    },

    // --- DASHBOARD RENDER ---
    async renderDashboard() {
        this.toggleLoading(true);
        try {
            const summary = await api.getDashboardSummary();
            const recent = await api.getRecentTransactions();

            document.getElementById('dash-total-balance').textContent = formatCurrency(summary.total_balance);
            document.getElementById('dash-month-income').textContent = formatCurrency(summary.month_income);
            document.getElementById('dash-month-expense').textContent = formatCurrency(summary.month_expense);

            const listEl = document.getElementById('dash-recent-list');
            listEl.innerHTML = '';

            if (recent.length === 0) {
                listEl.innerHTML = '<p class="text-sm text-gray-400 text-center py-4">Nenhum lançamento recente.</p>';
            } else {
                recent.forEach(t => {
                    const isExpense = t.type === 'EXPENSE';
                    const isTransfer = t.type === 'TRANSFER';
                    const colorClass = isExpense ? 'text-red-600' : (isTransfer ? 'text-gray-600' : 'text-green-600');
                    const sign = isExpense ? '-' : (isTransfer ? '' : '+');
                    const icon = t.categories?.icon || 'money';
                    const catColor = t.categories?.color || '#999';

                    const row = document.createElement('div');
                    row.className = "flex items-center justify-between py-2 border-b border-gray-50 last:border-0";

                    row.innerHTML = `
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-full flex items-center justify-center text-white" style="background-color: ${catColor}">
                                <i class="ph ph-${icon} text-xl"></i>
                            </div>
                            <div>
                                <p class="font-medium text-sm text-gray-900 trunc-desc"></p>
                                <p class="text-xs text-gray-500 trunc-sub"></p>
                            </div>
                        </div>
                        <span class="font-bold text-sm ${colorClass}">${sign}${formatCurrency(Math.abs(t.amount))}</span>
                    `;

                    row.querySelector('.trunc-desc').textContent = t.description;
                    row.querySelector('.trunc-sub').textContent = `${t.accounts?.name || 'Cartão'} • ${formatDate(t.date)}`;

                    listEl.appendChild(row);
                });
            }

            document.getElementById('current-date-display').innerText = new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
            document.getElementById('user-name-display').innerText = currentUser.user_metadata?.full_name || currentUser.email.split('@')[0];

        } catch (e) {
            console.error(e);
            showToast('Erro ao carregar dashboard', 'error');
        } finally {
            this.toggleLoading(false);
        }
    },

    // --- TRANSACTIONS RENDER ---
    async renderTransactions() {
        this.toggleLoading(true);
        try {
            const { data, error } = await supabase
                .from('transactions')
                .select('*, categories(name, icon, color), accounts(name)')
                .order('date', { ascending: false })
                .limit(50);

            const listEl = document.getElementById('transactions-list');
            listEl.innerHTML = '';

            if (data && data.length > 0) {
                 data.forEach(t => {
                    const isExpense = t.type === 'EXPENSE';
                    const sign = isExpense ? '-' : '+';
                    const colorClass = isExpense ? 'text-red-600' : 'text-green-600';
                    const catColor = t.categories?.color || '#ccc';
                    const icon = t.categories?.icon || 'circle';

                    const row = document.createElement('div');
                    row.className = "p-4 flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer";

                    row.innerHTML = `
                        <div class="flex items-center gap-4">
                            <div class="w-10 h-10 rounded-full flex items-center justify-center text-white shadow-sm" style="background-color: ${catColor}">
                                <i class="ph ph-${icon} text-xl"></i>
                            </div>
                            <div>
                                <p class="font-medium text-gray-900 trunc-desc"></p>
                                <p class="text-xs text-gray-500 trunc-sub"></p>
                            </div>
                        </div>
                        <div class="text-right">
                            <p class="font-bold ${colorClass}">${sign}${formatCurrency(Math.abs(t.amount))}</p>
                            <p class="text-xs text-gray-400">${t.status}</p>
                        </div>
                    `;

                    row.querySelector('.trunc-desc').textContent = t.description;
                    row.querySelector('.trunc-sub').textContent = `${t.categories?.name || 'Sem categoria'} • ${formatDate(t.date)}`;

                    listEl.appendChild(row);
                 });
            } else {
                 listEl.innerHTML = '<div class="p-8 text-center text-gray-400">Nenhum lançamento encontrado.</div>';
            }

        } catch(e) {
            showToast('Erro ao listar transações', 'error');
        } finally {
            this.toggleLoading(false);
        }
    },

    // --- GOALS RENDER ---
    async renderGoals() {
        this.toggleLoading(true);
        try {
            const goals = await api.getGoals();
            const listEl = document.getElementById('goals-list');
            listEl.innerHTML = '';

            if(goals.length === 0) {
                listEl.innerHTML = '<div class="col-span-full text-center text-gray-400 py-10">Nenhuma meta cadastrada.</div>';
                return;
            }

            goals.forEach(g => {
                const percentage = Math.min(100, Math.round((g.current_amount / g.target_amount) * 100));

                const card = document.createElement('div');
                card.className = "bg-white p-6 rounded-2xl border border-gray-100 shadow-sm";
                card.innerHTML = `
                    <div class="flex justify-between items-start mb-4">
                        <div class="p-3 rounded-xl bg-orange-50 text-brand-orange">
                            <i class="ph ph-target text-xl"></i>
                        </div>
                        <span class="text-xs font-bold bg-gray-100 px-2 py-1 rounded text-gray-500">${percentage}%</span>
                    </div>
                    <h3 class="font-bold text-gray-900 text-lg mb-1 trunc-name"></h3>
                    <p class="text-sm text-gray-500 mb-4">Meta: ${formatCurrency(g.target_amount)}</p>

                    <div class="w-full bg-gray-100 rounded-full h-2 mb-2">
                        <div class="bg-brand-orange h-2 rounded-full" style="width: ${percentage}%"></div>
                    </div>
                    <p class="text-xs text-gray-400 text-right">Atual: ${formatCurrency(g.current_amount)}</p>
                `;
                card.querySelector('.trunc-name').textContent = g.name;
                listEl.appendChild(card);
            });

        } catch(e) {
            console.error(e);
            showToast('Erro ao carregar metas', 'error');
        } finally {
            this.toggleLoading(false);
        }
    },

    // --- DEBTS RENDER ---
    async renderDebts() {
        this.toggleLoading(true);
        try {
            const debts = await api.getDebts();
            const listEl = document.getElementById('debts-list');
            listEl.innerHTML = '';

            if(debts.length === 0) {
                listEl.innerHTML = '<div class="text-center text-gray-400 py-10">Nenhuma dívida cadastrada.</div>';
                return;
            }

            debts.forEach(d => {
                const isLoan = d.type === 'LOAN';
                const typeLabel = isLoan ? 'A receber' : 'A pagar';
                const colorClass = isLoan ? 'text-green-600' : 'text-red-600';

                const item = document.createElement('div');
                item.className = "p-4 flex items-center justify-between hover:bg-gray-50 transition-colors";
                item.innerHTML = `
                    <div class="flex items-center gap-4">
                        <div class="w-10 h-10 rounded-full flex items-center justify-center bg-gray-100 text-gray-600">
                            <i class="ph ph-receipt text-xl"></i>
                        </div>
                        <div>
                            <p class="font-medium text-gray-900 trunc-name"></p>
                            <p class="text-xs text-gray-500">${typeLabel} • Restante: ${formatCurrency(d.remaining_amount)}</p>
                        </div>
                    </div>
                    <div class="text-right">
                        <p class="font-bold ${colorClass}">${formatCurrency(d.total_amount)}</p>
                    </div>
                `;
                item.querySelector('.trunc-name').textContent = d.name;
                listEl.appendChild(item);
            });

        } catch(e) {
            console.error(e);
            showToast('Erro ao carregar dívidas', 'error');
        } finally {
            this.toggleLoading(false);
        }
    },

    // --- INVESTMENTS RENDER ---
    async renderInvestments() {
        this.toggleLoading(true);
        try {
            const items = await api.getInvestments();
            const listEl = document.getElementById('investments-list');
            listEl.innerHTML = '';

            if(items.length === 0) {
                listEl.innerHTML = '<div class="col-span-full text-center text-gray-400 py-10">Nenhum investimento cadastrado.</div>';
                return;
            }

            items.forEach(i => {
                let icon = 'chart-line-up';
                let color = 'bg-blue-100 text-blue-600';
                if(i.type === 'CRYPTO') { icon = 'currency-btc'; color = 'bg-yellow-100 text-yellow-600'; }
                if(i.type === 'FIXED') { icon = 'bank'; color = 'bg-green-100 text-green-600'; }

                const card = document.createElement('div');
                card.className = "bg-white p-6 rounded-2xl border border-gray-100 shadow-sm";
                card.innerHTML = `
                    <div class="flex justify-between items-start mb-4">
                        <div class="p-3 rounded-xl ${color}">
                            <i class="ph ph-${icon} text-xl"></i>
                        </div>
                        <span class="text-xs font-bold bg-gray-100 px-2 py-1 rounded text-gray-500">${i.type}</span>
                    </div>
                    <h3 class="font-bold text-gray-900 text-lg mb-1 trunc-name"></h3>
                    <p class="font-bold text-brand-black text-xl">${formatCurrency(i.current_value)}</p>
                `;
                card.querySelector('.trunc-name').textContent = i.name;
                listEl.appendChild(card);
            });

        } catch(e) {
            console.error(e);
            showToast('Erro ao carregar investimentos', 'error');
        } finally {
            this.toggleLoading(false);
        }
    },

    // --- BUDGETS RENDER ---
    async renderBudgets() {
        this.toggleLoading(true);
        try {
            const now = new Date();
            const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
            const items = await api.getBudgets(monthStr);
            const listEl = document.getElementById('budgets-list');
            listEl.innerHTML = '';

            if(items.length === 0) {
                listEl.innerHTML = '<div class="text-center text-gray-400 py-10">Nenhum orçamento definido para este mês.</div>';
                return;
            }

            items.forEach(b => {
                const color = b.percentage > 100 ? 'bg-red-500' : 'bg-brand-orange';
                const textColor = b.percentage > 100 ? 'text-red-600' : 'text-gray-900';

                const div = document.createElement('div');
                div.innerHTML = `
                    <div class="flex justify-between items-center mb-1">
                        <span class="font-medium text-gray-700 trunc-name"></span>
                        <span class="text-sm font-bold ${textColor}">${b.percentage}%</span>
                    </div>
                    <div class="w-full bg-gray-100 rounded-full h-2 mb-1">
                        <div class="${color} h-2 rounded-full" style="width: ${Math.min(b.percentage, 100)}%"></div>
                    </div>
                    <div class="flex justify-between text-xs text-gray-500">
                        <span>Gasto: ${formatCurrency(b.spent_amount)}</span>
                        <span>Limite: ${formatCurrency(b.budget_amount)}</span>
                    </div>
                `;
                div.querySelector('.trunc-name').textContent = b.category_name;
                listEl.appendChild(div);
            });

        } catch(e) {
            console.error(e);
            showToast('Erro ao carregar orçamentos', 'error');
        } finally {
            this.toggleLoading(false);
        }
    },

    // --- REPORTS RENDER ---
    async renderReports() {
        try {
             const data = await api.getCategoryReport();
             const grouped = {};
             data.forEach(item => {
                 if(!grouped[item.category_name]) grouped[item.category_name] = 0;
                 grouped[item.category_name] += item.total_amount;
             });

             const ctx = document.getElementById('chart-categories').getContext('2d');
             if(window.myChart) window.myChart.destroy();

             window.myChart = new Chart(ctx, {
                 type: 'doughnut',
                 data: {
                     labels: Object.keys(grouped),
                     datasets: [{
                         data: Object.values(grouped),
                         backgroundColor: ['#EF4444', '#F97316', '#3B82F6', '#8B5CF6', '#10B981'],
                         borderWidth: 0
                     }]
                 },
                 options: {
                     responsive: true,
                     maintainAspectRatio: false,
                     plugins: {
                         legend: { position: 'bottom' }
                     }
                 }
             });

        } catch(e) {
            console.error(e);
        }
    },

    // --- MODALS & FORMS ---
    openModal(id) {
        document.getElementById('modal-backdrop').classList.remove('hidden');
        document.getElementById('modal-backdrop').classList.remove('opacity-0');
        const modal = document.getElementById(id);
        modal.classList.remove('hidden');

        if (id === 'modal-transaction') this.populateTransactionForm();
        if (id === 'modal-import') this.populateImportForm();
        if (id === 'modal-budget') this.populateBudgetForm();

        setTimeout(() => modal.classList.add('modal-open'), 10);
    },

    closeModal(id) {
        const modal = document.getElementById(id);
        modal.classList.remove('modal-open');
        setTimeout(() => {
            modal.classList.add('hidden');
            const openModals = document.querySelectorAll('.modal-open');
            if (openModals.length === 0) {
                 document.getElementById('modal-backdrop').classList.add('opacity-0');
                 setTimeout(() => document.getElementById('modal-backdrop').classList.add('hidden'), 300);
            }
        }, 300);
    },

    closeAllModals() {
        const modals = document.querySelectorAll('[id^="modal-"]');
        modals.forEach(m => {
            if(m.id !== 'modal-backdrop') this.closeModal(m.id);
        });
    },

    setTransactionType(btn, type) {
        const container = btn.parentElement;
        Array.from(container.children).forEach(c => {
            c.classList.remove('bg-white', 'shadow-sm', 'text-brand-black');
            c.classList.add('text-gray-500');
        });

        btn.classList.remove('text-gray-500');
        btn.classList.add('bg-white', 'shadow-sm', 'text-brand-black');

        document.getElementById('trx-type').value = type;

        if (type === 'TRANSFER') {
            document.getElementById('field-category').classList.add('hidden');
            document.getElementById('field-transfer-target').classList.remove('hidden');
            document.getElementById('field-installments').classList.add('hidden'); // No installments for transfer
        } else {
            document.getElementById('field-category').classList.remove('hidden');
            document.getElementById('field-transfer-target').classList.add('hidden');
        }
    },

    checkCardSelected(select) {
        const isCard = select.value.startsWith('card_');
        const installField = document.getElementById('field-installments');
        const type = document.getElementById('trx-type').value;

        if (isCard && type === 'EXPENSE') {
            installField.classList.remove('hidden');
        } else {
            installField.classList.add('hidden');
        }
    },

    async populateTransactionForm() {
        const catSelect = document.getElementById('trx-category');
        const accSelect = document.getElementById('trx-account');
        const targetSelect = document.getElementById('trx-transfer-target');

        catSelect.innerHTML = '<option value="">Selecione...</option>';
        accSelect.innerHTML = '<option value="">Selecione...</option>';
        targetSelect.innerHTML = '<option value="">Selecione...</option>';

        const [cats, accs, cards] = await Promise.all([
            api.getCategories(document.getElementById('trx-type').value === 'INCOME' ? 'INCOME' : 'EXPENSE'),
            api.getAccounts(),
            api.getCards()
        ]);

        cats.forEach(c => {
            catSelect.innerHTML += `<option value="${c.id}">${c.name}</option>`;
        });

        const accGroup = document.createElement('optgroup');
        accGroup.label = 'Contas';
        accs.forEach(a => {
            accGroup.innerHTML += `<option value="${a.id}">${a.name}</option>`;
            targetSelect.innerHTML += `<option value="${a.id}">${a.name}</option>`;
        });
        accSelect.appendChild(accGroup);

        const cardGroup = document.createElement('optgroup');
        cardGroup.label = 'Cartões';
        cards.forEach(c => {
            cardGroup.innerHTML += `<option value="card_${c.id}">${c.name}</option>`;
        });
        accSelect.appendChild(cardGroup);
    },

    async populateImportForm() {
        const catSelect = document.getElementById('import-category');
        const accSelect = document.getElementById('import-account');

        catSelect.innerHTML = '<option value="">Sem categoria (opcional)</option>';
        accSelect.innerHTML = '';

        const [cats, accs] = await Promise.all([
            api.getCategories(), // All types
            api.getAccounts()
        ]);

        cats.forEach(c => {
            catSelect.innerHTML += `<option value="${c.id}">${c.name}</option>`;
        });

        accs.forEach(a => {
            accSelect.innerHTML += `<option value="${a.id}">${a.name}</option>`;
        });
    },

    async populateBudgetForm() {
        const catSelect = document.getElementById('budget-category');
        catSelect.innerHTML = '<option value="">Selecione...</option>';
        const cats = await api.getCategories('EXPENSE');
        cats.forEach(c => {
             catSelect.innerHTML += `<option value="${c.id}">${c.name}</option>`;
        });
    }
};

// --- ROUTER ---
const router = {
    navigate(target) {
        document.querySelectorAll('.view').forEach(el => el.classList.add('hidden'));

        if (target === 'login') {
            document.getElementById('login-view').classList.remove('hidden');
            document.getElementById('app-view').classList.add('hidden');
        } else {
            document.getElementById('login-view').classList.add('hidden');
            document.getElementById('app-view').classList.remove('hidden');
            document.getElementById('app-view').classList.add('flex');

            const viewEl = document.getElementById(`view-${target}`);
            if (viewEl) {
                viewEl.classList.remove('hidden');
                if (target === 'dashboard') ui.renderDashboard();
                if (target === 'transactions') ui.renderTransactions();
                if (target === 'reports') ui.renderReports();
                if (target === 'goals') ui.renderGoals();
                if (target === 'debts') ui.renderDebts();
                if (target === 'investments') ui.renderInvestments();
                if (target === 'budgets') ui.renderBudgets();
            }
        }

        document.querySelectorAll('.nav-item').forEach(btn => {
            if (btn.dataset.target === target) {
                btn.classList.add('active', 'text-brand-orange');
                btn.classList.remove('text-gray-500');
            } else {
                btn.classList.remove('active', 'text-brand-orange');
                btn.classList.add('text-gray-500');
            }
        });
    }
};

// --- EVENT LISTENERS & INIT ---

document.addEventListener('DOMContentLoaded', async () => {
    const isConfigured = await api.init();

    if (!isConfigured) {
        const stored = localStorage.getItem(CONFIG_KEY);
        if(stored) {
             const {url, key} = JSON.parse(stored);
             document.getElementById('cfg-url').value = url;
             document.getElementById('cfg-key').value = key;
        }
    }

    document.getElementById('auth-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const btnText = document.getElementById('auth-btn-text');

        const isSignUp = btnText.innerText === 'Criar Conta';

        try {
            ui.toggleLoading(true);
            if (!supabase) {
                throw new Error("Configure a URL do Supabase primeiro (no código ou via Configurações).");
            }

            if (isSignUp) {
                await api.signUp(email, password);
                showToast('Conta criada! Verifique seu email ou faça login.', 'success');
            } else {
                await api.signIn(email, password);
                router.navigate('dashboard');
            }
        } catch (err) {
            console.error(err);
            showToast(err.message, 'error');
        } finally {
            ui.toggleLoading(false);
        }
    });

    document.getElementById('btn-toggle-auth').addEventListener('click', (e) => {
        const btn = document.getElementById('auth-btn-text');
        if (btn.innerText === 'Entrar') {
            btn.innerText = 'Criar Conta';
            e.target.innerText = 'Já tem conta? Entrar';
        } else {
            btn.innerText = 'Entrar';
            e.target.innerText = 'Não tem conta? Crie agora';
        }
    });

    document.getElementById('logout-btn-desktop').addEventListener('click', api.signOut);
    document.getElementById('logout-btn-mobile').addEventListener('click', api.signOut);

    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.dataset.target;
            router.navigate(target);
        });
    });

    document.getElementById('config-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const url = document.getElementById('cfg-url').value;
        const key = document.getElementById('cfg-key').value;
        if(url && key) {
            localStorage.setItem(CONFIG_KEY, JSON.stringify({ url, key }));
            api.init().then(() => {
                showToast('Configuração salva!', 'success');
                location.reload();
            });
        }
    });

    document.getElementById('form-account').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        try {
            await api.createAccount(Object.fromEntries(formData.entries()));
            showToast('Conta criada!', 'success');
            ui.closeModal('modal-account');
            ui.renderDashboard();
        } catch(err) { showToast(err.message, 'error'); }
    });

    document.getElementById('form-category').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        try {
            await api.createCategory(Object.fromEntries(formData.entries()));
            showToast('Categoria criada!', 'success');
            ui.closeModal('modal-category');
        } catch(err) { showToast(err.message, 'error'); }
    });

     document.getElementById('form-card').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        try {
            await api.createCard(Object.fromEntries(formData.entries()));
            showToast('Cartão criado!', 'success');
            ui.closeModal('modal-card');
        } catch(err) { showToast(err.message, 'error'); }
    });

    document.getElementById('form-goal').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        try {
            await api.createGoal(Object.fromEntries(formData.entries()));
            showToast('Meta criada!', 'success');
            ui.closeModal('modal-goal');
            ui.renderGoals();
        } catch(err) { showToast(err.message, 'error'); }
    });

    document.getElementById('form-debt').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        try {
            await api.createDebt(Object.fromEntries(formData.entries()));
            showToast('Dívida criada!', 'success');
            ui.closeModal('modal-debt');
            ui.renderDebts();
        } catch(err) { showToast(err.message, 'error'); }
    });

    document.getElementById('form-investment').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        try {
            await api.createInvestment(Object.fromEntries(formData.entries()));
            showToast('Investimento salvo!', 'success');
            ui.closeModal('modal-investment');
            ui.renderInvestments();
        } catch(err) { showToast(err.message, 'error'); }
    });

    document.getElementById('form-budget').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        try {
            await api.createBudget(Object.fromEntries(formData.entries()));
            showToast('Orçamento salvo!', 'success');
            ui.closeModal('modal-budget');
            ui.renderBudgets();
        } catch(err) { showToast(err.message, 'error'); }
    });

    document.getElementById('form-transaction').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());

        const accountSelection = document.getElementById('trx-account').value;
        if (accountSelection.startsWith('card_')) {
            data.card_id = accountSelection.replace('card_', '');
            data.account_id = null;
        } else {
            data.account_id = accountSelection;
            data.card_id = null;
        }

        try {
            await api.createTransaction(data);
            showToast('Lançamento salvo!', 'success');
            ui.closeModal('modal-transaction');
            ui.renderDashboard();
            e.target.reset();
        } catch(err) {
            console.error(err);
            showToast('Erro ao salvar.', 'error');
        }
    });

    // Import CSV Logic
    document.getElementById('btn-process-import').addEventListener('click', async () => {
        const fileInput = document.getElementById('csv-file');
        const file = fileInput.files[0];
        const categoryId = document.getElementById('import-category').value || null;
        const accountId = document.getElementById('import-account').value;

        if (!file) {
            showToast('Selecione um arquivo CSV.', 'error');
            return;
        }
        if (!accountId) {
            showToast('Selecione uma conta de destino.', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = async (e) => {
            const text = e.target.result;
            const lines = text.split('\n');
            const payloads = [];

            // Skip header if it exists? simple check for now: try to parse line 0 as date, if fail skip

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;

                const parts = line.split(',');
                if (parts.length < 3) continue;

                const date = parts[0].trim();
                const desc = parts[1].trim();
                const valStr = parts[2].trim();
                const amount = parseFloat(valStr);

                if (isNaN(amount)) continue; // Skip header or invalid

                payloads.push({
                    user_id: currentUser.id,
                    date: date,
                    description: desc,
                    amount: amount,
                    type: amount >= 0 ? 'INCOME' : 'EXPENSE',
                    status: 'CONFIRMED',
                    account_id: accountId,
                    category_id: categoryId
                });
            }

            if (payloads.length === 0) {
                showToast('Nenhum lançamento válido encontrado.', 'error');
                return;
            }

            try {
                ui.toggleLoading(true);
                await api.importTransactions(payloads);
                showToast(`${payloads.length} lançamentos importados!`, 'success');
                ui.closeModal('modal-import');
                ui.renderDashboard();
                fileInput.value = ''; // Reset
            } catch (err) {
                console.error(err);
                showToast('Erro na importação.', 'error');
            } finally {
                ui.toggleLoading(false);
            }
        };
        reader.readAsText(file);
    });

    if (await api.init()) {
        const user = await api.checkAuth();
        if (user) {
            router.navigate('dashboard');
        } else {
            router.navigate('login');
        }
    } else {
        console.log("Waiting for config...");
        router.navigate('login');
    }
});
