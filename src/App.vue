<template>
  <v-app>
    <v-app-bar density="compact" elevation="0" border>
      <template #prepend>
        <img src="/icon.png" height="32" />
      </template>
      <v-toolbar-title>
        OpenAE <span class="font-weight-light">Features Playground</span>
      </v-toolbar-title>
      <template #append>
        <v-menu>
          <template #activator="{ props }">
            <v-btn prepend-icon="mdi-launch" variant="text" v-bind="props" />
          </template>
          <v-list density="compact">
            <v-list-item
              v-for="link in links"
              :key="link.title"
              :title="link.title"
              :prepend-icon="link.icon"
              :href="link.href"
              target="blank_"
            />
          </v-list>
        </v-menu>
      </template>
    </v-app-bar>
    <v-main>
      <splitpanes class="default-theme">
        <pane min-size="10">
          <CodeEditor v-model="code" />
        </pane>
        <pane min-size="10">
          <Suspense>
            <Analysis :code="code" />
            <template #fallback> Loading... </template>
          </Suspense>
        </pane>
      </splitpanes>
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { Splitpanes, Pane } from "splitpanes";
import "splitpanes/dist/splitpanes.css";
import CodeEditor from "./components/CodeEditor.vue";
import Analysis from "./components/Analysis.vue";

const links = [
  { title: "OpenAE", icon: "mdi-launch", href: "https://openae.io" },
  { title: "GitHub", icon: "mdi-github", href: "https://github.com/openae-io" },
];

const codeExample = `
import numpy as np

def rms(signal: np.ndarray) -> float:
    return np.sqrt(np.mean(signal ** 2))
`;

const code = ref(codeExample.trimStart());
</script>

<style scoped>
.splitpanes__pane {
  background-color: inherit !important;
}
</style>
