<template>
  <div ref="targetRef" class="u-plot-container"></div>
</template>

<script setup lang="ts">
import { type PropType, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useElementBounding } from "@vueuse/core";
import uPlot from "uplot";
import "uplot/dist/uPlot.min.css";

const props = defineProps({
  options: {
    type: Object as PropType<uPlot.Options>,
    required: true,
  },
  data: {
    type: [Array, Function] as PropType<uPlot.AlignedData>,
    required: true,
  },
});

const emit = defineEmits(["create", "delete"]);

let chart = null as uPlot | null;

const targetRef = ref<HTMLElement | null>(null);
const { width } = useElementBounding(targetRef);

const setData = () => chart?.setData(props.data, true);

const create = () => {
  if (!targetRef.value) return;
  chart = new uPlot(props.options, props.data, targetRef.value);
  chart.setSize({
    width: width.value,
    height: props.options.height ?? 200,
  });
  setData();
  emit("create", chart);
};

const destroy = () => {
  if (chart) {
    emit("delete", chart);
    chart.destroy();
    chart = null;
  }
};

const recreate = () => {
  destroy();
  create();
};

watch(
  () => props.data,
  () => setData(),
);
watch(width, () => {
  recreate();
});
watch(
  () => props.options,
  () => recreate(),
);

onMounted(create);
onBeforeUnmount(destroy);
</script>

<style scoped>
.u-plot-container {
  width: 100%;
}

.u-plot-container :deep(.u-select) {
  background-color: #f00;
  opacity: 0.2;
}
</style>
