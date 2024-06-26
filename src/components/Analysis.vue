<template>
  <div class="d-flex flex-column ga-2 pa-4">
    <div v-if="loadingPyodide">
      Loading Python
      <v-progress-linear color="primary" indeterminate />
    </div>
    <div v-if="loadingCode">
      Running Python code and inspecting function signature
      <v-progress-linear color="primary" indeterminate />
    </div>

    <v-alert v-if="error" type="error" variant="tonal" density="compact">
      <pre style="white-space: pre-wrap">{{ error }}</pre>
    </v-alert>

    <div v-if="signature">
      <Parameters
        v-model:parameters="parameters"
        v-model:input-domain="inputDomain"
        :signature="signature"
      />
    </div>

    <v-form>
      <div class="d-flex flex-wrap ga-2 mt-2">
        <v-select
          v-model="signalChoice"
          :items="signals"
          label="Signal"
          class="w-100"
          return-object
          hide-details
        />
        <v-select
          v-model="processing"
          :items="processingChoices"
          label="Processing"
          return-objects
          hide-details
        />
        <v-text-field
          v-model.number="blocksizeBlockwise"
          :disabled="!blockwise"
          type="number"
          min="1"
          :max="samples"
          label="Block size"
          suffix="samples"
          hide-details
        />
        <v-text-field
          v-model.number="overlap"
          :disabled="!blockwise"
          type="number"
          min="0"
          max="95"
          label="Overlap [%]"
          :suffix="`${Math.round(blocksizeBlockwise * (overlap / 100))} samples`"
          hide-details
        />
      </div>

      <v-checkbox
        v-model="applyWindow"
        label="Apply hanning window before FFT"
        density="compact"
        hide-details
      />
    </v-form>

    <v-divider />

    <v-tabs v-model="tabOutput" color="primary" mandatory>
      <v-tab>Plot</v-tab>
      <v-tab>Table</v-tab>
      <v-tab>Blocks</v-tab>
    </v-tabs>

    <v-window v-model="tabOutput">
      <v-window-item>
        <Plot :options="plotOptions" :data="plotData" />
      </v-window-item>
      <v-window-item>
        <v-data-table
          :headers="tableHeaders"
          :items="tableData"
          items-per-page="-1"
          density="compact"
          height="400"
        >
          <template #item.actions="{ item }">
            <v-btn icon="mdi-magnify" size="small" variant="text" @click="showBlock(item.block)" />
          </template>
        </v-data-table>
      </v-window-item>
      <v-window-item>
        <AnalysisBlock
          :blocks="blocks"
          :features="features"
          :index="blockIndexSelected"
          :apply-window="applyWindow"
        />
      </v-window-item>
    </v-window>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { computedAsync, watchDebounced } from "@vueuse/core";
import { isNil, range } from "lodash";
import uPlot from "uplot";
import { usePyodide } from "@/composables/usePyodide";
import AnalysisBlock from "@/components//AnalysisBlock.vue";
import Parameters from "@/components/Parameters.vue";
import Plot from "@/components/Plot.vue";
import { FunctionExecutor, FunctionSignature, InputDomain } from "@/python";
import { clickableDataPlugin, highlightBlockPlugin } from "@/uPlotPlugins";
import { blockIndexToCenter, sampleToBlockIndex } from "@/utils";
import { signals } from "@/signals";

const props = defineProps<{
  code: string;
}>();

const signalChoice = ref(signals[0]);
const signal = computedAsync(() => signalChoice.value.load(), new Float32Array([]));
const samples = computed(() => signal.value.length);

type Processing = "full" | "blockwise";
const processingChoices = [
  { title: "Full signal", value: "full" },
  { title: "Block-wise", value: "blockwise" },
];
const processing = ref<Processing>("blockwise");
const blockwise = computed(() => processing.value === "blockwise");
const blocksizeBlockwise = ref(256);
const blocksize = computed(() => (blockwise.value ? blocksizeBlockwise.value : samples.value));
const overlap = ref(50);
const stepsize = computed(() => blocksize.value * (1 - overlap.value / 100));

