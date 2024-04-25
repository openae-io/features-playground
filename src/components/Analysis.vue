<template>
  <div class="pa-4">
    <v-alert v-if="error" type="error" variant="tonal" density="compact" class="mb-4">
      <pre style="white-space: pre-wrap">{{ error }}</pre>
    </v-alert>
    <div class="mb-4">
      <template v-if="signature">
        <Parameters
          v-model:parameters="parameters"
          v-model:input-domain="inputDomain"
          :signature="signature"
        />
      </template>
      <template v-else>
        <p>Running Python code and load function signature...</p>
      </template>
    </div>
    <v-form>
      <v-select v-model="signalChoice" :items="signals" label="Signal" return-object hide-details />
      <div class="d-flex">
        <v-text-field
          v-model.number="blocksize"
          type="number"
          min="1"
          :max="samples"
          label="Block size"
          suffix="samples"
          hide-details
        />
        <v-text-field
          v-model.number="overlap"
          type="number"
          min="0"
          max="95"
          label="Overlap [%]"
          :suffix="`${Math.round(blocksize * (overlap / 100))} samples`"
          hide-details
        />
      </div>

      <v-btn
        prepend-icon="mdi-cog"
        :disabled="computing"
        :loading="computing"
        color="primary"
        variant="flat"
        class="my-4"
        block
        @click="compute"
      >
        Compute
      </v-btn>
    </v-form>

    <Plot :options="plotOptions" :data="plotData" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { watchDebounced } from "@vueuse/core";
import { range } from "lodash";
import uPlot from "uplot";
import { usePyodide } from "../composables/usePyodide";
import Parameters from "./Parameters.vue";
import Plot from "./Plot.vue";
import { FunctionExecutor, FunctionSignature, InputDomain } from "@/FunctionExecutor";
import { watch } from "vue";

const props = defineProps<{
  code: string;
}>();

interface Signal {
  title: string;
  data: number[];
}

const signals = ref<Signal[]>([]);
const signalChoice = ref<Signal>({ title: "Empty", data: [] });
onMounted(async () => {
  const importList = import.meta.glob("../signals/*.json", { eager: false });
  const importFuncs = Object.values(importList);
  signals.value = await Promise.all(
    importFuncs.map(async (importFunc: any) => (await importFunc()).default as Signal),
  );
  signalChoice.value = signals.value[0];
});

const blocksize = ref(256);
const overlap = ref(50);
const stepsize = computed(() => blocksize.value * (1 - overlap.value / 100));
const signal = computed<Float32Array>(() => new Float32Array(signalChoice.value.data));
const samples = computed(() => signal.value.length);

const xvalues = computed<Int32Array>(() => new Int32Array(range(samples.value)));

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

const xvaluesBlocks = computed<Int32Array>(() => {
  const arr = new Int32Array(blocks.value.length);
  for (let i = 0; i < arr.length; i++) {
    arr[i] = 0.5 * blocksize.value + i * stepsize.value;
  }
  return arr;
});

const feature = ref<number[]>([]);

const colorSignal = "#2196F3";
const colorFeature = "black";
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
    },
    {
      show: true,
      label: "Signal",
      scale: "y",
      stroke: colorSignal,
      width: 1,
      value: (u, value) => (value === null ? "--" : value.toPrecision(4)),
    },
    {
      show: true,
      label: "Feature",
      scale: "z",
      stroke: colorFeature,
      width: 1,
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
const loading = ref(false);
const error = ref<string | null>(null);
const executor = ref<FunctionExecutor | null>(null);
const signature = ref<FunctionSignature | null>(null);
const parameters = ref<Record<string, any>>({});
const inputDomain = ref<InputDomain>("signal");
async function loadCode() {
  error.value = null;
  loading.value = true;
  executor.value = null;
  signature.value = null;
  try {
    const py = await load();
    executor.value = new FunctionExecutor(props.code, py);
    signature.value = executor.value.inspect();
  } catch (e) {
    error.value = String(e);
  } finally {
    loading.value = false;
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
    feature.value = blocks.value.map((block) => {
      return executor.value!.invoke(block, inputDomain.value, parameters.value);
    });
  } catch (e) {
    error.value = String(e);
  } finally {
    computing.value = false;
  }
}

const watchItems = [executor, inputDomain, parameters, signal, blocksize, overlap];
watch(
  watchItems,
  () => {
    feature.value = [];
  },
  { deep: true },
);
watchDebounced(watchItems, compute, {
  debounce: 250,
  deep: true,
  immediate: true,
});
</script>
