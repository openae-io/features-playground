<template>
  <codemirror
    v-model="code"
    v-bind="$attrs"
    placeholder="Code..."
    :autofocus="true"
    :indent-with-tab="true"
    :tab-size="4"
    :extensions="extensions"
    @ready="handleReady"
  />
</template>

<script setup lang="ts">
import { computed, shallowRef } from "vue";
import { Codemirror } from "vue-codemirror";
import { python } from "@codemirror/lang-python";
import { oneDark } from "@codemirror/theme-one-dark";

const props = defineProps({
  modelValue: { type: String, default: "" },
});

const emit = defineEmits(["update:modelValue"]);

const code = computed<string>({
  get() {
    return props.modelValue ?? "";
  },
  set(newValue: string) {
    emit("update:modelValue", newValue);
  },
});

const extensions = [python(), oneDark];

const view = shallowRef();
const handleReady = (payload: any) => {
  view.value = payload.view;
};
</script>
