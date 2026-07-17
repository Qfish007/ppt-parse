<template>
  <header v-if="!hidden" class="top-toolbar">
    <div class="top-toolbar-left">
      <el-button v-if="showBack" type="primary" @click="$emit('go-back')">
        <el-icon>
          <ArrowLeft />
        </el-icon>
        {{ backLabel }}
      </el-button>
    </div>
    <div class="top-toolbar-spacer"></div>
    <el-button text size="large" :icon="Reading" @click="$emit('go-vocabulary')">生词本</el-button>
    <el-button size="small" @click="$emit('cycle-column-visibility')">{{ columnToggleLabel }}</el-button>
    <el-button text size="large" :icon="Setting" @click="$emit('go-setting')">设置</el-button>
    <el-button size="small" text :icon="ArrowUpBold" @click="$emit('hide')" title="折叠" />
  </header>
</template>

<script setup>
import { ArrowLeft, Reading, Setting, ArrowUpBold } from '@element-plus/icons-vue'

defineProps({
  hidden: {
    type: Boolean,
    default: false
  },
  columnToggleLabel: {
    type: String,
    default: '隐藏第1栏'
  },
  showBack: {
    type: Boolean,
    default: false
  },
  backLabel: {
    type: String,
    default: '返回'
  }
})

defineEmits(['go-vocabulary', 'go-setting', 'cycle-column-visibility', 'hide', 'go-back'])
</script>
