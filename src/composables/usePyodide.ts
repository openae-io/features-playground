import { computed, ref } from "vue";
import { type PyodideInterface } from "pyodide";

const pyodide = ref<PyodideInterface | null>(null);

async function loadPyodideCached(): Promise<PyodideInterface> {
  if (pyodide.value === null) {
    console.log("Loading Pyodide");
    // @ts-expect-error: module loaded in HTML file from CDN
    pyodide.value = await loadPyodide();
    await pyodide.value!.loadPackage("numpy");
  }
  return pyodide.value!;
}

export function usePyodide() {
  const loading = computed(() => pyodide.value === null);

  return { loading, load: loadPyodideCached };
}
