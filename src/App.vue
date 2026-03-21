<script setup lang="ts">
import { useRoute } from 'vue-router'
import TopNavLayout from './layouts/TopNavLayout.vue'

const route = useRoute()
</script>

<template>
  <TopNavLayout v-if="route.meta.layout !== 'none'">
    <router-view />
  </TopNavLayout>
  <router-view v-else />
</template>
