-- Ícone opcional por compromisso (id de um ícone do app, ex.: 'dentist', 'gym').
alter table public.events
  add column icon text check (icon is null or char_length(icon) <= 32);
