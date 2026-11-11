# MyCalendar

PWA gratuito para escala de trabalho (12x60, 12x36, 24x48…) e compromissos. Feito para substituir o Shifty.

## Como funciona a escala

1. **Escala automática**: "X horas trabalhando, Y de folga, a partir de uma data". Vale dessa data em diante; criar uma escala nova com data futura não muda o passado.
2. **Edição manual por dia**: pintar um dia como turno ou folga. Sempre vence a escala e sobrevive a mudanças de escala.
3. **Trocas** (fase 3): uma troca aceita vira uma edição com origem `swap` no calendário dos dois.

A lógica fica em `src/lib/schedule.ts`, com testes em `src/lib/schedule.test.ts`.

## Rodando

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # testes da lógica de escala
npm run build    # gera dist/ (site estático)
```

Sem `.env.local` o app abre em **modo demonstração**, com os dados salvos só no navegador.

## Conectando ao Supabase

1. Supabase → SQL Editor → cole e rode `supabase/migrations/001_init.sql`.
2. Authentication → Sign In / Providers → Email: desative **Confirm email** (por enquanto).
3. Copie `.env.example` para `.env.local` e preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` (Project Settings → API). **Nunca** use a chave `service_role` aqui.

## Instalar no celular

PWA só instala por **HTTPS**, então é preciso fazer o deploy de `dist/`. No iPhone: abra no Safari → Compartilhar → "Adicionar à Tela de Início". No Android: o Chrome oferece "Instalar app".
