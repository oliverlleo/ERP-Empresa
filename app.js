
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
    // Add timezone offset correction if needed, but usually Supabase returns UTC
    // Display in local time
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
        // Mock full name for now or add field
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
        // Use the view created in SQL
        const { data, error } = await supabase.from('view_dashboard_summary').select('*').single();
        if (error && error.code !== 'PGRST116') throw error; // PGRST116 is 0 rows
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

    // --- CREATION ---
    async createTransaction(payload) {
        // Basic Logic:
        // If it's expense/income: Insert transaction.
        // Trigger in SQL handles account balance update.

        // Convert empty strings to null for UUIDs
        if (!payload.account_id) payload.account_id = null;
        if (!payload.card_id) payload.card_id = null;
        if (!payload.transfer_account_id) payload.transfer_account_id = null;

        const { data, error } = await supabase.from('transactions').insert(payload).select();
        if (error) throw error;
        return data[0];
    },

    async createAccount(payload) {
        const { data, error } = await supabase.from('accounts').insert(payload).select();
        if (error) throw error;
        return data;
    },

    async createCategory(payload) {
         // Default icon if missing
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

                    // Secure Element Creation
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

                    // Safe Text Insertion
                    row.querySelector('.trunc-desc').textContent = t.description;
                    row.querySelector('.trunc-sub').textContent = `${t.accounts?.name || 'Cartão'} • ${formatDate(t.date)}`;

                    listEl.appendChild(row);
                });
            }

            // Render Date
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
        // Reuse recent fetch for now, but usually needs a dedicated paginated fetch
        // For simplicity, we just fetch last 50
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

                    // Secure Element Creation
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

                    // Safe Text Insertion
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

    // --- REPORTS RENDER ---
    async renderReports() {
        try {
             const data = await api.getCategoryReport();
             // Simple grouping by category name
             const grouped = {};
             data.forEach(item => {
                 if(!grouped[item.category_name]) grouped[item.category_name] = 0;
                 grouped[item.category_name] += item.total_amount;
             });

             const ctx = document.getElementById('chart-categories').getContext('2d');

             // Destroy existing if needed (simple check)
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

        // Populate selects if needed
        if (id === 'modal-transaction') this.populateTransactionForm();

        // Small timeout for transition
        setTimeout(() => modal.classList.add('modal-open'), 10);
    },

    closeModal(id) {
        const modal = document.getElementById(id);
        modal.classList.remove('modal-open');
        setTimeout(() => {
            modal.classList.add('hidden');
            // Check if any other modal is open
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
        // Reset styles
        const container = btn.parentElement;
        Array.from(container.children).forEach(c => {
            c.classList.remove('bg-white', 'shadow-sm', 'text-brand-black');
            c.classList.add('text-gray-500');
        });

        // Active style
        btn.classList.remove('text-gray-500');
        btn.classList.add('bg-white', 'shadow-sm', 'text-brand-black');

        document.getElementById('trx-type').value = type;

        // Toggle Fields
        if (type === 'TRANSFER') {
            document.getElementById('field-category').classList.add('hidden');
            document.getElementById('field-transfer-target').classList.remove('hidden');
        } else {
            document.getElementById('field-category').classList.remove('hidden');
            document.getElementById('field-transfer-target').classList.add('hidden');
        }
    },

    async populateTransactionForm() {
        const catSelect = document.getElementById('trx-category');
        const accSelect = document.getElementById('trx-account');
        const targetSelect = document.getElementById('trx-transfer-target');

        // Clear
        catSelect.innerHTML = '<option value="">Selecione...</option>';
        accSelect.innerHTML = '<option value="">Selecione...</option>';
        targetSelect.innerHTML = '<option value="">Selecione...</option>';

        // Fetch
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
            targetSelect.innerHTML += `<option value="${a.id}">${a.name}</option>`; // Targets can only be accounts
        });
        accSelect.appendChild(accGroup);

        const cardGroup = document.createElement('optgroup');
        cardGroup.label = 'Cartões';
        cards.forEach(c => {
            cardGroup.innerHTML += `<option value="card_${c.id}">${c.name}</option>`;
        });
        accSelect.appendChild(cardGroup);
    }
};

// --- ROUTER ---
const router = {
    navigate(target) {
        // Hide all views
        document.querySelectorAll('.view').forEach(el => el.classList.add('hidden'));

        // Hide/Show Auth vs App
        if (target === 'login') {
            document.getElementById('login-view').classList.remove('hidden');
            document.getElementById('app-view').classList.add('hidden');
        } else {
            document.getElementById('login-view').classList.add('hidden');
            document.getElementById('app-view').classList.remove('hidden');
            document.getElementById('app-view').classList.add('flex'); // Ensure flex display

            // Show target view
            const viewEl = document.getElementById(`view-${target}`);
            if (viewEl) {
                viewEl.classList.remove('hidden');
                // Trigger Loaders
                if (target === 'dashboard') ui.renderDashboard();
                if (target === 'transactions') ui.renderTransactions();
                if (target === 'reports') ui.renderReports();
            }
        }

        // Update Nav State
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
    // 1. Init API
    const isConfigured = await api.init();

    if (!isConfigured) {
        // If not configured, show Settings only or prompt
        // For now, we allow login screen but functionality will fail until config is set
        // Better: Pre-fill config form in Settings if locally stored
        const stored = localStorage.getItem(CONFIG_KEY);
        if(stored) {
             const {url, key} = JSON.parse(stored);
             document.getElementById('cfg-url').value = url;
             document.getElementById('cfg-key').value = key;
        }
    }

    // 2. Auth Listeners
    document.getElementById('auth-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const btnText = document.getElementById('auth-btn-text');

        // Simple toggle state check (Sign In vs Sign Up)
        const isSignUp = btnText.innerText === 'Criar Conta';

        try {
            ui.toggleLoading(true);
            // Check if config exists
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

    // Logout
    document.getElementById('logout-btn-desktop').addEventListener('click', api.signOut);
    document.getElementById('logout-btn-mobile').addEventListener('click', api.signOut);

    // Navigation
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.dataset.target;
            router.navigate(target);
        });
    });

    // Config Save
    document.getElementById('config-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const url = document.getElementById('cfg-url').value;
        const key = document.getElementById('cfg-key').value;
        if(url && key) {
            localStorage.setItem(CONFIG_KEY, JSON.stringify({ url, key }));
            api.init().then(() => {
                showToast('Configuração salva!', 'success');
                // Reload to refresh client
                location.reload();
            });
        }
    });

    // Forms
    document.getElementById('form-account').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        try {
            await api.createAccount(Object.fromEntries(formData.entries()));
            showToast('Conta criada!', 'success');
            ui.closeModal('modal-account');
            ui.renderDashboard(); // Refresh
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

    document.getElementById('form-transaction').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());

        // Adjust Account/Card ID logic
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

    // Check Session on Load
    if (await api.init()) {
        const user = await api.checkAuth();
        if (user) {
            router.navigate('dashboard');
        } else {
            router.navigate('login');
        }
    } else {
        // No config found, stay on login but maybe hint to user
        console.log("Waiting for config...");
        router.navigate('login'); // Default view
    }
});
