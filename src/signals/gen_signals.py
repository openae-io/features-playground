import json
from pathlib import Path

import numpy as np
from scipy.signal import chirp, square

HERE = Path(__file__).parent


def save_signal_to_file(y: np.ndarray, filename: str):
    (HERE / filename).write_text(json.dumps(y.tolist(), indent=2), "utf-8")


def gen_sine():
    N = 10000
    t = np.arange(N)
    f = 0.01
    return np.sin(2 * np.pi * f * t)


def gen_square():
    N = 10000
    t = np.arange(N)
    f = 0.01
    return square(2 * np.pi * f * t)


def gen_chirp():
    N = 10000
    t = np.arange(N)
    return chirp(t, 0, N, 0.1, method="linear", phi=-90)


def gen_noise():
    N = 10000
    gen = np.random.default_rng(seed=0)
    return gen.normal(0, 1, N)


save_signal_to_file(gen_sine(), "sine.json")
save_signal_to_file(gen_square(), "square.json")
save_signal_to_file(gen_chirp(), "chirp.json")
save_signal_to_file(gen_noise(), "white_noise.json")
