#!/usr/bin/env bash
# Single, unrotated publisher key only. Never defaults to a debug signing key.
set -euo pipefail
umask 077
task_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
: "${ANDROID_RELEASE_STORE_FILE:?Set the publisher-owned keystore path first.}"
: "${ANDROID_RELEASE_KEY_ALIAS:?Set the publisher signing key alias first.}"
[[ -f "$ANDROID_RELEASE_STORE_FILE" ]] || { echo 'Publisher keystore is missing.' >&2; exit 2; }
[[ "$(basename "$ANDROID_RELEASE_STORE_FILE")" != debug.keystore ]] || { echo 'A debug key is not a publisher release key.' >&2; exit 2; }
bundle="${1:-$task_root/android/app/build/outputs/bundle/release/app-release.aab}"
output="${2:-$task_root/release/android-private/bazaar}"
[[ -f "$bundle" ]] || { echo 'AAB is missing.' >&2; exit 2; }
signer_cache="${BAZAAR_SIGNER_CACHE:-/workspace/bazaar-toolchain}"
mkdir -p "$signer_cache" "$output"
signer_jar="$signer_cache/bundlesigner-0.1.14.jar"
python3 - "$signer_jar" <<'PY'
import hashlib,sys,urllib.request
from pathlib import Path
p=Path(sys.argv[1])
if not p.exists():
    with urllib.request.urlopen('https://github.com/cafebazaar/bundle-signer/releases/download/v0.1.14/bundlesigner-0.1.14.jar',timeout=60) as r:
        data=r.read()
    if hashlib.sha256(data).hexdigest()!='aef2c387f678558e3a4baddab9730fbdca64ef28a0e2e0245491e1088b4968f5':
        raise SystemExit('Official signer digest mismatch.')
    p.write_bytes(data)
if hashlib.sha256(p.read_bytes()).hexdigest()!='aef2c387f678558e3a4baddab9730fbdca64ef28a0e2e0245491e1088b4968f5':
    raise SystemExit('Cached signer digest mismatch.')
PY
args=(genbin --bundle "$bundle" --bin "$output" --v2-signing-enabled true --v3-signing-enabled false
      --ks "$ANDROID_RELEASE_STORE_FILE" --ks-key-alias "$ANDROID_RELEASE_KEY_ALIAS")
# Supply values securely via environment, or let the official tool prompt locally.
if [[ -n "${ANDROID_RELEASE_STORE_PASSWORD:-}" ]]; then args+=(--ks-pass env:ANDROID_RELEASE_STORE_PASSWORD); fi
if [[ -n "${ANDROID_RELEASE_KEY_PASSWORD:-}" ]]; then args+=(--key-pass env:ANDROID_RELEASE_KEY_PASSWORD); fi
java -jar "$signer_jar" "${args[@]}"
