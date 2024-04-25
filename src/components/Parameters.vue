<template>
  <div class="d-grid parameter-grid">
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
        <div>
          Based on the name of the first parameter, following data is passed to the function:
          <v-radio-group v-model="inputDomain" density="compact" mandatory hide-details>
            <v-radio value="signal">
              <template #label>
                <div><code>signal</code>: Time-domain data</div>
              </template>
            </v-radio>
            <v-radio value="spectrum">
              <template #label>
                <div><code>spectrum</code>: Complex result of FFT</div>
              </template>
            </v-radio>
          </v-radio-group>
        </div>
      </template>
      <template v-else>
        <v-text-field
          :model-value="parameters[param.name]"
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
import type { FunctionSignature, InputDomain } from "@/FunctionExecutor";
import { difference, isEmpty } from "lodash";

type Parameters = Record<string, any>;

const props = defineProps<{ signature: FunctionSignature }>();
const parameters = defineModel<Parameters>("parameters", { required: true });
const inputDomain = defineModel<InputDomain | null | undefined>("inputDomain", { required: true });

function getInputType(annotation: string) {
  switch (annotation) {
    case "int":
    case "float":
      return "number";
  }
  return "text";
}

function tryParseValue(value: string) {
  try {
    return value ? JSON.parse(value) : null;
  } catch {
    // ignore
  }
  return null;
}

function updateParameter(name: string, value: string) {
  if (isEmpty(value)) {
    delete parameters.value[name];
  } else {
    parameters.value[name] = tryParseValue(value);
  }
}

function getInputDomain(name: string): InputDomain {
  switch (name) {
    case "spectrum":
      return "spectrum";
    default:
      return "signal";
  }
}

watch(
  () => props.signature,
  (newSignature) => {
    const newParameters = [...newSignature.parameters];
    const firstParameter = newParameters.shift();
    inputDomain.value = getInputDomain(firstParameter?.name ?? "signal");
    newParameters.forEach((param) => {
      if (param.default != "_empty") {
        parameters.value[param.name] = parameters.value[param.name] ?? param.default;
      }
    });
    const keys = newParameters.map((param) => param.name);
    const outdatedKeys = difference(Object.keys(parameters.value), keys);
    outdatedKeys.forEach((key) => delete parameters.value[key]);
  },
  { immediate: true },
);
</script>

<style scoped>
.parameter-grid {
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
