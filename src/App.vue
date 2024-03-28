<template>
  <header>
    <img src="/icon.png" height="24" />
    <span class="title">OpenAE Features Playground</span>
  </header>
  <splitpanes class="default-theme" style="height: calc(100vh - 48px)">
    <pane min-size="10">
      <CodeEditor v-model="code" />
    </pane>
    <pane min-size="10">
      <Suspense>
        <Analysis :code="code" />
        <template #fallback>
          Loading...
        </template>
      </Suspense>
    </pane>
  </splitpanes>
</template>

<style scoped>
header {
  display: flex;
  height: 48px;
  font-size: 16px;
  font-weight: 600;
  padding: 0px 12px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.12);
  align-items: center;
  gap: 12px;
}

header .title {
  font-weight: 600;
}

.splitpanes__pane {
  background-color: inherit !important;
}

.run-button {
  display: block;
  margin-top: 12px;
  margin-bottom: 12px;
  width: 100%;
}
</style>

<script setup lang="ts">
import { ref } from "vue";
import { Splitpanes, Pane } from "splitpanes";
import "splitpanes/dist/splitpanes.css";
import CodeEditor from "./components/CodeEditor.vue";
import Analysis from "./components/Analysis.vue";

const codeExample = `
import numpy as np

def rms(signal: np.ndarray) -> float:
    return np.sqrt(np.mean(signal ** 2))
`;

const code = ref(codeExample.trimStart());
</script>
