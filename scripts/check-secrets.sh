#!/usr/bin/env bash
# Secret scanning with gitleaks. --redact is not optional: without it the
# matched secret is printed into whatever log, transcript or CI output is
# watching, which is how a leaked key leaks twice.
#
# Enforcement point is CI (see .github/workflows/ci.yml). Locally this is a
# convenience: it reports that gitleaks is missing rather than failing, so
# `pnpm check:full` stays runnable on a laptop without a Homebrew install.
set -euo pipefail

if ! command -v gitleaks >/dev/null 2>&1; then
  echo "check-secrets: gitleaks no está instalado, se omite localmente."
  echo "  Instálalo con 'brew install gitleaks' (en CI siempre corre)."
  exit 0
fi

# 'dir' scans the working tree, so it also sees changes not yet committed.
gitleaks dir . --redact --no-banner
echo "check-secrets: limpio"
