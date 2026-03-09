#!/usr/bin/env bash
# ============================================================================
# dev-cleanup.sh — Kill stale OpenFlat dev processes & free bound ports
# ============================================================================
# Usage:
#   ./dev-cleanup.sh              Kill all stale dev processes (SIGTERM)
#   ./dev-cleanup.sh --force      Use SIGKILL for stubborn processes
#   ./dev-cleanup.sh --containers Also stop Docker/Podman containers
#   ./dev-cleanup.sh --db-reset   Nuke DB container + volume (fresh migrations)
#   ./dev-cleanup.sh --dry-run    Show what would be killed (no action)
#   ./dev-cleanup.sh --all        Force + containers + db-reset
# ============================================================================
set -uo pipefail

# ── Colours & helpers ───────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'
BOLD='\033[1m'; NC='\033[0m'

info()  { printf "${CYAN}[info]${NC}  %s\n" "$*"; }
ok()    { printf "${GREEN}[ok]${NC}    %s\n" "$*"; }
warn()  { printf "${YELLOW}[warn]${NC}  %s\n" "$*"; }
err()   { printf "${RED}[err]${NC}   %s\n" "$*"; }

killed=0

# ── Parse flags ─────────────────────────────────────────────────────────────
FORCE=false
CONTAINERS=false
DB_RESET=false
DRY_RUN=false

for arg in "$@"; do
  case "$arg" in
    --force)      FORCE=true ;;
    --containers) CONTAINERS=true ;;
    --db-reset)   DB_RESET=true ;;
    --dry-run)    DRY_RUN=true ;;
    --all)        FORCE=true; CONTAINERS=true; DB_RESET=true ;;
    -h|--help)
      head -n 11 "$0" | tail -n 8
      exit 0
      ;;
    *)
      err "Unknown option: $arg"
      head -n 11 "$0" | tail -n 8
      exit 1
      ;;
  esac
done

SIG="SIGTERM"
$FORCE && SIG="SIGKILL"

echo ""
printf "${BOLD}══════════════════════════════════════════════════════════════${NC}\n"
printf "${BOLD}  OpenFlat Dev Cleanup${NC}"
$DRY_RUN && printf "  ${YELLOW}(dry-run)${NC}"
echo ""
printf "${BOLD}══════════════════════════════════════════════════════════════${NC}\n"
echo ""

# ── Helper: kill processes matching a pattern ───────────────────────────────
kill_by_pattern() {
  local label="$1"
  local pattern="$2"

  local pids
  # Exclude this script and grep itself from matches
  pids=$(pgrep -f "$pattern" 2>/dev/null | grep -v "^$$\$" || true)

  if [[ -z "$pids" ]]; then
    info "$label — no matching processes"
    return
  fi

  local count
  count=$(echo "$pids" | wc -l)

  if $DRY_RUN; then
    warn "$label — would kill $count process(es) [$SIG]:"
    for pid in $pids; do
      local cmd
      cmd=$(ps -p "$pid" -o args= 2>/dev/null || echo "(already exited)")
      printf "        PID %-8s %s\n" "$pid" "$cmd"
    done
  else
    for pid in $pids; do
      kill -s "$SIG" "$pid" 2>/dev/null || true
    done
    ok "$label — sent $SIG to $count process(es)"
    killed=$((killed + count))
  fi
}

# ── Helper: free a specific port ────────────────────────────────────────────
# Only kills dotnet / node / dcp processes — skips browsers and unrelated apps.
free_port() {
  local port="$1"

  local all_pids
  all_pids=$(lsof -ti :"$port" 2>/dev/null || true)

  if [[ -z "$all_pids" ]]; then
    return
  fi

  # Filter: only kill dotnet, node, dcp, dcpctrl processes (not browsers etc.)
  local pids=""
  for pid in $all_pids; do
    local cmd
    cmd=$(ps -p "$pid" -o comm= 2>/dev/null || true)
    case "$cmd" in
      dotnet|node|dcp|dcpctrl|OpenFlat*) pids="${pids:+$pids$'\n'}$pid" ;;
    esac
  done

  if [[ -z "$pids" ]]; then
    return
  fi

  local count
  count=$(echo "$pids" | wc -l)

  if $DRY_RUN; then
    warn "Port $port — would kill $count process(es) holding it [$SIG]:"
    for pid in $pids; do
      local cmd
      cmd=$(ps -p "$pid" -o args= 2>/dev/null || echo "(already exited)")
      printf "        PID %-8s %s\n" "$pid" "$cmd"
    done
  else
    for pid in $pids; do
      kill -s "$SIG" "$pid" 2>/dev/null || true
    done
    ok "Port $port — sent $SIG to $count process(es)"
    killed=$((killed + count))
  fi
}

# ═══════════════════════════════════════════════════════════════════════════
# 1. Kill dotnet processes related to OpenFlat
# ═══════════════════════════════════════════════════════════════════════════
info "Cleaning .NET / Aspire processes…"
echo ""

