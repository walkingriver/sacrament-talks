#!/usr/bin/env bash
set -euo pipefail

input=$(cat)
command=$(INPUT="$input" node -e 'const i=JSON.parse(process.env.INPUT); process.stdout.write(i.command||"");')

deny() {
  node -e "console.log(JSON.stringify({
    permission: 'deny',
    user_message: process.argv[1],
    agent_message: process.argv[2]
  }))" "$1" "$2"
  exit 0
}

if [[ ! "$command" =~ (^|.*[[:space:]]&&[[:space:]]*)git[[:space:]]+commit ]]; then
  echo '{ "permission": "allow" }'
  exit 0
fi

if [[ "$command" =~ (--no-verify|-n) ]]; then
  deny \
    "git commit --no-verify is blocked in this repo. Fix lint failures instead." \
    "Do not use --no-verify. Run npm run lint, fix violations, then commit."
fi

repo_root="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [[ -z "$repo_root" || ! -f "$repo_root/package.json" ]]; then
  echo '{ "permission": "allow" }'
  exit 0
fi

cd "$repo_root"

if ! npm run lint; then
  deny \
    "Prose lint failed. Run npm run lint and fix violations before committing." \
    "npm run lint failed. Fix ASCII and Vale violations before git commit."
fi

echo '{ "permission": "allow" }'