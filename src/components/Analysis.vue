<template>
  <div class="pa-4">
    <v-form>
      <v-select
        v-model="signalSelection"
        :items="signals"
        label="Signal"
        return-object
        hide-details
      />
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
      <v-btn
        prepend-icon="mdi-cog"
        :disabled="computing"
        :loading="computing"
        color="primary"
        variant="flat"
        block
        @click="compute"
      >
        Compute
      </v-btn>
    </v-form>

    <Plot :options="plotOptions" :data="plotData" class="mt-4" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { watchDebounced } from "@vueuse/core";
import { clamp, range } from "lodash";
import uPlot from "uplot";
import { usePyodide } from "../composables/usePyodide";
import Plot from "./Plot.vue";
import signalsHit from "../signals/hit.json";
import signalsSine from "../signals/sine.json";
import signalsSweep from "../signals/sweep.json";
import { FunctionExecutor } from "@/FunctionExecutor";
import { watch } from "vue";

const props = defineProps<{
  code: string;
}>();

const signals = [
  { title: "Hit", signal: signalsHit },
  { title: "Sine with 1/100 sampling rate", signal: signalsSine },
  { title: "Sweep from 0 to 1/10 sampling rate", signal: signalsSweep },
];
const signalSelection = ref(signals[0]);

const blocksize = ref(256);
const overlap = ref(50);
const stepsize = computed(() => blocksize.value * (1 - clamp(overlap.value / 100, 0, 1)));
const signal = computed<Float32Array>(() => new Float32Array(signalSelection.value.signal));
const samples = computed(() => signal.value.length);

const xvalues = computed<Int32Array>(() => new Int32Array(range(samples.value)));

const blocks = computed<Float32Array[]>(() => {
  const arr = [];
  let begin = 0;
  let end = blocksize.value;
  while (end <= samples.value) {
    arr.push(signal.value.subarray(begin, end));
    begin += stepsize.value;
    end += stepsize.value;
  }
  return arr;
});

const xvaluesBlocks = computed<Int32Array>(() => {
  const arr = new Int32Array(blocks.value.length);
  for (let i = 0; i < samples.value; i++) {
    arr[i] = 0.5 * blocksize.value + i * stepsize.value;
  }
  return arr;
});

const feature = ref<number[]>([]);

const plotOptions: uPlot.Options = {
  width: 0,
  height: 400,
  scales: {
    x: {
      time: false,
    },
    y: {},
    z: {},
  },
  axes: [
    {
      grid: { show: true, width: 1 },
      ticks: { width: 1 },
      size: 30,
    },
    {
      grid: { show: false },
      ticks: { width: 1 },
      size: 60,
    },
    {
      scale: "z",
      side: 1,
      grid: { show: true, width: 1 },
      ticks: { width: 1 },
      size: 60,
    },
  ],
  series: [
    {
      label: "Sample",
    },
    {
      show: true,
      label: "Signal",
      scale: "y",
      stroke: "black",
      width: 1,
      value: (u, value) => (value === null ? "--" : value.toPrecision(4)),
    },
    {
      show: true,
      label: "Feature",
      scale: "z",
      stroke: "red",
      width: 2,
      spanGaps: true,
      value: (u, value) => (value === null ? "--" : value.toPrecision(4)),
    },
  ],
};

const plotData = computed<uPlot.AlignedData>(() => {
  return uPlot.join([
    [xvalues.value, signal.value],
    [xvaluesBlocks.value, feature.value],
  ]);
});

const { load } = usePyodide();
const computing = ref(false);

async function compute() {
  try {
    computing.value = true;
    const py = await load();
    const executor = new FunctionExecutor(props.code, py);
    console.log(executor.inspect());

    feature.value = blocks.value.map((block) => {
      return executor.invoke(block, {});
    });
  } catch (e) {
    console.error(e);
    alert(e);
  } finally {
    computing.value = false;
  }
}

const watchItems = [() => props.code, signal, blocksize, overlap];
watch(watchItems, () => {
  feature.value = [];
});
watchDebounced(watchItems, compute, {
  debounce: 1000,
  immediate: true,
});
</script>
