#!/usr/bin/env python3

import argparse
import json
import math
import os
import time
from pathlib import Path

import numpy as np
import torch


def main() -> None:
    parser = argparse.ArgumentParser(description="Run local TimesFM forecasts.")
    parser.add_argument("mode", choices=["example", "forecast"])
    parser.add_argument("--model-id", default="google/timesfm-2.5-200m-pytorch")
    parser.add_argument("--prediction-length", type=int, default=8)
    parser.add_argument("--max-context", type=int, default=1024)
    parser.add_argument("--local-files-only", action="store_true")
    parser.add_argument("--symbol")
    parser.add_argument("--interval")
    parser.add_argument("--input")
    parser.add_argument("--output")
    args = parser.parse_args()

    if args.prediction_length < 1:
        raise SystemExit("--prediction-length must be >= 1")
    if args.max_context < 1:
        raise SystemExit("--max-context must be >= 1")

    if args.local_files_only:
        os.environ["HF_HUB_OFFLINE"] = "1"
        os.environ["TRANSFORMERS_OFFLINE"] = "1"

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
        max_context=args.max_context,
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
    max_context: int,
) -> dict:
    closes = prepare_series(closes)
    context = closes[-max_context:]
    last_close = float(context[-1])

    import timesfm

    torch.set_float32_matmul_precision("high")
    model = timesfm.TimesFM_2p5_200M_torch.from_pretrained(model_id)
    model.compile(
        timesfm.ForecastConfig(
            max_context=max_context,
            max_horizon=prediction_length,
            normalize_inputs=True,
            use_continuous_quantile_head=True,
            force_flip_invariance=True,
            infer_is_positive=True,
            fix_quantile_crossing=True,
        )
    )

    started = time.time()
    point_forecast, quantile_forecast = model.forecast(
        horizon=prediction_length,
        inputs=[context],
    )
    latency_ms = int((time.time() - started) * 1000)

    point = np.array(point_forecast[0], dtype=np.float32)
    quantiles = np.array(quantile_forecast[0], dtype=np.float32)
    predictions = build_predictions(point=point, quantiles=quantiles, last_close=last_close)

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
        "model": "timesfm",
        "model_id": model_id,
        "symbol": metadata["symbol"],
        "interval": metadata["interval"],
        "input_bars": metadata["input_bars"],
        "context_bars": len(context),
        "prediction_length": prediction_length,
        "max_context": max_context,
        "last_timestamp": metadata.get("last_timestamp"),
        "last_close": last_close,
        "latency_ms": latency_ms,
        "horizons": horizons,
        "predictions": predictions,
        "warnings": [],
    }


def build_predictions(*, point: np.ndarray, quantiles: np.ndarray, last_close: float) -> list[dict]:
    predictions = []
    for idx, forecast_value in enumerate(point):
        q10 = quantile_at(quantiles, idx, 1, forecast_value)
        q50 = quantile_at(quantiles, idx, 5, forecast_value)
        q90 = quantile_at(quantiles, idx, 9, forecast_value)
        sigma = max((q90 - q10) / 2.5631031310892007, 0.0)
        predictions.append(
            {
                "step": idx + 1,
                "forecast": float(forecast_value),
                "q10": float(q10),
                "q50": float(q50),
                "q90": float(q90),
                "drift_pct": 100.0 * ((float(forecast_value) / last_close) - 1.0),
                "sigma_pct": 100.0 * sigma / last_close,
            }
        )
    return predictions


def quantile_at(quantiles: np.ndarray, horizon_idx: int, quantile_idx: int, fallback: float) -> float:
    if quantiles.ndim != 2 or horizon_idx >= quantiles.shape[0] or quantile_idx >= quantiles.shape[1]:
        return float(fallback)
    value = float(quantiles[horizon_idx, quantile_idx])
    if not math.isfinite(value):
        return float(fallback)
    return value


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
    bars = json.loads(path.read_text(encoding="utf-8"))
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


def required(value, name: str):
    if value is None:
        raise SystemExit(f"{name} is required")
    return value


if __name__ == "__main__":
    main()
