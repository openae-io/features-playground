import inspect

import numpy as np


def _inspect_parameters(func, empty_value="_empty"):
    def convert_empty(value):
        return value if value is not inspect.Parameter.empty else empty_value

    return [
        {
            "name": name,
            "kind": int(param.kind),
            "default": convert_empty(param.default),
            "annotation": param.annotation.__name__,
        }
        for name, param in inspect.signature(func).parameters.items()
    ]


def _asarray(array_like, dtype=None) -> np.ndarray:
    return np.asarray(array_like, dtype=dtype)


def _apply_window(signal: np.ndarray):
    return np.multiply(signal, np.hanning(len(signal)), dtype=signal.dtype)


def _compute_spectrum(signal: np.ndarray, apply_window: bool):
    return np.fft.rfft(_apply_window(signal) if apply_window else signal)
