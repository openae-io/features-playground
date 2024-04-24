<template>
  <div class="d-grid container">
    <!-- title row -->
    <div class="grid-title">Parameter</div>
    <div class="grid-title">Type</div>
    <div class="grid-title">Value</div>
    <!-- end title row -->
    <template v-for="(param, index) in signature.parameters" :key="`param-${index}`">
      <div>
        <code>{{ param.name }}</code>
      </div>
      <div>
        <code>{{ param.annotation }}</code>
      </div>
      <template v-if="index === 0">
        <div>The first parameter is used to pass (part of) the signal to the function.</div>
      </template>
      <template v-else>
        <v-text-field
          :model-value="model[param.name]"
          :disabled="index == 0"
          :type="getInputType(param.annotation)"
          density="compact"
          hide-details
          @update:model-value="(value: string) => updateParameter(param.name, value)"
        />
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
import { watch } from "vue";
import type { FunctionSignature } from "@/FunctionExecutor";
import { difference } from "lodash";

type Parameters = Record<string, any>;

function getInputType(annotation: string) {
  switch (annotation) {
    case "int":
    case "float":
      return "number";
  }
  return "text";
}

const model = defineModel<Parameters>({ required: true });
const props = defineProps<{ signature: FunctionSignature }>();

function updateParameter(name: string, value: string) {
  try {
    model.value[name] = value ? JSON.parse(value) : null;
  } catch {
    // ignore
  }
}

watch(
  () => props.signature,
  (newSignature) => {
    const params = newSignature.parameters;
    for (const param of params) {
      if (param.default != "_empty") {
        model.value[param.name] = model.value[param.name] ?? param.default;
      }
    }
    const keys = params.map((param) => param.name);
    const outdatedKeys = difference(Object.keys(model.value), keys);
    outdatedKeys.forEach((key) => delete model.value[key]);
  },
  { immediate: true },
);
</script>

<style scoped>
.container {
  display: grid;
  grid-template-columns: max-content max-content auto;
  row-gap: 8px;
  column-gap: 16px;
  align-items: center;
}

.grid-title {
  font-weight: bold;
}
</style>
