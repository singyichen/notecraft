#!/usr/bin/env python3
"""把課堂錄音轉成帶時間戳的繁體逐字稿。

用法：
    python3 transcribe.py <音檔或影片> <輸出.txt> [--lang zh] [--threads 4] [--models-dir DIR]

流程：ffmpeg 轉 16 kHz 單聲道 PCM → Silero VAD 切段（每段最長 20 秒）
      → SenseVoice（sherpa-onnx）逐段辨識 → OpenCC s2twp 轉繁體 → 每行 [分:秒] 文字。

模型第一次執行時自動從 GitHub Releases 下載到 --models-dir（預設 ~/.cache/lecture-transcribe）。
需要：ffmpeg、pip install sherpa-onnx numpy opencc-python-reimplemented
"""
import argparse
import os
import subprocess
import sys
import tarfile
import time
import urllib.request

import numpy as np

SENSEVOICE_NAME = "sherpa-onnx-sense-voice-zh-en-ja-ko-yue-2024-07-17"
RELEASE = "https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/"
SAMPLE_RATE = 16000


def ensure_models(models_dir: str) -> tuple[str, str]:
    os.makedirs(models_dir, exist_ok=True)
    sv_dir = os.path.join(models_dir, SENSEVOICE_NAME)
    if not os.path.exists(os.path.join(sv_dir, "model.int8.onnx")):
        tb = os.path.join(models_dir, SENSEVOICE_NAME + ".tar.bz2")
        print("downloading SenseVoice model (~1 GB)…", flush=True)
        urllib.request.urlretrieve(RELEASE + SENSEVOICE_NAME + ".tar.bz2", tb)
        with tarfile.open(tb, "r:bz2") as t:
            t.extractall(models_dir)
        os.remove(tb)
    vad = os.path.join(models_dir, "silero_vad.onnx")
    if not os.path.exists(vad):
        print("downloading silero_vad.onnx…", flush=True)
        urllib.request.urlretrieve(RELEASE + "silero_vad.onnx", vad)
    return sv_dir, vad


def load_pcm(src: str) -> np.ndarray:
    cmd = ["ffmpeg", "-v", "error", "-i", src, "-f", "s16le", "-ac", "1", "-ar", str(SAMPLE_RATE), "-"]
    pcm = subprocess.run(cmd, capture_output=True, check=True).stdout
    return np.frombuffer(pcm, dtype=np.int16).astype(np.float32) / 32768.0


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("src")
    ap.add_argument("out")
    ap.add_argument("--lang", default="zh", help="zh / en / ja / ko / yue / auto")
    ap.add_argument("--threads", type=int, default=max(2, (os.cpu_count() or 2) // 2))
    ap.add_argument("--models-dir", default=os.path.expanduser("~/.cache/lecture-transcribe"))
    ap.add_argument("--no-tw", action="store_true", help="不做簡轉繁")
    args = ap.parse_args()

    import sherpa_onnx  # 延後 import，讓 --help 不需要套件

    sv_dir, vad_path = ensure_models(args.models_dir)
    samples = load_pcm(args.src)
    total_sec = len(samples) / SAMPLE_RATE
    print(f"audio {total_sec/60:.1f} min", flush=True)

    rec = sherpa_onnx.OfflineRecognizer.from_sense_voice(
        model=os.path.join(sv_dir, "model.int8.onnx"),
        tokens=os.path.join(sv_dir, "tokens.txt"),
        num_threads=args.threads,
        use_itn=True,
        language=args.lang,
    )
    vc = sherpa_onnx.VadModelConfig()
    vc.silero_vad.model = vad_path
    vc.silero_vad.threshold = 0.5
    vc.silero_vad.min_silence_duration = 0.5
    vc.silero_vad.min_speech_duration = 0.25
    vc.silero_vad.max_speech_duration = 20
    vc.sample_rate = SAMPLE_RATE
    vad = sherpa_onnx.VoiceActivityDetector(vc, buffer_size_in_seconds=60)

    conv = None
    if not args.no_tw:
        try:
            from opencc import OpenCC
            conv = OpenCC("s2twp")
        except ImportError:
            print("opencc 未安裝，輸出維持簡體", file=sys.stderr)

    win = 512
    t0 = time.time()
    n = 0
    last_end = 0.0  # 用來修正 VAD 偶爾回傳錯誤 start 的問題
    with open(args.out, "w", encoding="utf-8") as f:

        def flush() -> None:
            nonlocal n, last_end
            while not vad.empty():
                seg = vad.front
                vad.pop()
                s = rec.create_stream()
                s.accept_waveform(SAMPLE_RATE, seg.samples)
                rec.decode_stream(s)
                text = s.result.text.strip()
                start = seg.start / SAMPLE_RATE
                if start < last_end - 60 or start > total_sec:  # 異常時間戳，改用上一段結尾
                    start = last_end
                last_end = start + len(seg.samples) / SAMPLE_RATE
                if conv:
                    text = conv.convert(text)
                if text:
                    f.write(f"[{int(start // 60):02d}:{int(start % 60):02d}] {text}\n")
                    f.flush()
                    n += 1

        for i in range(0, len(samples), win):
            vad.accept_waveform(samples[i : i + win])
            flush()
            if (i // win) % 40000 == 0 and i:
                print(f"  {i/SAMPLE_RATE/60:.0f}/{total_sec/60:.0f} min, {time.time()-t0:.0f}s", flush=True)
        vad.flush()
        flush()
    print(f"done: {n} segments in {time.time()-t0:.0f}s → {args.out}")


if __name__ == "__main__":
    main()
