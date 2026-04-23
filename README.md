# Finance — Personal money dashboard

Aplicativo web para controle financeiro pessoal com **Next.js 15 + TypeScript**, UI com **Tailwind + shadcn/ui**, autenticacao via **NextAuth + Supabase Auth** e persistencia no **Supabase Postgres**.

## Funcionalidades

- Dashboard com saldo, receitas, despesas e graficos.
- CRUD completo de transacoes.
- CRUD de compras parceladas.
- CRUD de receitas.
- Importacao em lote de transacoes.
- Experiencia mobile-first.

## Stack

- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS + shadcn/ui
- TanStack Query
- React Hook Form + Zod
- NextAuth v5 (Credentials)
- Supabase (Auth + Postgres)

## Configuracao

### 1. Instalar dependencias

```bash
pnpm install
```

### 2. Configurar variaveis de ambiente

Copie [.env.example](.env.example) para `.env.local`:

```bash
cp .env.example .env.local
```

Preencha:

- `AUTH_SECRET`
- `AUTH_URL=http://localhost:3000`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### 3. Criar schema no Supabase

No SQL Editor do Supabase, execute:

```sql
create table if not exists public.transactions (
  id text not null,
  user_id uuid not null,
  date date not null,
  description text not null,
  amount numeric(14,2) not null,
  type text not null check (type in ('income','expense')),
  category text not null,
  recurring boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (id, user_id)
);

create table if not exists public.purchases (
  id text not null,
  user_id uuid not null,
  produto text not null,
  pagar_onde text not null,
  parcela_atual int,
  parcela_total int,
  mes_pagamento text not null,
  valor_parcela numeric(14,2) not null,
  valor_total numeric(14,2) not null,
  dia_para_pagar int,
  created_at timestamptz not null default now(),
  primary key (id, user_id)
);

create table if not exists public.income (
  id text not null,
  user_id uuid not null,
  fonte text not null,
  valor numeric(14,2) not null,
  created_at timestamptz not null default now(),
  primary key (id, user_id)
);

create index if not exists transactions_user_id_idx on public.transactions (user_id);
create index if not exists purchases_user_id_idx on public.purchases (user_id);
create index if not exists income_user_id_idx on public.income (user_id);
```

### 4. Criar usuario no Supabase Auth

Use o painel do Supabase em **Authentication > Users** para criar um usuario com email/senha (ou habilite signup para criar via fluxo proprio).

### 5. Rodar em desenvolvimento

```bash
pnpm dev
```

Abra `http://localhost:3000`.

## Scripts

- `pnpm dev`: sobe servidor local
- `pnpm build`: build de producao
- `pnpm start`: roda build
- `pnpm lint`: linter
- `pnpm typecheck`: validacao TypeScript
