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
alter table bonuses    add column if not exists recorrente             boolean not null default false;
alter table compras    add column if not exists dividida               boolean not null default false;
alter table compras    add column if not exists adicionado_por         text    null;
alter table compras    add column if not exists sem_data_termino       boolean not null default false;
alter table compras    add column if not exists dividido_com           text    null;
alter table compras    drop column if exists data_quitada;
alter table cobrancas  add column if not exists compra_origem_id       text    null;
alter table cobrancas  add column if not exists valor_parcela_dividida numeric null;
alter table perfil     add column if not exists username               text    null;
alter table previsoes  add column if not exists recorrente             boolean not null default false;

-- Username deve ser único (ignora nulos)
create unique index if not exists idx_perfil_username on perfil(lower(username))
  where username is not null;

create index if not exists idx_perfil_username_lookup on perfil(username)
  where username is not null;

-- =============================================================================
-- FUNÇÕES RPC — execute para habilitar Histórico e busca de usuário
-- =============================================================================

-- Histórico unificado com suporte a dividido_com
drop function if exists get_historico(uuid);
create or replace function get_historico(p_user_id uuid)
returns table(
  id           text,
  tipo         text,
  titulo       text,
  subtitulo    text,
  valor        numeric,
  data_ref     text,
  info         text,
  dividido_com text
)
language sql
security definer
set search_path = public, pg_temp
as $$
  select h.id, h.tipo, h.titulo, h.subtitulo, h.valor, h.data_ref, h.info, h.dividido_com
  from (
    select c.id::text, 'compra'::text, c.nome, c.cartao_ou_pessoa,
      c.valor_total, c.data_inicio::text,
      case when c.parcelada
        then coalesce(c.parcelas_restantes, c.total_parcelas)::text || ' parcelas restantes'
        else 'À vista'
      end,
      c.dividido_com
    from compras c where c.user_id = p_user_id

    union all

    select cb.id::text, 'cobranca'::text, cb.nome_pessoa, cb.nome_compra,
      cb.valor_devido, cb.data_vencimento::text, 'A receber', null::text
    from cobrancas cb where cb.user_id = p_user_id

    union all

    select b.id::text, 'bonus'::text, 'Bônus: ' || b.descricao, 'Renda extra',
      b.valor, b.created_at::text, null::text, null::text
    from bonuses b where b.user_id = p_user_id
  ) as h(id, tipo, titulo, subtitulo, valor, data_ref, info, dividido_com)
  order by 6 desc;
$$;

-- Busca de usuário por email (interno — usado pelo authorize do login)
create or replace function find_user_by_email(p_email text)
returns uuid
language sql
security definer
set search_path = auth, public, pg_temp
as $$
  select id from auth.users where email = p_email limit 1;
$$;

-- Busca de usuário por username (para compras divididas)
create or replace function find_user_by_username(p_username text)
returns uuid
language sql
security definer
set search_path = public, pg_temp
as $$
  select user_id from public.perfil
  where lower(username) = lower(p_username)
  limit 1;
$$;
