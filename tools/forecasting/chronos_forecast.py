#!/usr/bin/env python3

import argparse
import json
import math
import time
from pathlib import Path

import numpy as np
import torch


def main() -> None:
    parser = argparse.ArgumentParser(description="Run local Amazon Chronos forecasts.")
    parser.add_argument("mode", choices=["example", "forecast"])
    parser.add_argument("--model-id", default="amazon/chronos-bolt-small")
    parser.add_argument("--prediction-length", type=int, default=8)
    parser.add_argument("--samples", type=int, default=64)
    parser.add_argument("--device", choices=["auto", "cpu", "mps", "cuda"], default="auto")
    parser.add_argument("--local-files-only", action="store_true")
    parser.add_argument("--symbol")
    parser.add_argument("--interval")
    parser.add_argument("--input")
    parser.add_argument("--output")
    args = parser.parse_args()

    if args.prediction_length < 1:
        raise SystemExit("--prediction-length must be >= 1")
    if args.samples < 1:
        raise SystemExit("--samples must be >= 1")

    if args.mode == "example":
        closes = synthetic_series()
        metadata = {
            "symbol": "SYNTH",
            "interval": "1d",
            "input_bars": len(closes),
            "last_timestamp": None,
        }
    else:
        bars = read_bars(Path(required(args.input, "--input")))
        closes = np.array([float(bar["close"]) for bar in bars], dtype=np.float32)
        metadata = {
            "symbol": required(args.symbol, "--symbol"),
            "interval": required(args.interval, "--interval"),
            "input_bars": len(bars),
            "last_timestamp": bars[-1].get("timestamp") if bars else None,
        }

    payload = forecast(
        closes=closes,
        metadata=metadata,
        model_id=args.model_id,
        prediction_length=args.prediction_length,
        samples=args.samples,
        device_arg=args.device,
        local_files_only=args.local_files_only,
    )

    text = json.dumps(payload, indent=2)
    print(text)

    if args.output:
        output_path = Path(args.output)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(text + "\n", encoding="utf-8")


def forecast(
    *,
    closes: np.ndarray,
    metadata: dict,
    model_id: str,
    prediction_length: int,
    samples: int,
    device_arg: str,
    local_files_only: bool,
) -> dict:
    closes = prepare_series(closes)
    last_close = float(closes[-1])
    log_closes = np.log(np.maximum(closes, 1e-9))
    last_log_close = float(log_closes[-1])
    device = resolve_device(device_arg)
    pipeline_kind, pipeline = load_pipeline(
        model_id=model_id,
        device=device,
        local_files_only=local_files_only,
    )

    context = build_context(log_closes, pipeline_kind)
    started = time.time()
    if pipeline_kind in {"chronos2", "chronos-bolt"}:
        raw = predict_chronos2(pipeline, context, prediction_length)
    else:
        raw = predict_chronos1(pipeline, context, prediction_length, samples)
    latency_ms = int((time.time() - started) * 1000)

    predictions = []
    for idx in range(prediction_length):
        q10 = float(raw["q10"][idx])
        q50 = float(raw["q50"][idx])
        q90 = float(raw["q90"][idx])
        point = float(raw["point"][idx])
        sigma_log = max((q90 - q10) / 2.5631031310892007, 0.0)
        drift_pct = pct_from_log(point, last_log_close)
        predictions.append(
            {
                "step": idx + 1,
                "forecast": float(math.exp(point)),
                "q10": float(math.exp(q10)),
                "q50": float(math.exp(q50)),
                "q90": float(math.exp(q90)),
                "drift_pct": drift_pct,
                "sigma_pct": 100.0 * float(math.exp(point - last_log_close)) * sigma_log,
            }
        )

    horizons = {
        str(item["step"]): {
            "forecast": item["forecast"],
            "drift_pct": item["drift_pct"],
            "sigma_pct": item["sigma_pct"],
            "q10": item["q10"],
            "q50": item["q50"],
            "q90": item["q90"],
        }
        for item in predictions
    }

    return {
        "model": "amazon-chronos",
        "model_id": model_id,
        "pipeline_kind": pipeline_kind,
        "device": device,
        "symbol": metadata["symbol"],
        "interval": metadata["interval"],
        "input_bars": metadata["input_bars"],
        "prediction_length": prediction_length,
        "samples": samples if pipeline_kind == "chronos1" else None,
        "last_timestamp": metadata.get("last_timestamp"),
        "last_close": last_close,
        "latency_ms": latency_ms,
        "horizons": horizons,
        "predictions": predictions,
        "warnings": [],
    }


