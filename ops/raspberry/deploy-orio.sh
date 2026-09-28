#!/usr/bin/env bash
set -euo pipefail

readonly ROOT='/home/elfo/services/orio'
readonly REPOSITORY="$ROOT/repository"
readonly RELEASES="$ROOT/releases"
readonly REPOSITORY_URL='https://github.com/elfo399/Orio.git'
readonly DEPLOY_ENV="$ROOT/.env"

command="${SSH_ORIGINAL_COMMAND:-}"
case "$command" in
  deploy\ *) commit="${command#deploy }" ;;
  *)
    echo 'Only "deploy <commit>" is allowed.' >&2
    exit 64
    ;;
esac

[[ "$commit" =~ ^[0-9a-f]{40}$ ]] || { echo 'Expected a full Git commit SHA.' >&2; exit 64; }

install -d -m 0750 "$ROOT" "$RELEASES"

if [[ ! -d "$REPOSITORY/.git" ]]; then
  git clone --no-checkout --single-branch --branch main "$REPOSITORY_URL" "$REPOSITORY"
fi

[[ "$(git -C "$REPOSITORY" remote get-url origin)" == "$REPOSITORY_URL" ]]
git -C "$REPOSITORY" fetch --prune origin main
git -C "$REPOSITORY" cat-file -e "$commit^{commit}"
git -C "$REPOSITORY" merge-base --is-ancestor "$commit" origin/main || {
  echo 'Commit is not on origin/main.' >&2
  exit 65
}

release="$RELEASES/$commit"
if [[ ! -d "$release" ]]; then
  staging="$(mktemp -d "$RELEASES/.${commit}.XXXXXX")"
  trap 'rm -rf "$staging"' EXIT
  git -C "$REPOSITORY" archive "$commit" | tar -x -C "$staging"
  mv "$staging" "$release"
  trap - EXIT
fi

if [[ ! -f "$DEPLOY_ENV" ]]; then
  password="$(od -An -N32 -tx1 /dev/urandom | tr -d ' \n')"
  umask 077
  printf 'POSTGRES_DB=orio\nPOSTGRES_USER=orio\nPOSTGRES_PASSWORD=%s\nDATABASE_URL=postgres://orio:%s@db:5432/orio\nWEB_PORT=18080\n' \
    "$password" "$password" > "$DEPLOY_ENV"
fi

# Source deployments use compose.yaml for local image builds. Make its account policy
# production-safe without printing the generated invite secret to Jenkins logs.
if ! grep -q '^REGISTRATION_MODE=' "$DEPLOY_ENV"; then
  invite_code="$(od -An -N24 -tx1 /dev/urandom | tr -d ' \\n')"
  umask 077
  printf '\nREGISTRATION_MODE=invite\nINVITE_CODES=%s\nSESSION_TTL_DAYS=30\nCOOKIE_SECURE=true\nTRUST_PROXY=true\n' "$invite_code" >> "$DEPLOY_ENV"
fi

cd "$release"
readonly COMPOSE=(docker compose --env-file "$DEPLOY_ENV" -f compose.yaml -f compose.proxy.yaml)
"${COMPOSE[@]}" config --quiet
"${COMPOSE[@]}" build api web
"${COMPOSE[@]}" up -d --wait --wait-timeout 180 --remove-orphans
curl --fail --silent --show-error --max-time 15 http://127.0.0.1:18080/ >/dev/null

ln -sfn "$release" "$ROOT/current"
echo "ORIO deploy complete: $commit"
