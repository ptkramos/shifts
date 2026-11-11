#!/usr/bin/env bash
# Publica o Shifts na VPS: build local → envia dist/ → troca a pasta do site de uma vez.
#
# Configuração em .env.deploy (fora do Git):
#   DEPLOY_HOST=root@1.2.3.4
#   DEPLOY_KEY=~/.ssh/minha_chave
#   DEPLOY_DIR=/var/www/shifts.psoft.app
set -euo pipefail
cd "$(dirname "$0")/.."

[ -f .env.deploy ] || { echo "Falta o .env.deploy (veja o topo deste script)"; exit 1; }
# shellcheck disable=SC1091
source .env.deploy
KEY="${DEPLOY_KEY/#\~/$HOME}"
SSH=(ssh -i "$KEY" -o BatchMode=yes "$DEPLOY_HOST")

[ -f .env.local ] || { echo "Falta o .env.local com as chaves do Supabase"; exit 1; }

echo "→ testes"
npm test --silent
echo "→ build"
npm run build --silent

REL="$(git rev-parse --short HEAD)$(git diff --quiet || echo '-dirty')"
NEW="$DEPLOY_DIR.new"
echo "→ enviando ($REL)"
"${SSH[@]}" "rm -rf '$NEW' && mkdir -p '$NEW'"
tar -C dist -czf - . | "${SSH[@]}" "tar -C '$NEW' -xzf - && echo '$REL' > '$NEW/.deployed'"
# troca atômica: a pasta antiga vira .old (fica de reserva para voltar atrás)
"${SSH[@]}" "rm -rf '$DEPLOY_DIR.old'; [ -d '$DEPLOY_DIR' ] && mv '$DEPLOY_DIR' '$DEPLOY_DIR.old'; mv '$NEW' '$DEPLOY_DIR'"
echo "✓ publicado $REL"
