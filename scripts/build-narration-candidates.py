#!/usr/bin/env python3
"""Build local Persian speech candidates, never silently approve or publish them.

Requires locally downloaded, pinned MOSS-TTS-Nano-Persian and audio codec models,
torch 2.7 CPU, torchaudio 2.7, transformers 4.57.1, sentencepiece, soundfile,
and ffmpeg. Nothing is sent to a synthesis API. No real-person reference voice.
"""
import argparse
import hashlib
import html
import json
import os
from pathlib import Path
import subprocess
import time

os.environ.setdefault("HF_HUB_DISABLE_TELEMETRY", "1")
os.environ.setdefault("HF_HUB_OFFLINE", "1")
os.environ.setdefault("TRANSFORMERS_OFFLINE", "1")

MODEL_REPO = "nimaaaAI/MOSS-TTS-Nano-Persian"
MODEL_REVISION = "dcfd7f2baab4bb69434895f51eae6a0c0059c59f"
CODEC_REPO = "OpenMOSS-Team/MOSS-Audio-Tokenizer-Nano"
CODEC_REVISION = "6aa02b01e445cc585582cf0ba480bc3ea6c8dd68"
ROOT = Path(__file__).resolve().parent.parent


def digest(path):
    with path.open("rb") as handle:
        return hashlib.file_digest(handle, "sha256").hexdigest()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--model", type=Path, required=True)
    parser.add_argument("--codec", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--only", help="One prompt id, for a trial before a full batch")
    parser.add_argument("--threads", type=int, default=4)
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()
    output = args.output_dir.resolve()
    public = (ROOT / "public").resolve()
    if output == public or public in output.parents:
        parser.error("Candidates must be generated outside public; review first.")
    for directory, names in [(args.model, ["pytorch_model.bin", "LICENSE", "config.json"]),
                             (args.codec, ["model-00001-of-00001.safetensors", "config.json"])]:
        for name in names:
            if not (directory / name).is_file():
                parser.error(f"Missing local model file: {directory / name}")
    sources = json.loads((public / "narration/model-sources.json").read_text())["models"]
    for directory, source in zip([args.model, args.codec], sources):
        for name, expected_hash in source["files"].items():
            file_path = directory / name
            if not file_path.is_file() or digest(file_path) != expected_hash:
                parser.error(f"Pinned model file missing or changed: {file_path}")
    prompts = json.loads((public / "narration/prompts.json").read_text())["prompts"]
    if args.only:
        prompts = [prompt for prompt in prompts if prompt["id"] == args.only]
        if not prompts:
            parser.error("Unknown --only prompt")

    import torch
    import soundfile as sf
    import numpy as np
    from transformers import AutoModelForCausalLM

    torch.set_num_threads(args.threads)
    model = AutoModelForCausalLM.from_pretrained(
        str(args.model.resolve()), trust_remote_code=True, local_files_only=True)
    model.to(device="cpu", dtype=torch.float32)
    model._set_attention_implementation("sdpa")
    model.eval()
    output.mkdir(parents=True, exist_ok=True)
    manifest = {
        "schemaVersion": 1, "language": "fa-IR", "status": "pending-human-listening",
        "description": "Synthetic narrator candidates. No reference voice, no speech API. Not enabled for release.",
        "clips": [],
    }
    provenance = {
        "source": f"https://huggingface.co/{MODEL_REPO}/tree/{MODEL_REVISION}",
        "license": "Apache-2.0", "model": MODEL_REPO, "modelRevision": MODEL_REVISION,
        "weightsSha256": digest(args.model / "pytorch_model.bin"),
        "codec": CODEC_REPO, "codecRevision": CODEC_REVISION,
        "codecWeightsSha256": digest(args.codec / "model-00001-of-00001.safetensors"),
        "dataset": "Mozilla Common Voice Persian v13 (CC0, as documented by model author)",
        "mode": "continuation-without-reference", "seed": args.seed,
        "synthetic": True,
    }
    for prompt in prompts:
        started = time.monotonic()
        torch.manual_seed(args.seed)
        wav = output / f"{prompt['id']}.wav"
        result = model.inference(
            text=prompt["spokenText"], output_audio_path=str(wav), mode="continuation",
            audio_tokenizer_type="moss-audio-tokenizer-nano",
            audio_tokenizer_pretrained_name_or_path=str(args.codec.resolve()),
            device="cpu", max_new_frames=150, do_sample=True,
            text_temperature=1.0, audio_temperature=0.8, audio_top_p=0.95,
            audio_top_k=25, use_kv_cache=True)
        data, rate = sf.read(wav)
        duration = len(data) / rate
        if not 0.25 <= duration <= 12 or not np.isfinite(data).all() or np.max(np.abs(data)) < 0.001:
            raise RuntimeError(f"Invalid/non-speech candidate duration or waveform: {prompt['id']}")
        mp3 = output / f"{prompt['id']}.mp3"
        subprocess.run([
            "ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(wav),
            "-af", "loudnorm=I=-18:TP=-2:LRA=7", "-ac", "1", "-ar", "44100",
            "-codec:a", "libmp3lame", "-b:a", "96k", str(mp3)
        ], check=True)
        subprocess.run(["ffmpeg", "-v", "error", "-i", str(mp3), "-f", "null", "-"], check=True)
        manifest["clips"].append({
            **prompt, "path": f"/narration/{mp3.name}", "sha256": digest(mp3),
            "durationSeconds": round(duration, 3), "sampleRate": rate,
            "generationFrames": int(result["audio_token_ids"].shape[0]),
            "enabled": False, "redistributionApproved": False,
            "review": {"status": "pending-human-listening", "reviewer": None, "reviewedAt": None},
            "provenance": provenance,
            "automaticChecks": {"decode": "passed", "finiteWaveform": True,
                                "spokenContent": "not verified by listening"},
        })
        (output / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
        print(f"{prompt['id']}: {duration:.2f}s audio in {time.monotonic() - started:.1f}s; listening pending", flush=True)
    rows = "\n".join(
        f"<tr><td>{html.escape(clip['id'])}</td><td dir='rtl'>{html.escape(clip['text'])}</td>"
        f"<td><audio controls preload='none' src='{clip['id']}.mp3'></audio></td></tr>"
        for clip in manifest["clips"])
    (output / "review.html").write_text(
        "<!doctype html><meta charset='utf-8'><title>Persian narration listening review</title>"
        "<style>body{font:18px sans-serif;padding:24px}td{padding:12px;border-bottom:1px solid #ccc}</style>"
        "<h1>Unapproved synthetic narrator candidates</h1>"
        "<p>Listen to every clip for exact words, natural pronunciation, clarity, and child suitability. "
        "Automatic decode checks do not verify spoken content. No real-person reference voice was used.</p>"
        f"<table>{rows}</table>")


if __name__ == "__main__":
    main()
