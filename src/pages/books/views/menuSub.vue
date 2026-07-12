<template>
  <aside v-if="!hidden && isDefaultBook" class="sidebar" :style="{ width: width + 'px' }">
    <div class="sidebar-header">
      <h1 class="brand-title">{{ book?.title || '双语逐页朗读器' }}</h1>
    </div>

    <label class="field">
      <span>跳转到页码</span>
      <el-input-number :model-value="pageInputVal" :min="1" :max="book?.pages?.length || 1" size="small"
        style="width: 100%" @update:model-value="$emit('update:pageInputVal', $event)"
        @change="$emit('go-to-page', $event)" />
    </label>

    <nav class="page-list">
      <button v-for="(page, index) in book?.pages" :key="page.page" type="button" class="page-link"
        :class="{ active: index === currentIndex }" @click="$emit('select-page', index)">
        第 {{ page.page }} 页
      </button>
    </nav>
  </aside>

  <aside v-else-if="!hidden" class="detail-panel" :style="{ width: width + 'px' }">
    <ProjectDetail />
  </aside>
</template>

<script setup>
import ProjectDetail from '../../../components/ProjectDetail.vue'

defineProps({
  hidden: {
    type: Boolean,
    default: false
  },
  width: {
    type: Number,
    default: 200
  },
  isDefaultBook: {
    type: Boolean,
    default: true
  },
  book: {
    type: Object,
    default: null
  },
  currentIndex: {
    type: Number,
    default: 0
  },
  pageInputVal: {
    type: Number,
    default: 1
  }
})

defineEmits(['update:pageInputVal', 'go-to-page', 'select-page'])
</script>
