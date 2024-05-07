import { PyodideInterface } from "pyodide";
import type { PyBuffer, PyCallable, PyDict, PyProxy } from "pyodide/ffi";
import codeHelper from "@/helper.py?raw";

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

export type InputDomain = "signal" | "spectrum";
export interface TransformOptions {
  domain: InputDomain;
  applyWindow: boolean;
}

export class PythonInterface {
  readonly environment: PyodideInterface;
  protected namespace: PyDict;

  constructor(environment: PyodideInterface) {
    this.environment = environment;
    this.namespace = this.environment.globals.get("dict")();
    this.runPython(codeHelper);
  }

  protected runPython(code: string) {
    this.environment.runPython(code, { globals: this.namespace });
  }

  protected getProxy(name: string): PyProxy {
    return this.namespace.get(name);
  }

  protected isCallable(proxy: PyProxy) {
    return proxy instanceof this.environment.ffi.PyCallable;
  }

  protected getCallable(name: string): PyCallable {
    const proxy = this.getProxy(name);
    if (!this.isCallable(proxy)) throw new Error(`Proxy ${name} is not a callable`);
    return proxy as PyCallable;
  }

  protected inspectFunctionSignature(callable: PyCallable): FunctionSignature {
    const inspectParametersProxy = this.getCallable("_inspect_parameters");
    const parameters = inspectParametersProxy(callable).toJs(); // type Array<Map<string, any>>
    return {
      name: callable.toJs()["__name__"],
      parameters: parameters.map((parameterMap: Map<string, any>) => ({
        name: parameterMap.get("name"),
        kind: parameterMap.get("kind") as ParameterKind,
        default: parameterMap.get("default"),
        annotation: parameterMap.get("annotation"),
      })),
    };
  }

  protected asNumpyArray(arrayLike: any, dtype: string = "float32"): PyBuffer {
    const proxy = this.getCallable("_asarray");
    return proxy(arrayLike, dtype);
  }

  applyWindow(signal: Float32Array | number[]): PyBuffer {
    const proxy = this.getCallable("_apply_window");
    return proxy(this.asNumpyArray(signal));
  }

  computeSpectrum(signal: Float32Array | number[], applyWindow: boolean): PyBuffer {
    const proxy = this.getCallable("_compute_spectrum");
    return proxy(this.asNumpyArray(signal), applyWindow);
  }

  transformSignal(signal: Float32Array | number[], options: TransformOptions): PyBuffer {
    switch (options.domain) {
      case "signal":
        return this.asNumpyArray(signal);
      case "spectrum":
        return this.computeSpectrum(signal, options.applyWindow);
    }
  }
}

export class FunctionExecutor extends PythonInterface {
  readonly code: string;
  private proxy: PyCallable;

  constructor(code: string, environment: PyodideInterface) {
    super(environment);
    this.code = code;
    const getFunctionProxy = () => {
      this.runPython(this.code);
      for (const name of this.namespace) {
        if (name.startsWith("_")) continue;
        const proxy = this.getProxy(name);
        if (this.isCallable(proxy)) {
          return proxy as PyCallable;
        }
        proxy.destroy();
      }
      throw new Error("No function defined");
    };
    this.proxy = getFunctionProxy();
  }

  inspect(): FunctionSignature {
    return this.inspectFunctionSignature(this.proxy);
  }

  invoke(
    signal: Float32Array | number[],
    options: TransformOptions,
    kwargs: Record<string, any> = {},
  ) {
    return this.proxy.callKwargs(this.transformSignal(signal, options), kwargs);
  }
}
