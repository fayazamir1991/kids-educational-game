"""Fallible semantic audio screening; this does NOT certify human recognizability.

Requires ffmpeg, numpy, and ai-edge-litert. Example (keeps tooling outside checkout):
  python -m pip install --target /tmp/animal-audit-deps ai-edge-litert==2.3.0
  PYTHONPATH=/tmp/animal-audit-deps python scripts/audit-animal-recordings.py \
    --download-model --output /tmp/animal-audio-review.json

The Google YAMNet model is fetched from a pinned official TensorFlow commit and
verified against its SHA256. No model or ML dependency is needed by the game.
"""

import argparse
import hashlib
import json
import pathlib
import shutil
import subprocess
import tempfile
import urllib.request
import zipfile

try:
    import numpy as np
    from ai_edge_litert.interpreter import Interpreter
except ImportError as error:
    raise SystemExit(
        'Install audit-only dependencies outside the checkout: '
        'python -m pip install --target /tmp/animal-audit-deps ai-edge-litert==2.3.0; '
        'then set PYTHONPATH=/tmp/animal-audit-deps. The app does not need these.'
    ) from error


MODEL_URL = (
    'https://raw.githubusercontent.com/tensorflow/tflite-support/'
    '29adb0afae1b0f6bcc37a60d0534b650119583ea/'
    'tensorflow_lite_support/cc/test/testdata/task/audio/'
    'yamnet_audio_classifier_with_metadata.tflite'
)
MODEL_SHA256 = '10c95ea3eb9a7bb4cb8bddf6feb023250381008177ac162ce169694d05c317de'
ROOT = pathlib.Path(__file__).resolve().parents[1]

# These are overlapping AudioSet event labels, not 17 mutually exclusive species.
# Chicks, monkeys, and donkeys lack a specific class: a match is not certifiable.
EXPECTED = {
    'cow': ['Cattle, bovinae', 'Moo'],
    'sheep': ['Sheep', 'Bleat'],
    'chick': ['Chirp, tweet'],
    'crow': ['Crow', 'Caw'],
    'monkey': [],
    'lion': ['Roaring cats (lions, tigers)', 'Roar'],
    'fly': ['Fly, housefly'],
    'bee': ['Bee, wasp, etc.'],
    'rooster': ['Crowing, cock-a-doodle-doo'],
    'hen': ['Cluck'],
    'horse': ['Horse', 'Neigh, whinny'],
    'donkey': [],
    'dog': ['Dog', 'Bark'],
    'cat': ['Cat', 'Meow'],
    'duck': ['Duck', 'Quack'],
    'pig': ['Pig', 'Oink'],
    'frog': ['Frog', 'Croak'],
}
NO_SPECIFIC_SPECIES_CLASS = {'chick', 'monkey', 'donkey'}
BACKGROUND = [
    'Speech', 'Music', 'Vehicle', 'Engine', 'Wind', 'Environmental noise',
    'Outside, rural or natural',
]


def sha256(contents):
    return hashlib.sha256(contents).hexdigest()


def ensure_model(location, download):
    if not location.exists():
        if not download:
            raise SystemExit(f'Model missing: {location}. Use --download-model.')
        location.parent.mkdir(parents=True, exist_ok=True)
        # urllib retains normal HTTPS certificate verification.
        with urllib.request.urlopen(MODEL_URL, timeout=60) as response:
            contents = response.read()
        if sha256(contents) != MODEL_SHA256:
            raise SystemExit('Downloaded model checksum mismatch; not using it.')
        location.write_bytes(contents)
    if sha256(location.read_bytes()) != MODEL_SHA256:
        raise SystemExit('Model checksum mismatch; verify the official source.')


def review_signals(animal, means):
    labels = EXPECTED.get(animal, [])
    target = max((means.get(label, 0) for label in labels), default=None)
    flags = []
    if animal in NO_SPECIFIC_SPECIES_CLASS:
        flags.append('Model has no species-specific class: explicit perceptual review required.')
    if target is not None and target < 0.3:
        flags.append('Expected event is weak: inspect or replace; do not auto-approve.')
    background = {name: means[name] for name in BACKGROUND if means.get(name, 0) >= 0.2}
    if background:
        flags.append('Potential competing background events require review.')
    if animal in {'fly', 'bee'}:
        flags.append('Bee/fly scores overlap: this model cannot establish an audible distinction.')
    if animal not in EXPECTED:
        flags.append('Unknown animal id: no expected-event rules were applied.')
    return {
        'expected_labels': labels,
        'highest_expected_mean_score': target,
        'background_flags': background,
        'review_flags': flags,
        'status': 'needs-review' if flags else 'automated-support-only',
        'human_listening_certified': False,
    }


