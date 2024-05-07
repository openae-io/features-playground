import json
from dataclasses import dataclass
from pathlib import Path

import numpy as np
from scipy.signal import chirp

HERE = Path(__file__).parent


@dataclass
class Signal:
    title: str
    data: np.ndarray


def save_signal_to_file(signal: Signal, filename: str):
    obj = {
        "title": signal.title,
        "data": signal.data.tolist(),
    }
    (HERE / filename).write_text(json.dumps(obj, indent=2), "utf-8")


def gen_sine():
    N = 10000
    t = np.arange(N)
    f = 0.01
    y = np.sin(2 * np.pi * f * t)
    return Signal(title="Sine with 1/100 sampling rate", data=y)


def gen_chirp():
    N = 10000
    t = np.arange(N)
    y = chirp(t, 0, N, 0.1, method="linear", phi=-90)
    return Signal(title="Chirp from 0 to 1/10 sampling rate", data=y)


def gen_noise():
    N = 10000
    gen = np.random.default_rng(seed=0)
    y = gen.normal(0, 1, N)
    return Signal(title="White noise (σ = 1)", data=y)


save_signal_to_file(gen_sine(), "10_sine.json")
save_signal_to_file(gen_chirp(), "11_chirp.json")
save_signal_to_file(gen_noise(), "12_white_noise.json")
