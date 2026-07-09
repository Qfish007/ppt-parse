<template>
  <header v-if="!hidden" class="top-toolbar">
    <div class="top-toolbar-left">
      <el-button text size="large" :icon="Reading" @click="$emit('go-vocabulary')">生词本</el-button>
    </div>
    <div class="top-toolbar-spacer"></div>
    <el-button text size="large" :icon="Setting" @click="$emit('go-setting')">设置</el-button>
    <el-button size="small" @click="$emit('cycle-column-visibility')">{{ columnToggleLabel }}</el-button>
    <el-button size="small" text @click="$emit('hide')">折叠</el-button>
  </header>
</template>

<script setup>
import { Reading, Setting } from '@element-plus/icons-vue'

defineProps({
  hidden: {
    type: Boolean,
    default: false
  },
  columnToggleLabel: {
    type: String,
    default: '隐藏第1栏'
  }
})

defineEmits(['go-vocabulary', 'go-setting', 'cycle-column-visibility', 'hide'])
</script>