def audit(path, interpreter, input_index, output_index, labels):
    raw = subprocess.check_output([
        'ffmpeg', '-loglevel', 'error', '-i', str(path), '-f', 'f32le',
        '-ar', '16000', '-ac', '1', 'pipe:1',
    ])
    signal = np.frombuffer(raw, dtype=np.float32)
    if not len(signal):
        raise RuntimeError(f'Empty waveform: {path}')
    scores = []
    windows = []
    # YAMNet expects exactly 15,600 waveform samples (0.975 seconds).
    for start in range(0, max(1, len(signal) - 7800), 7800):
        waveform = signal[start:start + 15600]
        waveform = np.pad(waveform, (0, 15600 - len(waveform)))
        interpreter.set_tensor(input_index, waveform.astype(np.float32))
        interpreter.invoke()
        result = interpreter.get_tensor(output_index)[0]
        scores.append(result)
        windows.append({
            'start_seconds': round(start / 16000, 4),
            'end_seconds': round(min(start + 15600, len(signal)) / 16000, 4),
            'top_events': [
                {'label': labels[index], 'score': round(float(result[index]), 6)}
                for index in np.argsort(result)[-8:][::-1]
            ],
            'all_event_scores': {
                label: round(float(result[index]), 6)
                for index, label in enumerate(labels)
            },
        })
    mean = np.mean(scores, axis=0)
    maximum = np.max(scores, axis=0)
    means = {label: round(float(mean[index]), 6) for index, label in enumerate(labels)}
    return {
        'animal_id': path.stem,
        'file': str(path),
        'sha256': sha256(path.read_bytes()),
        'duration_seconds': round(len(signal) / 16000, 6),
        'mean_event_scores': means,
        'maximum_event_scores': {
            label: round(float(maximum[index]), 6)
            for index, label in enumerate(labels)
        },
        'top_mean_events': [
            {'label': labels[index], 'score': round(float(mean[index]), 6)}
            for index in np.argsort(mean)[-12:][::-1]
        ],
        'windows': windows,
        **review_signals(path.stem, means),
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('files', nargs='*', help='Defaults to public/audio/*.mp3.')
    parser.add_argument('--model', type=pathlib.Path,
                        default=pathlib.Path(tempfile.gettempdir()) / 'animal-audit' / 'yamnet.tflite')
    parser.add_argument('--download-model', action='store_true')
    parser.add_argument('--output', type=pathlib.Path,
                        default=pathlib.Path(tempfile.gettempdir()) / 'animal-audio-review.json')
    args = parser.parse_args()
    if not shutil.which('ffmpeg'):
        parser.error('ffmpeg is required for decoding; no media is modified by this audit.')
    paths = [pathlib.Path(name).resolve() for name in args.files] or sorted((ROOT / 'public/audio').glob('*.mp3'))
    if not paths:
        parser.error('No recordings selected.')
    ensure_model(args.model, args.download_model)
    with zipfile.ZipFile(args.model) as model_metadata:
        labels = model_metadata.read('yamnet_label_list.txt').decode().splitlines()
    interpreter = Interpreter(model_path=str(args.model), num_threads=2)
    interpreter.allocate_tensors()
    input_index = interpreter.get_input_details()[0]['index']
    output_index = interpreter.get_output_details()[0]['index']
    rows = []
    for path in paths:
        row = audit(path, interpreter, input_index, output_index, labels)
        rows.append(row)
        top = ', '.join(f'{item["label"]}={item["score"]:.3f}' for item in row['top_mean_events'][:4])
        print(f'{path.name}: {row["status"]}: {top}', flush=True)
    report = {
        'method': 'Google YAMNet AudioSet event screening, 0.975-second windows / 0.4875-second stride',
        'limitations': [
            'This is automated semantic screening, not human listening or a species certificate.',
            'Scores are overlapping event scores, not calibrated species probabilities.',
            'The model lacks specific monkey, donkey and chick species classes.',
            'It cannot establish toddler recognizability or reliably distinguish bees from flies.',
            'File names, nonzero volume, codec success and metadata do not prove audio identity.',
        ],
        'model_url': MODEL_URL,
        'model_sha256': MODEL_SHA256,
        'clips': rows,
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, ensure_ascii=False, indent=2))
    print(f'Wrote evidence to {args.output}. No recording was automatically approved or modified.')


if __name__ == '__main__':
    main()
