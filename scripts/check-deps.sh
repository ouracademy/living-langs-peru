#!/usr/bin/env bash
# Dependency vulnerabilities via osv-scanner, which reads the OSV database.
# This is the one check in the set whose verdict does not come from our own
# code or our own tests.
#
# Enforcement point is CI (see .github/workflows/ci.yml). Locally it reports
# that the tool is missing rather than failing.
set -euo pipefail

if ! command -v osv-scanner >/dev/null 2>&1; then
  echo "check-deps: osv-scanner no está instalado, se omite localmente."
  echo "  Instálalo con 'brew install osv-scanner' (en CI siempre corre)."
  exit 0
fi

osv-scanner scan source -r .
echo "check-deps: limpio"
