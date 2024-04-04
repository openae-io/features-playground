import { PyodideInterface } from "pyodide";
import type { PyCallable, PyDict } from "pyodide/ffi";

export type ErrorHandler = (message: string) => void;

// https://docs.python.org/3/library/inspect.html#inspect.Parameter.kind
export enum ParameterKind {
  PositionalOnly = 0,
  PositionalOrKeyword = 1,
  VarPositional = 2, // *args
  KeywordOnly = 3,
  VarKeyword = 4, // **kwargs
}

interface FunctionParameter {
  name: string;
  kind: ParameterKind;
  default: "__empty__" | any;
  annotation: string;
}

interface FunctionSignature {
  name: string;
  parameters: FunctionParameter[];
}

const helperCodePython = `
from inspect import Parameter, signature
from numpy import asarray

def inspect_parameters(func, empty_value = "__empty__"):
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
`;

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

  invoke(signal: Float32Array | number[], kwargs: Record<string, any> = {}) {
    const asArrayProxy = this.namespace.get("asarray");
    return this.proxy.callKwargs(asArrayProxy(signal), kwargs);
  }
}