kill_by_pattern "Aspire AppHost"         "OpenFlat.AppHost"
kill_by_pattern "OpenFlat API"           "OpenFlat.Api"
kill_by_pattern "Migration Service"      "OpenFlat.MigrationService"
kill_by_pattern "Aspire Dashboard"       "Aspire.Dashboard"
kill_by_pattern "Aspire DCP (dcpctrl)"   "dcpctrl"
kill_by_pattern "Aspire DCP (dcp)"       "dcp[^a-zA-Z]"   # match 'dcp' binary but not 'dcpctrl'
kill_by_pattern "VS Debugger (vsdbg)"    "vsdbg"

echo ""

# ═══════════════════════════════════════════════════════════════════════════
# 2. Kill Vite / Node dev server
# ═══════════════════════════════════════════════════════════════════════════
info "Cleaning Node / Vite processes…"
echo ""

kill_by_pattern "Vite dev server"        "vite.*OpenFlat\|node.*vite.*frontend"
kill_by_pattern "npm (frontend)"         "npm.*frontend"

echo ""

# ═══════════════════════════════════════════════════════════════════════════
# 3. Free known ports (fallback for anything missed above)
# ═══════════════════════════════════════════════════════════════════════════
info "Freeing known dev ports…"
echo ""

# AppHost (https / http)
free_port 17225
free_port 15225

# OTLP endpoints
free_port 21147
free_port 19147

# Resource service (the port from the error)
free_port 22239
free_port 20239

# API standalone
free_port 5100
free_port 5101

echo ""

# ═══════════════════════════════════════════════════════════════════════════
# 4. Docker / Podman containers (opt-in)
# ═══════════════════════════════════════════════════════════════════════════
if $CONTAINERS; then
  info "Stopping Aspire-managed containers…"
  echo ""

  # Detect container runtime
  RUNTIME=""
  if command -v docker &>/dev/null; then
    RUNTIME="docker"
  elif command -v podman &>/dev/null; then
    RUNTIME="podman"
  fi

  if [[ -z "$RUNTIME" ]]; then
    warn "No container runtime found (docker/podman) — skipping"
  else
    # Aspire names containers with the resource name; look for openflat / postgres
    containers=$($RUNTIME ps -aq --filter "name=openflat" --filter "name=postgres" 2>/dev/null || true)

    if [[ -z "$containers" ]]; then
      info "No matching containers found"
    else
      count=$(echo "$containers" | wc -l)
      if $DRY_RUN; then
        warn "Would stop & remove $count container(s):"
        for cid in $containers; do
          local_name=$($RUNTIME inspect --format '{{.Name}}' "$cid" 2>/dev/null || echo "$cid")
          printf "        %s  %s\n" "$cid" "$local_name"
        done
      else
        $RUNTIME stop $containers 2>/dev/null || true
        $RUNTIME rm   $containers 2>/dev/null || true
        ok "Stopped & removed $count container(s)"
      fi
    fi
  fi
  echo ""
fi

# ═══════════════════════════════════════════════════════════════════════════
# 5. Database reset — nuke volume so migrations start fresh (opt-in)
# ═══════════════════════════════════════════════════════════════════════════
if $DB_RESET; then
  info "Resetting PostgreSQL database (removing container + volume)…"
  echo ""

  # Detect container runtime
  DB_RUNTIME=""
  if command -v docker &>/dev/null; then
    DB_RUNTIME="docker"
  elif command -v podman &>/dev/null; then
    DB_RUNTIME="podman"
  fi

  if [[ -z "$DB_RUNTIME" ]]; then
    warn "No container runtime found (docker/podman) — skipping"
  else
    # Find postgres containers managed by Aspire
    pg_containers=$($DB_RUNTIME ps -aq --filter "name=postgres" 2>/dev/null || true)
    if [[ -n "$pg_containers" ]]; then
      if $DRY_RUN; then
        warn "Would stop & remove postgres container(s)"
      else
        $DB_RUNTIME stop $pg_containers 2>/dev/null || true
        $DB_RUNTIME rm   $pg_containers 2>/dev/null || true
        ok "Stopped & removed postgres container(s)"
      fi
    else
      info "No postgres containers running"
    fi

    # Find and remove Aspire-managed postgres volumes
    pg_volumes=$($DB_RUNTIME volume ls -q 2>/dev/null | grep -i "postgres" || true)
    if [[ -n "$pg_volumes" ]]; then
      if $DRY_RUN; then
        warn "Would remove volume(s):"
        for vol in $pg_volumes; do
          printf "        %s\n" "$vol"
        done
      else
        for vol in $pg_volumes; do
          $DB_RUNTIME volume rm "$vol" 2>/dev/null || true
        done
        ok "Removed postgres volume(s) — migrations will run fresh on next start"
      fi
    else
      info "No postgres volumes found"
    fi
  fi
  echo ""
fi

# ═══════════════════════════════════════════════════════════════════════════
# 6. Summary
# ═══════════════════════════════════════════════════════════════════════════
printf "${BOLD}──────────────────────────────────────────────────────────────${NC}\n"
if $DRY_RUN; then
  printf "${YELLOW}Dry run complete — no processes were killed.${NC}\n"
else
  if [[ $killed -gt 0 ]]; then
    printf "${GREEN}Cleanup complete — terminated %d process(es).${NC}\n" "$killed"
  else
    printf "${GREEN}Nothing to clean up — all clear!${NC}\n"
  fi
fi
printf "${BOLD}──────────────────────────────────────────────────────────────${NC}\n"
echo ""
