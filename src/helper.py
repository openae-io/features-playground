from inspect import Parameter, signature

import numpy as np
from numpy import asarray


def inspect_parameters(func, empty_value="_empty"):
    def convert_empty(value):
        return value if value is not Parameter.empty else empty_value

    return [
        {
            "name": name,
            "kind": int(param.kind),
            "default": convert_empty(param.default),
            "annotation": param.annotation.__name__,
        }
        for name, param in signature(func).parameters.items()
    ]


def transform_signal(signal: np.ndarray, domain: str, apply_window: bool):
    if domain == "spectrum":
        if apply_window:
            signal *= np.hanning(len(signal))
        return np.fft.rfft(signal)
    return signal
