import { PyodideInterface } from "pyodide";
import type { PyCallable, PyDict } from "pyodide/ffi";

export type ErrorHandler = (message: string) => void;

export type InputDomain = "signal" | "spectrum";

// https://docs.python.org/3/library/inspect.html#inspect.Parameter.kind
export enum ParameterKind {
  PositionalOnly = 0,
  PositionalOrKeyword = 1,
  VarPositional = 2, // *args
  KeywordOnly = 3,
  VarKeyword = 4, // **kwargs
}

export interface FunctionParameter {
  name: string;
  kind: ParameterKind;
  default: "_empty" | any;
  annotation: "_empty" | string;
}

export interface FunctionSignature {
  name: string;
  parameters: FunctionParameter[];
}

const helperCodePython = `
from inspect import Parameter, signature

import numpy as np
from numpy import asarray

def inspect_parameters(func, empty_value = "_empty"):
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
`;

export interface TransformOptions {
  domain: InputDomain;
  applyWindow: boolean;
}

export class FunctionExecutor {
  readonly code: string;
  readonly environment: PyodideInterface;
  private namespace: PyDict;
  private proxy: PyCallable;

  constructor(code: string, environment: PyodideInterface) {
    this.code = code;
    this.environment = environment;
    this.namespace = this.environment.globals.get("dict")();

    const getProxy = () => {
      this.runPython(this.code);
      for (const name of this.namespace) {
        const proxy = this.namespace.get(name);
        if (proxy instanceof this.environment.ffi.PyCallable && !name.startsWith("_")) {
          return proxy;
        }
        proxy.destroy();
      }
      throw new Error("No function defined");
    };
    this.proxy = getProxy();

    this.runPython(helperCodePython);
  }

  private runPython(code: string) {
    this.environment.runPython(code, { globals: this.namespace });
  }

  inspect(): FunctionSignature {
    const inspectParametersProxy = this.namespace.get("inspect_parameters");
    const parameters = inspectParametersProxy(this.proxy).toJs(); // type Array<Map<string, any>>
    return {
      name: this.proxy.toJs()["__name__"],
      parameters: parameters.map((parameterMap: Map<string, any>) => ({
        name: parameterMap.get("name"),
        kind: parameterMap.get("kind") as ParameterKind,
        default: parameterMap.get("default"),
        annotation: parameterMap.get("annotation"),
      })),
    };
  }

  private transformSignal(signal: Float32Array | number[], options: TransformOptions) {
    const transformSignalProxy = this.namespace.get("transform_signal");
    const asArrayProxy = this.namespace.get("asarray");
    return transformSignalProxy(asArrayProxy(signal), options.domain, options.applyWindow);
  }

  invoke(
    signal: Float32Array | number[],
    options: TransformOptions,
    kwargs: Record<string, any> = {},
  ) {
    return this.proxy.callKwargs(this.transformSignal(signal, options), kwargs);
  }
}
