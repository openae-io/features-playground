<template>
  <table class="w-100">
    <thead>
      <tr>
        <th>Parameter</th>
        <th>Type</th>
        <th>Value</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="(param, index) in signature.parameters" :key="`param-${index}`">
        <td>
          <code>{{ param.name }}</code>
        </td>
        <td>
          <code>{{ param.annotation }}</code>
        </td>
        <td>
          <template v-if="index === 0">
            <div>
              Based on the name of the first parameter, following data is passed to the function:
              <v-radio-group v-model="inputDomain" density="compact" mandatory hide-details>
                <v-radio v-for="obj in inputDomainChoices" :key="obj.name" :value="obj.name">
                  <template #label>
                    <div>
                      <strong class="text-primary">{{ obj.name }}</strong>
                      {{ obj.description }}
                    </div>
                  </template>
                </v-radio>
              </v-radio-group>
            </div>
          </template>
          <template v-else>
            <v-text-field
              :model-value="parameters[param.name]"
              :type="getInputType(param.annotation)"
              :error="isNil(parameters[param.name])"
              :append-inner-icon="isNil(parameters[param.name]) ? 'mdi-alert' : ''"
              placeholder="Please enter a value"
              density="compact"
              hide-details
              @update:model-value="(value: string) => updateParameter(param.name, value)"
            />
          </template>
        </td>
      </tr>
    </tbody>
  </table>
</template>

<script setup lang="ts">
import { watch } from "vue";
import type { FunctionSignature, InputDomain } from "@/python";
import { difference, isEmpty, isNil } from "lodash";

type Parameters = Record<string, any>;

const inputDomainChoices = [
  { name: "signal", description: "Time-domain data" },
  { name: "spectrum", description: "Complex result of FFT" },
];

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
th,
td {
  text-align: left;
}

th:not(:last-child),
td:not(:last-child) {
  padding-right: 16px;
}
</style>