const blocks = computed<Float32Array[]>(() => {
  if (blocksize.value < 1 || stepsize.value < 1) return [];
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

const blockIndex = computed(() => range(0, blocks.value.length));
const blockCenter = computed(() =>
  blockIndex.value.map((i) => blockIndexToCenter(i, blocksize.value, stepsize.value)),
);
const features = ref<number[]>([]);

const tabOutput = ref(0);
const blockIndexSelected = ref(0);

function showBlock(index: number) {
  blockIndexSelected.value = index;
  tabOutput.value = 2; // blocks tab
}

function makeValueFormatter(precision: number): uPlot.Series.Value {
  return (u, value) => (isNil(value) ? "--" : value.toPrecision(precision));
}

const colorSignal = "#2196F3";
const colorFeature = "black";
const plotOptions = computed<uPlot.Options>(() => ({
  width: 0,
  height: 400,
  cursor: {
    x: true,
    y: false,
  },
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
      stroke: colorSignal,
      grid: { show: false },
      ticks: { width: 1 },
      size: 60,
    },
    {
      stroke: colorFeature,
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
      scale: "x",
    },
    {
      label: "Block",
      scale: "x",
    },
    {
      label: "Signal",
      show: true,
      scale: "y",
      stroke: colorSignal,
      width: 1,
      value: makeValueFormatter(5),
    },
    {
      label: "Feature",
      show: true,
      scale: "z",
      stroke: colorFeature,
      width: 1,
      points: { show: true, size: 6 },
      spanGaps: true,
      value: makeValueFormatter(5),
    },
  ],
  plugins: [
    highlightBlockPlugin({ blocksize: blocksize.value, stepsize: stepsize.value }),
    clickableDataPlugin({
      onclick: (u, idx) => {
        showBlock(sampleToBlockIndex(idx, blocksize.value, stepsize.value));
      },
    }),
  ],
}));

const plotData = computed<uPlot.AlignedData>(() => {
  return uPlot.join([
    [blockCenter.value, blockIndex.value],
    [range(samples.value), signal.value],
    [blockCenter.value, features.value],
  ]);
});

const tableHeaders = [
  { key: "block", title: "Block" },
  { key: "start", title: "Sample start" },
  { key: "value", title: "Feature value" },
  { key: "actions", title: "Actions" },
];
const tableData = computed(() =>
  features.value.map((value, i) => ({
    block: i,
    start: i * stepsize.value,
    value: value,
  })),
);

const { load: loadPyodide, loading: loadingPyodide } = usePyodide();
const loadingCode = ref(false);
const error = ref<string | null>(null);
const executor = ref<FunctionExecutor | null>(null);
const signature = ref<FunctionSignature | null>(null);
const parameters = ref<Record<string, any>>({});
const inputDomain = ref<InputDomain>("signal");
const applyWindow = ref(true);
async function loadCode() {
  error.value = null;
  executor.value = null;
  signature.value = null;
  try {
    const py = await loadPyodide();
    loadingCode.value = true;
    executor.value = new FunctionExecutor(props.code, py);
    signature.value = executor.value.inspect();
  } catch (e) {
    error.value = String(e);
  } finally {
    loadingCode.value = false;
  }
}

watchDebounced(() => props.code, loadCode, {
  debounce: 1000,
  immediate: true,
});

const computing = ref(false);
async function compute() {
  if (executor.value === null) return;
  computing.value = true;
  error.value = null;
  try {
    features.value = blocks.value.map((block) => {
      return executor.value!.invoke(
        block,
        {
          domain: inputDomain.value,
          applyWindow: applyWindow.value,
        },
        parameters.value,
      );
    });
  } catch (e) {
    error.value = String(e);
  } finally {
    computing.value = false;
  }
}

const watchItems = [executor, inputDomain, applyWindow, parameters, signal, blocksize, overlap];
watch(
  watchItems,
  () => {
    features.value = [];
  },
  { deep: true },
);
watchDebounced(watchItems, compute, {
  debounce: 250,
  deep: true,
  immediate: true,
});
</script>
