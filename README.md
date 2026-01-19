# Sistema Financeiro Pessoal (PFM) — Supabase + HTML/CSS/JS

> **Importante**: este repositório entrega especificação completa + scripts SQL + frontend estático. O frontend **nunca** calcula agregados financeiros; ele consulta **views** e **RPCs** no Supabase. Todo cálculo/fechamento é feito no banco.

## 0) Visão do produto e objetivos

**Objetivo principal**: dar clareza e controle total do dinheiro do usuário, com rastreabilidade end‑to‑end (origem → impacto → histórico → auditoria).

**Personas**
- Assalariado (controle de gastos, faturas, metas).
- Autônomo/freelancer (entradas irregulares, projeções, contas a pagar).
- Estudante (orçamento curto, objetivos de curto prazo).
- Casal/família (contas compartilhadas e responsabilidades).
- Investidor iniciante (carteira simples, aportes, resgates).

**Princípios**
- Simplicidade com rastreabilidade: tudo tem origem e impacto claro.
- Operação contínua e consistente por anos (sem “fechar manualmente”).
- Dados confiáveis: nada de duplicação silenciosa ou lacunas.

**Offline/Online e multi‑dispositivo**
- Online first; dados sincronizados via Supabase.
- Multi‑dispositivo (mobile/desktop) com sessão persistente.

**LGPD e segurança**
- Mínimo necessário de dados pessoais.
- RLS habilitada em todas as tabelas expostas.
- Controle de exportação, anonimização e exclusão.

---

## 1) Mapa de Módulos (lista completa)

Para cada módulo: objetivo, funcionalidades, telas, regras e eventos.

### 1. Onboarding e perfil do usuário
- **Objetivo**: iniciar contas, preferências e metas base.
- **Funcionalidades**: perfil, moeda, alertas, método de login, preferências.
- **Telas/Ações**: cadastro/login, wizard inicial, editar perfil.
- **Regras**: criar perfil ligado ao `auth.users` e preferências padrão.
- **Eventos**: `PROFILE_CREATED`, `PREFERENCES_UPDATED`.

### 2. Contas e saldo (bancos, carteiras, dinheiro, cartão)
- **Objetivo**: centralizar saldo e movimentações.
- **Funcionalidades**: contas bancárias, carteira, poupança, conjunta.
- **Telas**: lista de contas, detalhe, criação/edição.
- **Regras**: conta não pode ser excluída se tiver transações.
- **Eventos**: `ACCOUNT_CREATED`, `ACCOUNT_UPDATED`.

### 3. Lançamentos (receitas, despesas, transferências)
- **Objetivo**: registrar tudo que afeta o caixa.
- **Funcionalidades**: receita, despesa, transferência, ajuste.
- **Telas**: lista, criar, editar, conciliar.
- **Regras**: status e datas de competência/caixa.
- **Eventos**: `TRANSACTION_CREATED`, `TRANSACTION_RECONCILED`.

### 4. Categorias e regras
- **Objetivo**: classificar para relatórios, orçamento e metas.
- **Funcionalidades**: categorias, subcategorias, regras automáticas.
- **Telas**: CRUD de categorias/regras.
- **Regras**: não excluir categoria usada; arquivar.
- **Eventos**: `CATEGORY_UPDATED`, `RULE_APPLIED`.

### 5. Cartões de crédito
- **Objetivo**: controlar faturas, limite e parcelamentos.
- **Funcionalidades**: faturas, fechamento, pagamento, parcelamento.
- **Telas**: cartão, faturas, detalhes de parcela.
- **Regras**: fatura fechada não muda itens (exceto ajustes auditados).
- **Eventos**: `INVOICE_CLOSED`, `INVOICE_PAID`, `INSTALLMENT_CREATED`.

### 6. Assinaturas/recorrências
- **Objetivo**: previsibilidade de gastos e entradas.
- **Funcionalidades**: recorrência, geração automática, alertas.
- **Telas**: lista de recorrências, criação/edição.
- **Regras**: gerador cria transações previstas/confirmadas.
- **Eventos**: `RECURRENCE_RUN`.

### 7. Contas a pagar (boletos, lembretes)
- **Objetivo**: nunca perder vencimentos.
- **Funcionalidades**: lembretes, vencimentos, anexos.
- **Telas**: calendário financeiro, contas a pagar.
- **Regras**: vencimento gera alerta e previsão de caixa.
- **Eventos**: `BILL_DUE_SOON`.

