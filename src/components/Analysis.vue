<template>
  <div style="padding: 8px">
    <Plot :options="plotOptionsSignal" :data="plotDataSignal" />
    <Plot :options="plotOptionsFeature" :data="plotDataFeature" />

    <v-form class="my-4">
      <v-text-field
        v-model.number="blocksize"
        type="number"
        min="0"
        :max="samples"
        label="Block size"
        hide-details
      />
      <v-text-field
        v-model.number="overlap"
        type="number"
        min="0"
        max="95"
        label="Overlap [%]"
        :suffix="`${Math.round(blocksize * (overlap / 100))} samples`"
      />
      <v-btn prepend-icon="mdi-cog" color="primary" variant="flat" block @click="run">
        Compute
      </v-btn>
    </v-form>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { watchDebounced } from "@vueuse/core";
import { clamp } from "lodash";
import type { PyodideInterface } from "pyodide";
import uPlot from "uplot";
import "splitpanes/dist/splitpanes.css";
import Plot from "./Plot.vue";
import hitSignal from "../signals/hit.json";

const props = defineProps<{
  code: string;
}>();

// @ts-expect-error: module loaded in HTML file from CDN
const pyodide: PyodideInterface = await loadPyodide();
await pyodide.loadPackage("numpy");
// pre-import numpy library for faster code execution afterwards
await pyodide.runPythonAsync("import numpy");

const blocksize = ref(256);
const overlap = ref(50);
const stepsize = computed(() => blocksize.value * (1 - clamp(overlap.value / 100, 0, 1)));
const signal = computed<Float32Array>(() => new Float32Array(hitSignal));
const samples = computed(() => signal.value.length);

const time = computed<Float32Array>(() => {
  const arr = new Float32Array(samples.value);
  for (let i = 0; i < samples.value; i++) {
    arr[i] = i; // / samplerate.value;
  }
  return arr;
});

const blocks = computed<Float32Array[]>(() => {
  const arr = [];
  let begin = 0;
  let end = blocksize.value;
  while (end < samples.value) {
    arr.push(signal.value.subarray(begin, end));
    begin += stepsize.value;
    end += stepsize.value;
  }
  return arr;
});

const timeFeature = computed<Float32Array>(() => {
  const arr = new Float32Array(blocks.value.length);
  for (let i = 0; i < samples.value; i++) {
    arr[i] = (i + 0.5) * stepsize.value; // / samplerate.value;
  }
  return arr;
});

const feature = ref<number[]>([]);

const plotScales = computed<uPlot.Scales>(() => ({
  x: {
    time: false,
    // range: [0, signal.value.length],
    min: 0,
    max: signal.value.length,
  },
}));

const cursorSync = uPlot.sync("cursor");
const matchSyncKeys = (own: string | null, ext: string | null) => own === ext;

const cursorOptions: uPlot.Cursor = {
  lock: true,
  x: true,
  y: false,
  sync: {
    key: cursorSync.key,
    setSeries: true,
    match: [matchSyncKeys, matchSyncKeys],
  },
};

const plotOptionsSignal: uPlot.Options = {
  width: 0,
  height: 250,
  cursor: cursorOptions,
  scales: plotScales.value,
  series: [
    {},
    {
      show: true,
      label: "Signal",
      stroke: "black",
      width: 1,
    },
  ],
};

const plotOptionsFeature = computed<uPlot.Options>(() => ({
  width: 0,
  height: 250,
  cursor: cursorOptions,
  scales: plotScales.value,
  series: [
    {},
    {
      show: true,
      label: "Feature",
      stroke: "red",
      width: 1,
    },
  ],
}));

const plotDataSignal = computed<uPlot.AlignedData>(() => [time.value, signal.value]);
const plotDataFeature = ref<uPlot.AlignedData>([]);

const run = async () => {
  console.log("Run Python code");
  const namespace = pyodide.globals.get("dict")();
  const getFunction = () => {
    for (const name of namespace) {
      const proxy = namespace.get(name);
      if (proxy instanceof pyodide.ffi.PyCallable && !name.startsWith("_")) {
        return proxy;
      }
      proxy.destroy();
    }
    throw Error("No function found");
  };

  pyodide.runPython(props.code, { globals: namespace });
  const func = getFunction();

  pyodide.runPython(
    `
    from inspect import Parameter, signature
    from numpy import asarray

    def inspect_function(func, empty_value = "__empty__"):
        def convert_empty(value):
            return value if value is not Parameter.empty else empty_value

        return  {
            name: {
                # Parameter.kind enum:
                # 0: POSITIONAL_ONLY
                # 1: POSITIONAL_OR_KEYWORD
                # 2: VAR_POSITIONAL
                # 3: KEYWORD_ONLY
                # 4: VAR_KEYWORD
                "kind": int(param.kind),
                "default": convert_empty(param.default),
                "annotation": param.annotation.__name__,
            }
            for name, param in signature(func).parameters.items()
        }
    `,
    { globals: namespace },
  );

  const inspectFunction = namespace.get("inspect_function");
  const asArray = namespace.get("asarray");
  console.log(inspectFunction(func).toJs());

  try {
    feature.value = blocks.value.map((block) => {
      return func.callKwargs(asArray(block), {});
    });
    plotDataFeature.value = [timeFeature.value, feature.value];
  } catch (e) {
    console.error(e);
    alert(e);
  }
};

watchDebounced(() => props.code, run, { debounce: 1000, immediate: true });
</script>
