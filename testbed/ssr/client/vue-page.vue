<script setup lang="ts">
import { ref } from "vue";

const counter = ref(0);

function increment() {
  counter.value++;
}
</script>

<template>
  <h1>Vue SSR</h1>
  <button @click="increment">Clicked {{ counter }} time(s)</button>
</template>