### 8. Orçamentos e limites
- **Objetivo**: controle de limites por categoria.
- **Funcionalidades**: orçamento mensal, alertas de estouro.
- **Telas**: orçamento por categoria, resumo mensal.
- **Regras**: alerta quando atingir percentual definido.
- **Eventos**: `BUDGET_THRESHOLD_REACHED`.

### 9. Metas
- **Objetivo**: poupar com objetivos claros.
- **Funcionalidades**: metas, aportes, acompanhamento.
- **Telas**: metas, detalhes de progresso.
- **Regras**: aporte impacta conta e meta.
- **Eventos**: `GOAL_CONTRIBUTION`.

### 10. Dívidas e empréstimos
- **Objetivo**: controlar juros, amortizações e parcelas.
- **Funcionalidades**: contratos, parcelas, pagamentos.
- **Telas**: dívida, parcelas, pagamento.
- **Regras**: amortização reduz saldo devedor.
- **Eventos**: `DEBT_PAYMENT_POSTED`.

### 11. Investimentos
- **Objetivo**: controlar aportes, resgates e posição.
- **Funcionalidades**: carteira, aportes, rendimentos.
- **Telas**: investimentos, movimentações.
- **Regras**: resgate impacta caixa.
- **Eventos**: `INVESTMENT_MOVEMENT_POSTED`.

### 12. Planejamento (cenários e projeções)
- **Objetivo**: visão do futuro do caixa.
- **Funcionalidades**: projeções de saldo e compromissos.
- **Telas**: projeção mensal, próximos vencimentos.
- **Regras**: inclui recorrências e parcelas futuras.
- **Eventos**: `FORECAST_REFRESHED`.

### 13. Relatórios
- **Objetivo**: visão analítica do dinheiro.
- **Funcionalidades**: fluxo de caixa, categorias, DRE pessoal.
- **Telas**: relatórios e gráficos.
- **Regras**: dados sempre de views/resumos.
- **Eventos**: `REPORT_VIEWED`.

### 14. Importação e integrações
- **Objetivo**: evitar trabalho manual.
- **Funcionalidades**: CSV/OFX, dedupe, preview.
- **Telas**: importação, conciliação.
- **Regras**: deduplicação por hash.
- **Eventos**: `IMPORT_COMPLETED`.

### 15. Notificações e alertas
- **Objetivo**: avisos proativos.
- **Funcionalidades**: saldo baixo, fatura fechou, vencimento.
- **Telas**: preferências de alertas.
- **Regras**: trigger baseado em view de compromissos.
- **Eventos**: `ALERT_SENT`.

### 16. Compartilhamento familiar
- **Objetivo**: gestão conjunta com permissões.
- **Funcionalidades**: household, membros, papéis.
- **Telas**: gestão de família.
- **Regras**: owner controla permissões.
- **Eventos**: `MEMBER_INVITED`.

### 17. Tags, anexos e comprovantes
- **Objetivo**: enriquecer contextos.
- **Funcionalidades**: tags, anexos, upload.
- **Telas**: anexos em transações.
- **Regras**: arquivos isolados por usuário.
- **Eventos**: `ATTACHMENT_UPLOADED`.

### 18. Auditoria / histórico / desfazer
- **Objetivo**: rastreio completo.
- **Funcionalidades**: logs, histórico, revert.
- **Telas**: auditoria por registro.
- **Regras**: alterações pós‑conciliação geram log.
- **Eventos**: `AUDIT_LOGGED`.

### 19. Configurações
- **Objetivo**: preferências gerais.
- **Funcionalidades**: moeda, formatos, backups.
- **Telas**: configurações.
- **Regras**: validações de idioma/moeda.
- **Eventos**: `SETTINGS_UPDATED`.

### 20. Administração
- **Objetivo**: suporte e anti‑fraude.
- **Funcionalidades**: logs, bloqueio, auditoria.
- **Telas**: painel administrativo.
- **Regras**: ações registradas.
- **Eventos**: `ADMIN_ACTION`.

---

## 2) Cadastros (o que deve ser cadastrado em cada item)

> **Regra obrigatória**: todo item selecionável tem cadastro próprio, com CRUD e botão “+ Cadastrar novo” no fluxo.

