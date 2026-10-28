#!/usr/bin/env bash
set -euo pipefail

# Optional local machine setup; never check signing secrets into this repository.
if [[ -n "${ANDROID_ENV_FILE:-}" ]]; then
  source "$ANDROID_ENV_FILE"
fi
task_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$task_root"
build_kind="${1:-debug}"
case "$build_kind" in
  debug|release|all) ;;
  *) printf '%s\n' 'Usage: scripts/android-build.sh [debug|release|all]' >&2; exit 2 ;;
esac

if [[ -z "${JAVA_HOME:-}" || -z "${ANDROID_HOME:-${ANDROID_SDK_ROOT:-}}" ]]; then
  printf '%s\n' 'Set JAVA_HOME (JDK 21) and ANDROID_HOME (Android SDK with platform/build-tools 36), or set ANDROID_ENV_FILE.' >&2
  exit 2
fi

npm run build:store
npx cap sync android
node scripts/verify-release-assets.mjs --target end-product --artifact-dir android/app/src/main/assets/public
cd android
tasks=(testDebugUnitTest lintDebug)
if [[ "$build_kind" == debug || "$build_kind" == all ]]; then tasks+=(assembleDebug); fi
if [[ "$build_kind" == release || "$build_kind" == all ]]; then tasks+=(assembleRelease bundleRelease); fi
./gradlew --no-daemon --console=plain "${tasks[@]}"

if [[ "$build_kind" == release || "$build_kind" == all ]]; then
  if [[ -n "${ANDROID_RELEASE_STORE_FILE:-}" ]]; then
    printf '%s\n' 'Release signing was supplied by the environment. Verify the certificate and keep the original key secure.'
  else
    printf '%s\n' 'Release APK/AAB are UNSIGNED review artifacts. Store upload requires the owner’s release signing configuration.'
  fi
fi
