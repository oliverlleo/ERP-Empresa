# Sistema Financeiro Pessoal (Supabase + JS)

Este é um sistema de Gestão Financeira Pessoal (PFM) completo, rodando inteiramente no navegador (HTML/JS/CSS) e utilizando o Supabase como backend (Banco de Dados + Autenticação + Regras de Segurança).

## 🚀 Passo 1: Configuração do Supabase

Você precisa criar um projeto no Supabase para hospedar o banco de dados.

1.  Acesse [database.new](https://database.new) e crie um novo projeto.
2.  Aguarde o projeto ser criado (leva 1-2 minutos).
3.  Vá em **Project Settings > API**.
4.  Copie a **Project URL** e a **anon public key**. Você precisará delas no Passo 3.

## 🗄️ Passo 2: Criar o Banco de Dados

Você deve rodar o script SQL fornecido para criar as tabelas e regras de segurança.

1.  No dashboard do Supabase, vá em **SQL Editor** (ícone na barra lateral esquerda).
2.  Clique em **+ New Query**.
3.  Copie TODO o conteúdo do arquivo `schema.sql` (nesta pasta).
4.  Cole no editor SQL do Supabase.
5.  Clique em **Run** (botão verde no canto inferior direito).

> **O que isso faz?** Cria as tabelas (transações, contas, categorias), ativa a segurança (RLS), cria gatilhos automáticos (atualização de saldo) e views para relatórios.

## 🖥️ Passo 3: Rodar a Aplicação

Como o app roda no navegador, você não precisa instalar Node.js ou npm.

1.  Abra o arquivo `index.html` em qualquer navegador (Chrome, Edge, Firefox).
    *   Você pode apenas dar dois cliques no arquivo no seu computador.
2.  Ao abrir, você verá a tela de Login.
3.  Vá para a aba **Configurações** (ou se o app não carregar, ele pode pedir configuração).
    *   *Nota:* No primeiro acesso, tente fazer Login. Se não funcionar, insira suas credenciais do Supabase.
4.  Para facilitar, vá na aba **Configurações** (engrenagem) > **Conexão Supabase**.
5.  Cole sua **URL** e **Anon Key**. Clique em Salvar.
6.  Recarregue a página.

## ✨ Funcionalidades

1.  **Dashboard**: Visão geral de saldo, receitas e despesas do mês.
2.  **Lançamentos**: Adicionar receitas, despesas e transferências.
    *   Suporte a contas bancárias e cartões de crédito.
    *   Categorização automática (ícones e cores).
3.  **Cadastros (Modais)**:
    *   Criar novas Contas (Carteira, Banco).
    *   Criar novas Categorias.
    *   Criar novos Cartões de Crédito.
4.  **Segurança**:
    *   Seus dados são protegidos. Um usuário não vê os dados de outro (RLS garantido no banco).

## 🛠️ Estrutura de Arquivos

*   `index.html`: Estrutura da interface e templates de modais.
*   `style.css`: Estilização minimalista (Branco/Preto/Laranja) e animações.
*   `app.js`: Toda a lógica da aplicação (Auth, API, UI) em um único arquivo modular.
*   `schema.sql`: O "cérebro" do sistema (Tabelas, Views e Policies).

## ⚠️ Notas Importantes

*   **Cálculos no Servidor**: O saldo das contas é atualizado automaticamente pelo banco de dados (Trigger SQL) quando você adiciona uma transação. O frontend apenas exibe o valor.
*   **Mobile-First**: O layout foi desenhado para funcionar perfeitamente em celulares.
