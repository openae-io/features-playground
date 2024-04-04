import json
from pathlib import Path

import numpy as np

HERE = Path(__file__).parent
OUTPUT = HERE / "sweep.json"

N = 10000
t = np.arange(N)
f = np.linspace(0, 0.1, N)
y = np.sin(2 * np.pi * f * t)

y_json = json.dumps(y.tolist())
OUTPUT.write_text(y_json, "utf-8")