### 2.1 Perfil do usuário
- **Por que existe**: personalização e preferências.
- **Campos obrigatórios**: `full_name` (texto, min 2), `currency` (ISO, ex.: BRL), `timezone` (ex.: America/Sao_Paulo).
- **Campos opcionais**: `phone`, `birth_date`.
- **Relacionamentos**: `profiles` → `auth.users`.
- **Regras**: não excluir; apenas anonimizar.
- **Casos especiais**: perfil de responsável familiar.
- **Exemplo**: “Ana Souza”, BRL, America/Sao_Paulo.
- **Telas**: criar/editar, lista não aplicável.

### 2.2 Contas
- **Por que existe**: base do saldo.
- **Campos obrigatórios**: `name` (texto), `type` (bank/cash/wallet/investment), `opening_balance` (numérico), `institution_id`.
- **Opcionais**: `color`, `note`.
- **Relacionamentos**: transações, cartões.
- **Regras**: não excluir se usado; permitir arquivar.
- **Exemplo**: “Conta Itaú”, bank, 1200.
- **Telas**: criar/editar/listar/arquivar.

### 2.3 Instituições financeiras
- **Campos obrigatórios**: `name`, `type` (bank/broker), `code` (ex.: 341).
- **Regras**: não excluir se usado.

### 2.4 Cartões
- **Campos obrigatórios**: `name`, `limit_amount`, `closing_day`, `due_day`.
- **Opcionais**: `last4`, `timezone`.
- **Relacionamentos**: faturas, parcelas.

### 2.5 Categorias
- **Campos obrigatórios**: `name`, `type` (income/expense), `icon`.
- **Opcionais**: `parent_id`.
- **Regras**: não excluir se usado; arquivar.

### 2.6 Tags
- **Campos obrigatórios**: `name`, `color`.

### 2.7 Centros
- **Campos obrigatórios**: `name`, `type` (pessoal/casa/carro/empresa).

### 2.8 Regras automáticas
- **Campos obrigatórios**: `name`, `match_type`, `pattern`, `category_id`.

### 2.9 Favorecidos
- **Campos obrigatórios**: `name`, `type` (person/company).

### 2.10 Recorrências
- **Campos obrigatórios**: `name`, `cadence`, `amount`, `kind`, `next_run`.

### 2.11 Metas
- **Campos obrigatórios**: `name`, `target_amount`, `target_date`.

### 2.12 Dívidas/Empréstimos
- **Campos obrigatórios**: `name`, `principal`, `interest_rate`, `term_months`.

### 2.13 Investimentos
- **Campos obrigatórios**: `name`, `type`, `institution_id`.

### 2.14 Anexos
- **Campos obrigatórios**: `storage_path`, `linked_table`, `linked_id`.

### 2.15 Notificações
- **Campos obrigatórios**: `channel`, `trigger`, `enabled`.

> Os detalhes completos de campos, validações e exemplos estão no **schema SQL** (db/schema.sql).

---

## 3) Lançamentos: modelo único e completo

- **Tipos**: receita, despesa, transferência, ajuste, estorno, chargeback.
- **Competência vs caixa**: `occurred_on` (competência), `posted_on` (caixa).
- **Parcelamentos**: `card_installments`.
- **Split**: `transaction_splits`.
- **Status**: `planned`, `posted`, `reconciled`, `canceled`.
- **Fonte**: `manual`, `import`, `rule`, `integration`.
- **Anexos**: `attachments`.

Regras principais:
- Após conciliado, alterações críticas geram **auditoria**.
- Lançamentos com split devem somar o total do lançamento.

---

## 4) Fluxos ponta a ponta (conversa entre módulos)

1. **Onboarding → contas → categorias → lançamento**
   - Eventos: `PROFILE_CREATED`, `ACCOUNT_CREATED`, `TRANSACTION_CREATED`.
2. **Despesa no débito → baixa → conciliação → relatório**
   - Eventos: `TRANSACTION_POSTED`, `TRANSACTION_RECONCILED`.
3. **Compra no cartão → fatura → fechamento → pagamento**
   - RPC: `rpc_close_card_invoice`, `rpc_pay_card_invoice`.
4. **Compra parcelada**
   - RPC: `rpc_generate_card_installments`.
5. **Assinatura recorrente**
   - RPC: `rpc_generate_recurrences`.
6. **Boleto a pagar**
   - Transação + anexo, aviso por view.
