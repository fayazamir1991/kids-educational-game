#!/usr/bin/env bash
# Official, checksum-verified JDK/SDK bootstrap for this workspace.
# Linux cloud bootstrap. Optional: --emulator or --emulator-legacy.
# Tools and caches stay outside the repository; never changes HOME.
set -euo pipefail

TOOLCHAIN_DIR="${KIDS_ANDROID_TOOLCHAIN_DIR:-/workspace/android-toolchain}"
mkdir -p "$TOOLCHAIN_DIR"
TOOLCHAIN_DIR=$(cd -- "$TOOLCHAIN_DIR" && pwd)
DOWNLOAD_DIR="$TOOLCHAIN_DIR/downloads"
mkdir -p "$DOWNLOAD_DIR"

download_verified() {
  local url=$1 destination=$2 algorithm=$3 digest=$4
  if [[ ! -f "$destination" ]]; then
    curl --fail --location --retry 3 --connect-timeout 30 "$url" -o "$destination.part"
    mv -- "$destination.part" "$destination"
  fi
  printf '%s  %s\n' "$digest" "$destination" | "${algorithm}sum" --check --status
}

if [[ ! -x "$TOOLCHAIN_DIR/jdk/bin/javac" ]]; then
  download_verified \
    'https://github.com/adoptium/temurin21-binaries/releases/download/jdk-21.0.13%2B9/OpenJDK21U-jdk_x64_linux_hotspot_21.0.13_9.tar.gz' \
    "$DOWNLOAD_DIR/jdk.tar.gz" sha256 \
    d7f5d5cf865a2902b70ff549b97586a7d3f234e016f041ab447ea740c7d66d1c
  mkdir -p "$TOOLCHAIN_DIR/jdk"
  tar -xzf "$DOWNLOAD_DIR/jdk.tar.gz" --strip-components=1 -C "$TOOLCHAIN_DIR/jdk"
fi

# Pin the classic SDK manager. Newer CLI shims require additional home caches.
if [[ ! -x "$TOOLCHAIN_DIR/sdk/cmdline-tools/latest/bin/sdkmanager" ]]; then
  download_verified \
    'https://dl.google.com/android/repository/commandlinetools-linux-13114758_latest.zip' \
    "$DOWNLOAD_DIR/cmdline-tools-19.zip" sha1 \
    5fdcc763663eefb86a5b8879697aa6088b041e70
  staging=$(mktemp -d "$TOOLCHAIN_DIR/cmdline-staging.XXXXXX")
  unzip -q "$DOWNLOAD_DIR/cmdline-tools-19.zip" -d "$staging"
  mkdir -p "$TOOLCHAIN_DIR/sdk/cmdline-tools"
  mv "$staging/cmdline-tools" "$TOOLCHAIN_DIR/sdk/cmdline-tools/latest"
  rmdir "$staging"
fi

{
  printf 'export ANDROID_TOOLCHAIN_DIR=%q\n' "$TOOLCHAIN_DIR"
  cat <<'ENV'
export JAVA_HOME="$ANDROID_TOOLCHAIN_DIR/jdk"
export ANDROID_HOME="$ANDROID_TOOLCHAIN_DIR/sdk"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
export GRADLE_USER_HOME="$ANDROID_TOOLCHAIN_DIR/gradle-cache"
export ANDROID_USER_HOME="$ANDROID_TOOLCHAIN_DIR/android-user"
export ANDROID_AVD_HOME="$ANDROID_USER_HOME/avd"
export ANDROID_EMULATOR_HOME="$ANDROID_USER_HOME"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$PATH"
mkdir -p "$ANDROID_USER_HOME" "$ANDROID_AVD_HOME"

# Java does not read HTTPS_PROXY itself; use this environment's system CA store.
# Do not change HOME: adb keeps its state in the actual user's .android directory.
if [[ -f /etc/ssl/certs/java/cacerts && "${JAVA_TOOL_OPTIONS:-}" != *javax.net.ssl.trustStore=* ]]; then
  export JAVA_TOOL_OPTIONS="${JAVA_TOOL_OPTIONS:-} -Djavax.net.ssl.trustStore=/etc/ssl/certs/java/cacerts"
fi
if [[ -n "${HTTPS_PROXY:-${https_proxy:-}}" && "${JAVA_TOOL_OPTIONS:-}" != *https.proxyHost=* ]]; then
  proxy_options=$(python3 - <<'PY'
import os, urllib.parse
p = urllib.parse.urlparse(os.environ.get('HTTPS_PROXY') or os.environ.get('https_proxy'))
if p.hostname and p.port and not p.username and not p.password:
    print(f'-Dhttps.proxyHost={p.hostname} -Dhttps.proxyPort={p.port} -Dhttp.proxyHost={p.hostname} -Dhttp.proxyPort={p.port}')
PY
)
  export JAVA_TOOL_OPTIONS="${JAVA_TOOL_OPTIONS:-} $proxy_options"
  unset proxy_options
fi
ENV
} > "$TOOLCHAIN_DIR/env.sh"
# shellcheck source=/dev/null
source "$TOOLCHAIN_DIR/env.sh"

# sdkmanager may close stdin before yes exits; preserve sdkmanager's exit status.
set +o pipefail
yes | sdkmanager --sdk_root="$ANDROID_HOME" --licenses > "$TOOLCHAIN_DIR/licenses.log" 2>&1
license_status=${PIPESTATUS[1]}
set -o pipefail
if (( license_status != 0 )); then
  cat "$TOOLCHAIN_DIR/licenses.log" >&2
  exit "$license_status"
fi
sdkmanager --sdk_root="$ANDROID_HOME" \
  'platforms;android-36' 'build-tools;36.0.0' 'build-tools;35.0.0' 'platform-tools'

if [[ "${1:-}" == --emulator || "${1:-}" == --emulator-legacy ]]; then
  image='system-images;android-36;aosp_atd;x86_64'
  avd_name=kids_api36
  if [[ "${1:-}" == --emulator-legacy ]]; then
    image='system-images;android-29;default;x86_64'
    avd_name=kids_api29
  fi
  sdkmanager --sdk_root="$ANDROID_HOME" 'emulator' "$image"
  if [[ ! -f "$ANDROID_AVD_HOME/$avd_name.ini" ]]; then
    printf 'no\n' | avdmanager create avd --name "$avd_name" \
      --package "$image" --device pixel_2
  fi
fi

javac -version
sdkmanager --sdk_root="$ANDROID_HOME" --list_installed
printf 'Ready. Run: source %q\n' "$TOOLCHAIN_DIR/env.sh"
