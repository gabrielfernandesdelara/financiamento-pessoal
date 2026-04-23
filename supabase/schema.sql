-- =============================================================================
-- Financeiro Pessoal — Schema completo
-- Execute no SQL Editor do painel do Supabase
-- =============================================================================

-- ─── Tabela: compras ──────────────────────────────────────────────────────────
create table if not exists compras (
  id                text        primary key,
  user_id           uuid        not null references auth.users(id) on delete cascade,
  nome              text        not null,
  cartao_ou_pessoa  text        not null,
  total_parcelas    int         null,
  parcelas_restantes int        null,
  data_inicio       date        not null,
  valor_parcela     numeric     not null default 0,
  valor_total       numeric     not null,
  parcelada         boolean     not null default false,
  created_at        timestamptz not null default now()
);

alter table compras enable row level security;

drop policy if exists "compras_user" on compras;
create policy "compras_user" on compras for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─── Tabela: perfil ───────────────────────────────────────────────────────────
create table if not exists perfil (
  id               uuid        primary key default gen_random_uuid(),
  user_id          uuid        not null unique references auth.users(id) on delete cascade,
  salario          numeric     not null default 0,
  bonus            numeric     not null default 0,
  descricao_bonus  text        not null default '',
  saldo_restante   numeric     not null default 0,
  updated_at       timestamptz not null default now()
);

alter table perfil enable row level security;

drop policy if exists "perfil_user" on perfil;
create policy "perfil_user" on perfil for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

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
  created_at          timestamptz not null default now()
);

alter table cobrancas enable row level security;

drop policy if exists "cobrancas_user" on cobrancas;
create policy "cobrancas_user" on cobrancas for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- =============================================================================
-- Cron job: incrementar saldo_restante no 5º dia útil de cada mês
-- Requer: pg_cron habilitado (disponível no plano Pro do Supabase)
-- Para habilitar: Database → Extensions → pg_cron
-- =============================================================================

-- Função que verifica se hoje é o 5º dia útil e atualiza saldo
create or replace function incrementar_saldo_restante()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  quinto_dia_util date;
begin
  -- Encontra o 5º dia útil (seg-sex) do mês corrente
  select d into quinto_dia_util
  from (
    select
      generate_series(
        date_trunc('month', current_date)::date,
        (date_trunc('month', current_date) + interval '1 month' - interval '1 day')::date,
        interval '1 day'
      )::date as d
  ) dias
  where extract(dow from d) not in (0, 6) -- exclui dom e sáb
  order by d
  limit 1 offset 4; -- 5º elemento (0-based)

  -- Só executa se hoje for o 5º dia útil
  if current_date = quinto_dia_util then
    update perfil
    set saldo_restante = saldo_restante + salario,
        updated_at     = now()
    where salario > 0;
  end if;
end;
$$;

-- Agenda execução diária às 08:00 (UTC) — pg_cron necessário
-- select cron.schedule(
--   'incrementar-saldo-5o-dia-util',
--   '0 8 * * *',
--   'select incrementar_saldo_restante()'
-- );