def load_pipeline(*, model_id: str, device: str, local_files_only: bool):
    if "chronos-2" in model_id.lower():
        from chronos import Chronos2Pipeline

        return "chronos2", Chronos2Pipeline.from_pretrained(
            model_id,
            device_map=device,
            dtype="auto",
            local_files_only=local_files_only,
        )

    if "chronos-bolt" in model_id.lower():
        from chronos import ChronosBoltPipeline

        return "chronos-bolt", ChronosBoltPipeline.from_pretrained(
            model_id,
            device_map=device,
            dtype="auto",
            local_files_only=local_files_only,
        )

    from chronos import ChronosPipeline

    return "chronos1", ChronosPipeline.from_pretrained(
        model_id,
        device_map=device,
        dtype="auto",
        local_files_only=local_files_only,
    )


def predict_chronos1(pipeline, context: torch.Tensor, prediction_length: int, samples: int) -> dict:
    forecast = pipeline.predict(
        context,
        prediction_length=prediction_length,
        num_samples=samples,
    )
    arr = to_numpy(forecast)
    if arr.ndim == 3 and arr.shape[0] == 1:
        arr = arr[0]
    if arr.ndim != 2 or arr.shape[1] < prediction_length:
        raise RuntimeError(f"Unexpected Chronos prediction shape: {arr.shape}")
    return {
        "point": np.quantile(arr, 0.5, axis=0),
        "q10": np.quantile(arr, 0.1, axis=0),
        "q50": np.quantile(arr, 0.5, axis=0),
        "q90": np.quantile(arr, 0.9, axis=0),
    }


def predict_chronos2(pipeline, context: torch.Tensor, prediction_length: int) -> dict:
    quantiles, point = pipeline.predict_quantiles(
        context,
        prediction_length=prediction_length,
        quantile_levels=[0.1, 0.5, 0.9],
    )
    q_arr = to_numpy(quantiles)
    p_arr = to_numpy(point)
    if q_arr.ndim == 4:
        q_arr = q_arr[0, 0]
    elif q_arr.ndim == 3:
        q_arr = q_arr[0]
    if p_arr.ndim == 3:
        p_arr = p_arr[0, 0]
    elif p_arr.ndim == 2:
        p_arr = p_arr[0]
    if q_arr.ndim != 2 or q_arr.shape[1] != 3:
        raise RuntimeError(f"Unexpected Chronos-2 quantile shape: {q_arr.shape}")
    return {
        "point": p_arr,
        "q10": q_arr[:, 0],
        "q50": q_arr[:, 1],
        "q90": q_arr[:, 2],
    }


def build_context(log_closes: np.ndarray, pipeline_kind: str) -> torch.Tensor:
    tensor = torch.tensor(log_closes, dtype=torch.float32)
    if pipeline_kind == "chronos2":
        return tensor[None, None, :]
    return tensor


def prepare_series(values: np.ndarray) -> np.ndarray:
    arr = np.array(values, dtype=np.float32)
    if arr.ndim != 1:
        raise ValueError("series must be one-dimensional")
    if arr.size < 10:
        raise ValueError("series must have at least 10 points")
    if not np.all(np.isfinite(arr)):
        raise ValueError("series must contain finite values only")
    if np.any(arr <= 0):
        raise ValueError("series must contain positive prices only")
    return arr


def read_bars(path: Path) -> list[dict]:
    text = path.read_text(encoding="utf-8")
    # Tolerate npm-run prefix lines (e.g. "> trade-ops@0.1.0 ...") before the JSON array
    start = text.find("[")
    if start == -1:
        raise ValueError("input file contains no JSON array")
    bars = json.loads(text[start:])
    if not isinstance(bars, list):
        raise ValueError("input JSON must be a list of bars")
    return [bar for bar in bars if isinstance(bar, dict) and positive_close(bar)]


def positive_close(bar: dict) -> bool:
    try:
        return math.isfinite(float(bar["close"])) and float(bar["close"]) > 0
    except Exception:
        return False


def synthetic_series() -> np.ndarray:
    base = np.linspace(100.0, 112.0, 180)
    wave = np.sin(np.arange(180) / 8.0) * 1.4
    return (base + wave).astype(np.float32)


def resolve_device(value: str) -> str:
    if value == "auto":
        if torch.cuda.is_available():
            return "cuda"
        if hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
            return "mps"
        return "cpu"
    return value


def to_numpy(value) -> np.ndarray:
    if isinstance(value, torch.Tensor):
        return value.detach().cpu().numpy().astype(np.float32, copy=False)
    return np.array(value, dtype=np.float32)


def pct_from_log(value: float, anchor: float) -> float:
    return 100.0 * (math.exp(value - anchor) - 1.0)


def required(value, name: str):
    if value is None:
        raise SystemExit(f"{name} is required")
    return value


if __name__ == "__main__":
    main()
