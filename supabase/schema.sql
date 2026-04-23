-- =============================================================================
-- Financeiro Pessoal — Schema completo (v4)
-- Execute no SQL Editor do painel do Supabase
-- Se as tabelas já existem, use os ALTER TABLE no final do arquivo.
-- =============================================================================

-- ─── Tabela: bonuses ─────────────────────────────────────────────────────────
create table if not exists bonuses (
  id         text        primary key,
  user_id    uuid        not null references auth.users(id) on delete cascade,
  valor      numeric     not null,
  descricao  text        not null,
  recorrente boolean     not null default false,
  created_at timestamptz not null default now()
);
alter table bonuses enable row level security;
drop policy if exists "bonuses_user" on bonuses;
create policy "bonuses_user" on bonuses for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ─── Tabela: compras ──────────────────────────────────────────────────────────
create table if not exists compras (
  id                 text        primary key,
  user_id            uuid        not null references auth.users(id) on delete cascade,
  nome               text        not null,
  cartao_ou_pessoa   text        not null,
  total_parcelas     int         null,
  parcelas_restantes int         null,
  data_inicio        date        not null,
  valor_parcela      numeric     not null default 0,
  valor_total        numeric     not null,
  parcelada          boolean     not null default false,
  categoria          text        not null default 'Outros',
  quitada            boolean     not null default false,
  data_quitada       timestamptz null,
  created_at         timestamptz not null default now()
);
alter table compras enable row level security;
drop policy if exists "compras_user" on compras;
create policy "compras_user" on compras for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ─── Tabela: perfil ───────────────────────────────────────────────────────────
create table if not exists perfil (
  id             uuid        primary key default gen_random_uuid(),
  user_id        uuid        not null unique references auth.users(id) on delete cascade,
  salario        numeric     not null default 0,
  saldo_restante numeric     not null default 0,
  updated_at     timestamptz not null default now()
);
alter table perfil enable row level security;
drop policy if exists "perfil_user" on perfil;
create policy "perfil_user" on perfil for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ─── Tabela: cobrancas ────────────────────────────────────────────────────────
create table if not exists cobrancas (
  id                  text        primary key,
  user_id             uuid        not null references auth.users(id) on delete cascade,
  nome_pessoa         text        not null,
  valor_devido        numeric     not null,
  nome_compra         text        not null,
  eh_parcelado        boolean     not null default false,
  quantidade_parcelas int         null,
  valor_total         numeric     not null,
  data_vencimento     date        not null,
  categoria           text        not null default 'Cobrança',
  created_at          timestamptz not null default now()
);
alter table cobrancas enable row level security;
drop policy if exists "cobrancas_user" on cobrancas;
create policy "cobrancas_user" on cobrancas for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ─── Tabela: previsoes ────────────────────────────────────────────────────────
create table if not exists previsoes (
  id             text        primary key,
  user_id        uuid        not null references auth.users(id) on delete cascade,
  descricao      text        not null,
  valor          numeric     not null default 0,
  data_prevista  date        not null,
  parcelada      boolean     not null default false,
  total_parcelas int         null,
  valor_parcela  numeric     not null default 0,
  categoria      text        not null default 'Previsão',
  created_at     timestamptz not null default now()
);
alter table previsoes enable row level security;
drop policy if exists "previsoes_user" on previsoes;
create policy "previsoes_user" on previsoes for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ─── Índices de performance ───────────────────────────────────────────────────
create index if not exists idx_compras_user_quitada  on compras(user_id, quitada);
create index if not exists idx_compras_created_at    on compras(created_at desc);
create index if not exists idx_cobrancas_user        on cobrancas(user_id);
create index if not exists idx_cobrancas_created_at  on cobrancas(created_at desc);
create index if not exists idx_bonuses_user          on bonuses(user_id);
create index if not exists idx_bonuses_created_at    on bonuses(created_at desc);
create index if not exists idx_previsoes_user        on previsoes(user_id);
create index if not exists idx_previsoes_data        on previsoes(user_id, data_prevista);
create index if not exists idx_perfil_user           on perfil(user_id);

-- =============================================================================
-- Função cron: incrementar saldo_restante no 5º dia útil de cada mês
-- Para habilitar pg_cron: Database → Extensions → pg_cron
-- =============================================================================

create or replace function incrementar_saldo_restante()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  quinto_dia_util date;
begin
  select d into quinto_dia_util
  from (
    select generate_series(
      date_trunc('month', current_date)::date,
      (date_trunc('month', current_date) + interval '1 month' - interval '1 day')::date,
      interval '1 day'
    )::date as d
  ) dias
  where extract(dow from d) not in (0, 6)
  order by d
  limit 1 offset 4;

  if current_date = quinto_dia_util then
    update perfil
    set saldo_restante = saldo_restante + salario,
        updated_at     = now()
    where salario > 0;
  end if;
end;
$$;

-- Agendar (descomente após habilitar pg_cron):
-- select cron.schedule('incrementar-saldo-5o-dia-util', '0 8 * * *', 'select incrementar_saldo_restante()');

-- =============================================================================
-- MIGRATIONS: execute se as tabelas já existem no banco
-- =============================================================================
alter table bonuses add column if not exists recorrente boolean not null default false;
alter table compras  drop column if exists data_quitada;
