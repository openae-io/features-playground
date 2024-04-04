import json
from pathlib import Path

import numpy as np

HERE = Path(__file__).parent

def save_signal_to_file(y: np.ndarray, filename: str):
    y_json = json.dumps(y.tolist())
    (HERE / filename).write_text(y_json, "utf-8")


def gen_sine():
    N = 10000
    t = np.arange(N)
    f = 0.01
    return np.sin(2 * np.pi * f * t)


def gen_sweep():
    N = 10000
    t = np.arange(N)
    f = np.linspace(0, 0.1, N)
    return np.sin(2 * np.pi * f * t)


save_signal_to_file(gen_sine(), "sine.json")
save_signal_to_file(gen_sweep(), "sweep.json")
