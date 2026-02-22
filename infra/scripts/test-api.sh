#!/usr/bin/env bash
set -euo pipefail

# Integration test script for GymTrainer API
# Usage: ./test-api.sh [API_URL]
#   API_URL can be passed as first argument or via API_URL env var

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

API_URL="${1:-${API_URL:-}}"

if [ -z "$API_URL" ]; then
  echo -e "${RED}FAIL: API_URL is required. Pass as first argument or set API_URL env var.${NC}"
  echo "Usage: $0 <API_URL>"
  exit 1
fi

# Strip trailing slash
API_URL="${API_URL%/}"

PASS=0
FAIL=0

run_test() {
  local description="$1"
  local method="$2"
  local endpoint="$3"
  local expected_status="$4"
  local expected_body="${5:-}"
  local extra_headers="${6:-}"

  local curl_args=(-s -o /tmp/test-api-body -w "%{http_code}" -X "$method")
  if [ -n "$extra_headers" ]; then
    curl_args+=(-H "$extra_headers")
  fi
  curl_args+=("${API_URL}${endpoint}")

  local status
  status=$(curl "${curl_args[@]}" 2>/dev/null) || true
  local body
  body=$(cat /tmp/test-api-body 2>/dev/null) || true

  if [ "$status" != "$expected_status" ]; then
    echo -e "${RED}FAIL${NC}: $description"
    echo "       Expected status $expected_status, got $status"
    echo "       Body: $body"
    FAIL=$((FAIL + 1))
    return
  fi

  if [ -n "$expected_body" ]; then
    if echo "$body" | grep -q "$expected_body"; then
      echo -e "${GREEN}PASS${NC}: $description"
      PASS=$((PASS + 1))
    else
      echo -e "${RED}FAIL${NC}: $description"
      echo "       Expected body to contain: $expected_body"
      echo "       Got: $body"
      FAIL=$((FAIL + 1))
    fi
  else
    echo -e "${GREEN}PASS${NC}: $description"
    PASS=$((PASS + 1))
  fi
}

echo "Testing API at: $API_URL"
echo "---"

# Test 1: Health check
run_test "GET /health returns 200 with status ok" \
  GET "/health" "200" '"status":"ok"'

# Test 2: Auth middleware rejects unauthenticated requests
run_test "GET /api/profile with fake token returns 401" \
  GET "/api/profile" "401" "" "Authorization: Bearer fake-invalid-token-12345"

echo "---"
echo "Results: ${PASS} passed, ${FAIL} failed"

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi

exit 0
