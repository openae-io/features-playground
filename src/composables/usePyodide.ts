import { type PyodideInterface } from "pyodide";
import { computed } from "vue";

let pyodide: PyodideInterface | null = null;

async function loadPyodideCached(): Promise<PyodideInterface> {
  if (pyodide === null) {
    console.log("Loading Pyodide");
    // @ts-expect-error: module loaded in HTML file from CDN
    pyodide = await loadPyodide();
    await pyodide!.loadPackage("numpy");
  }
  return pyodide!;
}

export function usePyodide() {
  const loading = computed(() => pyodide === null);

  return { loading, load: loadPyodideCached };
}
