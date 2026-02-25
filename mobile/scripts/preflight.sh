#!/usr/bin/env bash
set -euo pipefail

# Preflight checks before EAS build
# Run from mobile/ directory: ./scripts/preflight.sh
# Catches dependency, TypeScript, and native config issues locally
# instead of discovering them 20 mins into an EAS build queue.

cd "$(dirname "$0")/.."

FAILED=0

echo "========================================="
echo " EAS Build Preflight Checks"
echo "========================================="
echo ""

# 1. Dependency health
echo "▶ [1/4] Checking dependencies (expo-doctor)..."
if npx expo-doctor 2>&1; then
  echo "  ✅ Dependencies OK"
else
  echo "  ⚠️  expo-doctor found issues (see above)"
  FAILED=1
fi
echo ""

# 2. Peer dependency conflicts
echo "▶ [2/4] Checking peer dependencies (npm ls)..."
if npm ls --all 2>&1 | grep -q "ELSPROBLEMS\|invalid"; then
  echo "  ❌ Peer dependency conflicts found:"
  npm ls --all 2>&1 | grep "invalid" | head -5
  FAILED=1
else
  echo "  ✅ No peer dependency conflicts"
fi
echo ""

# 3. TypeScript
echo "▶ [3/4] TypeScript check..."
if npx tsc --noEmit 2>&1; then
  echo "  ✅ TypeScript OK"
else
  echo "  ❌ TypeScript errors (see above)"
  FAILED=1
fi
echo ""

# 4. Native prebuild (catches Gradle/Kotlin/arch issues)
echo "▶ [4/4] Native prebuild check (android)..."
echo "  Generating native project to validate Gradle config..."
PREBUILD_OUTPUT=$(npx expo prebuild --clean --platform android --no-install 2>&1) || true
if [ -d "android" ]; then
  echo "  ✅ Native prebuild succeeded"
  # Clean up generated native directory
  rm -rf android
  echo "  (cleaned up generated android/ directory)"
else
  echo "  ❌ Native prebuild failed:"
  echo "$PREBUILD_OUTPUT" | tail -20
  FAILED=1
fi
echo ""

echo "========================================="
if [ "$FAILED" -eq 0 ]; then
  echo " ✅ All preflight checks passed!"
  echo " Safe to run: eas build --profile preview --platform android"
else
  echo " ❌ Some checks failed — fix issues before building"
fi
echo "========================================="

exit $FAILED
