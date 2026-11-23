#!/bin/bash
cd -- "$(dirname -- "$0")" || exit 1
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
if ! command -v node >/dev/null || ! command -v npm >/dev/null || ! node -e 'process.exit(Number(process.versions.node.split(".")[0])<22?1:0)'; then
  printf '\nЗа онлайн мач инсталирай Node.js 22 или по-нов от https://nodejs.org/ и отвори този файл пак.\n'
  printf 'За самостоятелен драг отвори public/index.html. Натисни Return за край.\n'
  read -r
  exit 1
fi
if [ ! -f node_modules/ws/package.json ]; then
  if ! npm ci --omit=dev; then
    printf '\nИнсталирането на зависимостите не успя. Провери интернет връзката. Натисни Return.\n'
    read -r
    exit 1
  fi
fi
export OPEN_LOCAL_BROWSER=1
npm start
status=$?
if [ "$status" -ne 0 ]; then
  printf '\nСървърът не стартира. Виж грешката по-горе и натисни Return.\n'
  read -r
fi
exit "$status"
