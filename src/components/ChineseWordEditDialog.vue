<template>
  <el-dialog :model-value="visible" title="设置" width="min(720px, 94vw)" class="cn-edit-dialog"
    :close-on-click-modal="true" @update:model-value="v => !v && emit('close')">
    <div class="cn-edit-body" v-if="entry">
      <div class="cn-edit-word">词条：{{ entry.word }}</div>
      <div class="cn-edit-grid">
        <div class="cn-edit-field">
          <div class="cn-edit-label">拼音</div>
          <el-input v-model="form.pinyin" clearable placeholder="编辑拼音，如 shǒu zhū dài tù" />
        </div>
        <div class="cn-edit-field">
          <div class="cn-edit-label">掌握水平</div>
          <el-select v-model="form.level" :class="['cn-edit-level', levelClass(form.level)]"
            popper-class="cn-level-popper">
            <el-option v-for="level in CHINESE_LEVELS" :key="level.value" :class="levelClass(level.value)"
              :label="level.label" :value="level.value" />
          </el-select>
        </div>
        <div class="cn-edit-field cn-edit-field--full">
          <div class="cn-edit-label">选择标签</div>
          <el-select v-model="form.tagIds" multiple clearable placeholder="选择标签">
            <el-option v-for="tag in chineseStore.tags" :key="tag.id" :label="tag.name" :value="tag.id" />
          </el-select>
        </div>
        <div class="cn-edit-field cn-edit-field--full cn-edit-field--top">
          <div class="cn-edit-label">备注</div>
          <el-input v-model="form.note" type="textarea" :rows="3" placeholder="记录笔记、易错点等" />
        </div>
        <div class="cn-edit-field cn-edit-field--full">
          <div class="cn-edit-label">测试次数</div>
          <div class="cn-edit-test-counts">
            <el-input v-model.number="form.correct" type="number" :min="0" class="cn-edit-test-input">
              <template #prepend>正确</template>
            </el-input>
            <el-input v-model.number="form.wrong" type="number" :min="0" class="cn-edit-test-input">
              <template #prepend>错误</template>
            </el-input>
          </div>
        </div>
      </div>
    </div>
    <template #footer>
      <el-button @click="emit('close')">取消</el-button>
      <el-button type="primary" :loading="saving" @click="save">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useChineseStore } from '../stores/chinese.js'
import { CHINESE_LEVELS } from '../types/index.js'

const props = defineProps({
  visible: { type: Boolean, default: false },
  word: { type: String, default: '' }
})
const emit = defineEmits(['close', 'saved'])

const chineseStore = useChineseStore({ lazy: true })
const saving = ref(false)

const entry = ref(null)
const form = ref({
  pinyin: '',
  level: 'unknown',
  tagIds: [],
  note: '',
  correct: 0,
  wrong: 0
})

watch(() => [props.visible, props.word], () => {
  if (props.visible && props.word) {
    loadEntry()
  }
}, { immediate: true })

function loadEntry() {
  const found = chineseStore.words.find(w => w.word === props.word)
  if (!found) {
    entry.value = null
    return
  }
  entry.value = found
  const total = Number(found.testTotalCount) || 0
  const correct = Number(found.testCorrectCount) || 0
  form.value = {
    pinyin: found.pinyin || '',
    level: found.level || 'unknown',
    tagIds: [...(found.tagIds || [])],
    note: found.note || '',
    correct,
    wrong: Math.max(0, total - correct)
  }
}

function levelClass(level) {
  return `level-${level || 'unknown'}`
}

async function save() {
  if (!entry.value?.word) return
  saving.value = true
  try {
    await chineseStore.updateWord(entry.value.word, {
      pinyin: form.value.pinyin,
      level: form.value.level,
      tagIds: form.value.tagIds,
      note: form.value.note
    })
    await chineseStore.setTestCount(entry.value.word, Number(form.value.correct) || 0, Number(form.value.wrong) || 0)
    emit('saved')
    emit('close')
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.cn-edit-body {
  display: flex;
  flex-direction: column;
}

.cn-edit-word {
  font-size: 14px;
  font-weight: 700;
  color: #1c1408;
  margin-bottom: 16px;
}

.cn-edit-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px 20px;
}

.cn-edit-field {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.cn-edit-field--full {
  grid-column: 1 / -1;
}

.cn-edit-field--top {
  align-items: flex-start;
}

.cn-edit-label {
  font-size: 13px;
  color: #7a563a;
  font-weight: 700;
  flex-shrink: 0;
  width: 80px;
  text-align: right;
}

.cn-edit-field :deep(.el-input),
.cn-edit-field :deep(.el-select),
.cn-edit-field :deep(.el-textarea) {
  flex: 1;
  min-width: 0;
}

.cn-edit-test-counts {
  display: flex;
  align-items: center;
  gap: 16px;
  flex: 1;
  min-width: 0;
}

.cn-edit-test-input {
  width: 140px;
  flex-shrink: 0;
}

.cn-edit-test-input :deep(.el-input-group__prepend) {
  font-size: 14px;
  color: #7a563a;
  background: #f5f7fa;
}

.cn-edit-level.level-unknown :deep(.el-select__wrapper) {
  color: #f56c6c;
}

.cn-edit-level.level-learning :deep(.el-select__wrapper) {
  color: #409eff;
}

.cn-edit-level.level-mastered :deep(.el-select__wrapper) {
  color: #e6a23c;
}

.cn-edit-level.level-familiar :deep(.el-select__wrapper) {
  color: #67c23a;
}
</style>
