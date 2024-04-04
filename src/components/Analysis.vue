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
import uPlot from "uplot";
import { usePyodide } from "../composables/usePyodide";
import Plot from "./Plot.vue";
import hitSignal from "../signals/hit.json";
import { FunctionExecutor } from "@/FunctionExecutor";

const props = defineProps<{
  code: string;
}>();

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

const { load } = usePyodide();

async function run() {
  const py = await load();
  const executor = new FunctionExecutor(props.code, py);
  console.log(executor.inspect());

  try {
    feature.value = blocks.value.map((block) => {
      return executor.invoke(block, {});
    });
    plotDataFeature.value = [timeFeature.value, feature.value];
  } catch (e) {
    console.error(e);
    alert(e);
  }
}

watchDebounced(() => props.code, run, { debounce: 1000, immediate: true });
</script>