7. **Transferência entre contas**
   - RPC: `rpc_make_transfer`.
8. **Meta**
   - Aporte registrado como transação ligada à meta.
9. **Dívida**
   - Parcelas + pagamento -> saldo.
10. **Investimentos**
   - Aporte/resgate -> caixa.
11. **Orçamento**
   - View de consumo vs limite.
12. **Importação CSV**
   - Deduplicação via hash.
13. **Estorno/chargeback**
   - Transação vinculada com status e auditoria.

---

## 5) Regras de negócio críticas

- Deduplicação por hash (`source_hash`).
- Prioridade de regras automáticas por ordem e ativação.
- Conciliação manual/automática.
- Pagamento parcial de fatura.
- Estorno de parcela específica.
- Alterar categoria após conciliação gera auditoria.
- Conta conjunta divide por membros.
- Ajustes de saldo no início (transação de ajuste).
- Mudança de fechamento do cartão afeta período de fatura.

---

## 6) Relatórios e insights

Todos via **views** no banco:
- Fluxo de caixa (diário/semanal/mensal).
- Gastos por categoria/tag.
- Patrimônio (contas + investimentos − dívidas).
- Fatura do cartão: histórico e comprometimento futuro.
- Projeções de próximos vencimentos.
- DRE pessoal.

Veja **db/schema.sql** para views: `v_account_balances`, `v_monthly_category_totals`, `v_cashflow_monthly`, `v_net_worth`, `v_upcoming_commitments`.

---

## 7) Estrutura de dados

Entidades principais: `profiles`, `accounts`, `cards`, `transactions`, `transaction_splits`, `payees`, `categories`, `tags`, `budgets`, `goals`, `debts`, `debt_installments`, `investments`, `investment_movements`, `attachments`, `audit_log`.

Relacionamentos, índices e triggers estão no **schema SQL**.

---

## 8) Integrações e importações

- CSV/OFX com preview e dedupe.
- Exportação CSV/PDF.
- Open Finance (conceitual): conexão via consentimento e import incremental.

---

## 9) Permissões e segurança

- Conta individual e família (`households`).
- Papéis: owner, editor, viewer.
- RLS total em tabelas.
- Criptografia de tokens e dados sensíveis.

---

## 10) UX: telas mínimas

- Dashboard
- Lançamentos
- Calendário financeiro
- Fatura do cartão
- Contas
- Metas
- Orçamentos
- Dívidas
- Investimentos
- Importação/Conciliação
- Relatórios
- Configurações

Todas com estados vazios, erros e ações principais.

---

## 11) Checklist final de completude

- [ ] Cadastros completos e conectados.
- [ ] Fluxos ponta a ponta funcionais.
- [ ] Relatórios via views/RPCs (sem cálculo no frontend).
- [ ] RLS em todas as tabelas.
- [ ] Storage com políticas por usuário.
- [ ] UX responsivo e acessível.

---

# 1) Setup do Supabase (passo a passo)

1. **Criar projeto** no Supabase Dashboard.
2. Copiar **Project URL** e **Publishable/Anon Key** (Settings → API).
3. Habilitar Auth **email/senha** em Authentication → Providers.
4. No SQL Editor, executar na ordem:
   - `db/schema.sql`
   - `db/rls.sql`
   - `db/storage.sql`
5. Inserir dados iniciais (opcional): `db/seed.sql` (quando criado).
6. Criar `public/config.js` usando `public/config.example.js`.

---

# 2) Modelo de dados completo (SQL)

Veja `db/schema.sql`.

---

# 3) RLS e Policies (SQL)

Veja `db/rls.sql`.

---

# 4) Storage

Veja `db/storage.sql`.

---

# 5) Frontend (HTML/CSS/JS)

Arquivos:
- `public/index.html`
- `public/styles.css`
- `public/app.js`
- `public/config.example.js`

Rodar localmente:

```bash
cd public
python3 -m http.server 8080
```

Abrir `http://localhost:8080`.

---

# 7) Configuração por ENV

Crie `public/config.js` com:

```js
window.__SUPABASE__ = {
  url: "https://SEU-PROJETO.supabase.co",
  anonKey: "SUA_ANON_KEY"
};
```

Esse arquivo é ignorado no Git.

---

## Observações de segurança

- **Nunca** usar `service_role` no browser.
- Toda tabela exposta tem RLS.
- O frontend chama RPCs para operações críticas.
