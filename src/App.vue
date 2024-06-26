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
        <v-btn prepend-icon="mdi-share-variant" @click="shareLink">Share</v-btn>
        <v-menu>
          <template #activator="{ props }">
            <v-btn prepend-icon="mdi-launch" v-bind="props">Links</v-btn>
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
        <pane min-size="10" class="scroll">
          <CodeEditor v-model="code" :style="{ height: '100%' }" />
        </pane>
        <pane min-size="10" class="scroll">
          <Analysis :code="code" />
        </pane>
      </splitpanes>
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
import { useLocalStorage, useShare } from "@vueuse/core";
import { Splitpanes, Pane } from "splitpanes";
import "splitpanes/dist/splitpanes.css";
import CodeEditor from "./components/CodeEditor.vue";
import Analysis from "./components/Analysis.vue";
import codeExample from "./example.py?raw";

const code = useLocalStorage("code", codeExample);

const urlParams = new URLSearchParams(window.location.search);
if (urlParams.has("code")) {
  code.value = atob(urlParams.get("code")!);
}

const links = [
  { title: "OpenAE", icon: "mdi-launch", href: "https://openae.io" },
  { title: "GitHub", icon: "mdi-github", href: "https://github.com/openae-io" },
];

const { share } = useShare();
function shareLink() {
  const url = new URL(location.href);
  url.searchParams.set("code", btoa(code.value));
  share({
    title: "OpenAE Features Playground",
    text: "Code snippet",
    url: url.href,
  });
}
</script>

<style>
html {
  overflow-y: auto !important;
}
</style>

<style scoped>
.v-main {
  height: 100vh;
}

.splitpanes__pane {
  background-color: inherit !important;
}

.scroll {
  overflow: auto;
}
</style>
