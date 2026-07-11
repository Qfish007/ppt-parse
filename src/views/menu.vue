<template>
  <aside v-if="!hidden" class="project-panel" :style="{ width: width + 'px' }">
    <ProjectSidebar />
  </aside>
</template>

<script setup>
import ProjectSidebar from '../components/ProjectSidebar.vue'

defineProps({
  hidden: {
    type: Boolean,
    default: false
  },
  width: {
    type: Number,
    default: 220
  }
})
</script>
