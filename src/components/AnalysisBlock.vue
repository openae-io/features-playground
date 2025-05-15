<template>
  <div class="d-flex flex-wrap ga-2">
    <v-number-input v-model="index" :min="0" :max="blocks.length - 1" label="Block" hide-details />
    <v-text-field :model-value="feature" label="Feature" readonly hide-details />
  </div>

  <v-row no-gutters>
    <v-col cols="6"><Plot :options="plotOptionsSignal" :data="plotDataSignal" /></v-col>
    <v-col cols="6"><Plot :options="plotOptionsSpectrum" :data="plotDataSpectrum" /></v-col>
  </v-row>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { range } from "lodash";
import { usePyodide } from "@/composables/usePyodide";
import Plot from "@/components/Plot.vue";
import { PythonInterface } from "@/python";

const props = defineProps<{
  blocks: Float32Array[];
  features: number[];
  applyWindow: boolean;
}>();

const index = defineModel<number>("index", { required: true });

const block = computed(() => props.blocks[index.value]);
const feature = computed(() => props.features[index.value]);
const blockWindow = ref(new Float32Array());
const blockMagnitudes = ref(new Float32Array());

const { load: loadPyodide } = usePyodide();
watch(
  [props, index],
  async () => {
    const py = new PythonInterface(await loadPyodide());
    blockWindow.value = py.applyWindow(block.value).toJs();
    const complexSpectrumProxy = py.computeSpectrum(block.value, props.applyWindow);
    blockMagnitudes.value = complexSpectrumProxy.__abs__().toJs();
  },
  { immediate: true },
);

const plotHeight = 300;
const plotOptionsCommon: uPlot.Options = {
  width: 0,
  height: plotHeight,
  scales: {
    x: {
      time: false,
    },
    y: {},
  },
  axes: [
    {
      grid: { show: true, width: 1 },
      ticks: { width: 1 },
      size: 30,
    },
    {
      grid: { show: true, width: 1 },
      ticks: { width: 1 },
      size: 60,
    },
  ],
  series: [],
};

const plotOptionsSignal = computed<uPlot.Options>(() => ({
  ...plotOptionsCommon,
  series: [
    {
      label: "Sample",
      scale: "x",
    },
    {
      label: "Signal",
      show: true,
      scale: "y",
      stroke: "black",
      width: 1,
    },
    {
      label: "Windowed",
      show: true,
      scale: "y",
      stroke: "red",
      width: 1,
    },
  ],
}));

const plotOptionsSpectrum = computed<uPlot.Options>(() => ({
  ...plotOptionsCommon,
  series: [
    {
      label: "Normalized frequency",
      scale: "x",
    },
    {
      label: "Magnitude",
      show: true,
      scale: "y",
      stroke: "black",
      width: 1,
    },
  ],
}));

const plotDataSignal = computed<uPlot.AlignedData>(() => [
  range(block.value.length),
  block.value,
  blockWindow.value,
]);

function normalizedFrequencies(bins: number) {
  return Array.from({ length: bins }, (_, i) => i / (2 * bins));
}

const plotDataSpectrum = computed<uPlot.AlignedData>(() => [
  normalizedFrequencies(blockMagnitudes.value.length),
  blockMagnitudes.value,
]);
</script>
