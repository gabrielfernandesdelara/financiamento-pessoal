# Financeiro Pessoal

Aplicativo web de controle financeiro pessoal com foco em compras parceladas, cobranças, previsões de gastos e resumo financeiro mensal.

---

## Funcionalidades

| Tela | Descrição |
|------|-----------|
| **Compras** | Listagem de compras ativas com resumo financeiro. Suporte a pagamento de parcelas com controle de quitação. |
| **Painel** | Dashboard com saldo, salário, compras em aberto, cobranças a receber e projeção dos próximos 6 meses. |
| **Adicionar** | Formulários para registrar Compras, Cobranças e gerenciar o Perfil (salário, saldo, bônus). |
| **Histórico** | Feed cronológico de todos os registros: compras (ativas e quitadas), cobranças e bônus. |
| **Previsões** | Planejamento de gastos futuros com suporte a parcelamento e projeção mensal. |
| **Categorias** | Detalhamento de gastos por categoria com gráfico e lista de compras. |
| **Relatórios** | Resumo financeiro completo com receitas, despesas e projeção mensal. |

### Destaques

- **Dark mode** como padrão, com alternância para light mode (preferência salva no navegador)
- **Popup do 5º dia útil** — lembrete mensal para confirmar pagamento de parcelas (uma vez por mês, persiste até confirmação)
- **Pagar parcela** — botão em cada compra que decrementa parcelas restantes e recalcula o valor total em tempo real
- **Resumo financeiro** na tela de Compras: Total do Mês, Valor Total, Sobrou no Mês e Saldo Final
- **Refresh automático de JWT** — token do Supabase renovado silenciosamente antes de expirar

---

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Framework | [Next.js 15](https://nextjs.org) (App Router) |
| Linguagem | TypeScript 5 |
| Estilização | [Tailwind CSS](https://tailwindcss.com) + [shadcn/ui](https://ui.shadcn.com) |
| Banco de dados | [Supabase](https://supabase.com) (PostgreSQL + RLS) |
| Autenticação | [NextAuth v5](https://authjs.dev) (Credentials + Supabase Auth) |
| Estado servidor | [TanStack Query v5](https://tanstack.com/query) |
| Formulários | [React Hook Form](https://react-hook-form.com) + [Zod](https://zod.dev) |
| Gráficos | [Recharts](https://recharts.org) |
| Ícones | [Lucide React](https://lucide.dev) |

---

## Estrutura do Projeto

```
src/
├── app/                        # Rotas Next.js (App Router)
│   ├── page.tsx                # Painel (dashboard)
│   ├── compras/                # Aba Compras
│   ├── adicionar/              # Aba Adicionar (Compra / Perfil / Cobrança)
│   ├── historico/              # Aba Histórico
│   ├── previsoes/              # Aba Previsões
│   ├── categories/             # Aba Categorias
│   ├── reports/                # Aba Relatórios
│   ├── login/                  # Página de login
│   └── api/                    # API Routes (todas protegidas por NextAuth)
│       ├── auth/               # NextAuth handlers
│       ├── compras/            # CRUD + PATCH pagar parcela
│       ├── cobrancas/          # CRUD de cobranças
│       ├── previsoes/          # CRUD de previsões
│       ├── bonuses/            # CRUD de bônus
│       ├── profile/            # GET + PUT perfil
│       └── historico/          # Feed agregado de todos os registros
│
├── components/
│   ├── compras/                # QuintoDiaPopup
│   ├── cobrancas/              # CobrancaForm
│   ├── previsoes/              # PrevisaoForm
│   ├── profile/                # ProfileForm, BonusesList
│   ├── purchases/              # PurchaseForm (formulário de compras)
│   ├── dashboard/              # ChartCard, CategoryPie
│   ├── layout/                 # Sidebar, TopBar, BottomNav, ThemeToggle, nav-items
│   ├── shared/                 # PageHeader, EmptyState, Fab, SignInRequired
│   └── ui/                     # Componentes base (shadcn/ui)
│
├── hooks/                      # React Query hooks por entidade
│   ├── use-compras.ts
│   ├── use-cobrancas.ts
│   ├── use-previsoes.ts
│   ├── use-profile.ts
│   ├── use-bonuses.ts
│   └── use-media-query.ts
│
├── services/
│   ├── sheets.ts               # Todas as operações no Supabase (via service role)
│   ├── compras-client.ts       # Fetch wrappers para /api/compras
│   ├── cobrancas-client.ts
│   ├── previsoes-client.ts
│   ├── bonuses-client.ts
│   └── profile-client.ts
│
├── types/                      # Schemas Zod + tipos TypeScript inferidos
│   ├── compra.ts
│   ├── cobranca.ts
│   ├── previsao.ts
│   ├── profile.ts
│   └── bonus.ts
│
└── lib/
    ├── auth.ts                 # Configuração NextAuth + refresh silencioso de JWT
    ├── supabase.ts             # Clientes Supabase (anon e service role)
    ├── compras-analytics.ts    # Funções de cálculo financeiro (projeção, categorias)
    └── utils.ts                # Formatação de moeda, datas e utilitários CSS
```

---

## Banco de Dados

Todas as tabelas têm **Row Level Security (RLS)** ativado. Cada usuário acessa apenas seus próprios registros.

| Tabela | Descrição |
|--------|-----------|
| `compras` | Compras parceladas e à vista, com controle de parcelas e quitação |
| `cobrancas` | Valores a receber de terceiros |
| `perfil` | Um registro por usuário: salário e saldo restante |
| `bonuses` | Renda extra sem limite de registros por usuário |
| `previsoes` | Planejamento de gastos futuros com suporte a parcelamento |

O script completo de criação está em [`supabase/schema.sql`](supabase/schema.sql) e inclui todas as tabelas, políticas RLS, colunas e índices de performance.

---

## Configuração

### Pré-requisitos

- Node.js 18+
- Conta no [Supabase](https://supabase.com)

### 1. Instalar dependências

```bash
npm install
```

### 2. Variáveis de ambiente

Crie `.env.local` na raiz do projeto:

```env
# NextAuth
AUTH_SECRET=<gere com: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))">
AUTH_URL=http://localhost:3000

# Supabase (Project Settings → API)
SUPABASE_URL=https://<seu-projeto>.supabase.co
SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
```

### 3. Criar as tabelas

No painel do Supabase, acesse **SQL Editor** e execute todo o conteúdo de [`supabase/schema.sql`](supabase/schema.sql).

### 4. Criar o primeiro usuário

Em **Authentication → Users → Add User**, crie um usuário com e-mail e senha.

### 5. Executar

```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000) e faça login.

---

## Notas de Arquitetura

**Service Role no servidor** — Todas as operações no Supabase usam a `service_role_key` nas API Routes. O NextAuth identifica o usuário, e o `user_id` filtra os dados manualmente em cada query. Isso elimina erros de JWT expirado e é o padrão recomendado para ambientes server-side.

**Sem tabela genérica de transações** — Cada entidade financeira tem sua própria tabela (`compras`, `cobrancas`, `previsoes`, `bonuses`), tornando o modelo mais explícito e as queries mais eficientes.

**React Query** — Todo estado de servidor é gerenciado pelo TanStack Query, com cache automático, revalidação e estados de loading/error consistentes em toda a aplicação.
