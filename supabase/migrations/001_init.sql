-- MyCalendar — Fase 1: calendário pessoal (tipos de turno, escalas, edições por dia, compromissos)
-- Cole este arquivo inteiro no Supabase: Dashboard → SQL Editor → New query → Run.

-- ---------------------------------------------------------------------------
-- Perfis (nome exibido; será usado pelas equipes/trocas nas próximas fases)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Tipos de turno (ex.: "Plantão 08–20")
-- ---------------------------------------------------------------------------
create table public.shift_types (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  code text not null check (char_length(code) between 1 and 3),
  color text not null default '#2563eb',
  start_time time not null,
  end_time time not null,
  created_at timestamptz not null default now()
);
create index shift_types_user_idx on public.shift_types (user_id);

-- ---------------------------------------------------------------------------
-- Escalas: "X horas trabalhando, Y de folga, a partir de anchor_date".
-- A escala vigente num dia é a de maior anchor_date <= aquele dia,
-- então mudar de escala não reescreve o passado.
-- ---------------------------------------------------------------------------
create table public.schedule_patterns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  shift_type_id uuid not null references public.shift_types(id),
  anchor_date date not null,
  on_hours integer not null check (on_hours between 1 and 72),
  off_hours integer not null check (off_hours between 1 and 336),
  created_at timestamptz not null default now(),
  unique (user_id, anchor_date)
);

-- ---------------------------------------------------------------------------
-- Edições por dia (pintar manualmente / trocas). Sempre vencem a escala.
-- shift_type_id nulo = folga.
-- ---------------------------------------------------------------------------
create table public.day_overrides (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  date date not null,
  shift_type_id uuid references public.shift_types(id),
  source text not null default 'manual' check (source in ('manual', 'swap')),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, date)
);

-- ---------------------------------------------------------------------------
-- Compromissos
-- ---------------------------------------------------------------------------
create table public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  date date not null,
  start_time time,
  end_time time,
  note text,
  created_at timestamptz not null default now()
);
create index events_user_date_idx on public.events (user_id, date);

-- ---------------------------------------------------------------------------
-- Segurança (RLS): cada pessoa só enxerga e altera os próprios dados.
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.shift_types enable row level security;
alter table public.schedule_patterns enable row level security;
alter table public.day_overrides enable row level security;
alter table public.events enable row level security;

-- Acesso explícito só para usuários logados (funciona mesmo com
-- "Automatically expose new tables" desligado no projeto).
grant usage on schema public to authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.shift_types, public.schedule_patterns,
  public.day_overrides, public.events to authenticated;

create policy "own profile read" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy "own profile update" on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "own rows" on public.shift_types
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own rows" on public.schedule_patterns
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own rows" on public.day_overrides
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own rows" on public.events
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Ao criar conta: cria o perfil e dois tipos de turno padrão.
-- ---------------------------------------------------------------------------
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', ''));

  insert into public.shift_types (user_id, name, code, color, start_time, end_time)
  values
    (new.id, 'Plantão 08–20', 'D', '#2563eb', '08:00', '20:00'),
    (new.id, 'Plantão 07–19', '7', '#7c3aed', '07:00', '19:00');

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
