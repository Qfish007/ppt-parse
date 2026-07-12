<template>
  <section v-if="!hidden" class="panel-center" :style="{ flex }">
    <div v-if="currentPage?.image" class="image-panel">
      <img :src="currentPage.image" :alt="'第 ' + currentPage.page + ' 页'" />
      <div v-if="isUserProjectPage" class="image-ocr-action">
        <el-button
          type="warning"
          size="small"
          :icon="Aim"
          :loading="isOcrParsing"
          @click="$emit('parse-current-image-ocr')"
        >
          {{ ocrButtonText }}
        </el-button>
      </div>
    </div>

    <div v-else-if="!currentPage?.lines?.length" class="empty-state">
      <p>这一页还没有内容。</p>
    </div>

    <div v-else class="page-text-center">
      <div class="study-header-center">
        <span>第 {{ currentPage.page }} 页</span>
        <strong>原文</strong>
      </div>
      <div v-for="(group, gi) in displayGroups" :key="gi" class="text-block">
        <template v-if="isTransProject">
          <p :class="orderedLine(group)[1] === 'en' ? 'text-en' : 'text-zh'">{{ orderedLine(group)[0] }}</p>
          <p :class="orderedLine(group)[3] === 'en' ? 'text-en' : 'text-zh'">{{ orderedLine(group)[2] }}</p>
        </template>
        <template v-else>
          <p class="text-en">{{ group.en }}</p>
          <p class="text-zh">{{ group.zh }}</p>
        </template>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { Aim } from '@element-plus/icons-vue'

const props = defineProps({
  hidden: {
    type: Boolean,
    default: false
  },
  flex: {
    type: Number,
    default: 1
  },
  currentPage: {
    type: Object,
    default: null
  },
  displayGroups: {
    type: Array,
    default: () => []
  },
  isTransProject: {
    type: Boolean,
    default: false
  },
  isUserProjectPage: {
    type: Boolean,
    default: false
  },
  isOcrParsing: {
    type: Boolean,
    default: false
  },
  ocrMessage: {
    type: String,
    default: ''
  },
  orderedLine: {
    type: Function,
    required: true
  }
})

defineEmits(['parse-current-image-ocr'])

const ocrButtonText = computed(() => {
  if (props.isOcrParsing) return props.ocrMessage
  return props.currentPage?.lines?.length ? '重新 OCR 识别此页' : 'OCR 识别此页'
})
</script>
