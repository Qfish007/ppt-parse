<template>
  <el-dialog :model-value="visible" title="设置" width="460px" class="cn-edit-dialog"
    :close-on-click-modal="true" @update:model-value="v => !v && emit('close')">
    <div class="cn-edit-body" v-if="entry">
      <div class="cn-edit-word">词条：{{ entry.word }}</div>
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
      <div class="cn-edit-field">
        <div class="cn-edit-label">选择标签</div>
        <el-select v-model="form.tagIds" multiple clearable placeholder="选择标签">
          <el-option v-for="tag in chineseStore.tags" :key="tag.id" :label="tag.name" :value="tag.id" />
        </el-select>
      </div>
      <div class="cn-edit-field">
        <div class="cn-edit-label">备注</div>
        <el-input v-model="form.note" type="textarea" :rows="2" placeholder="记录笔记、易错点等" />
      </div>
      <div class="cn-edit-field">
        <div class="cn-edit-label">正确次数</div>
        <el-input-number v-model="form.correct" :min="0" :controls="false" />
      </div>
      <div class="cn-edit-field">
        <div class="cn-edit-label">错误次数</div>
        <el-input-number v-model="form.wrong" :min="0" :controls="false" />
      </div>
      <div class="cn-edit-field">
        <div class="cn-edit-label">总次数</div>
        <span class="cn-edit-total">{{ (Number(form.correct) || 0) + (Number(form.wrong) || 0) }} 次</span>
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
    await chineseStore.setTestCount(entry.value.word, form.value.correct, form.value.wrong)
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
  margin-bottom: 14px;
}

.cn-edit-field {
  margin-bottom: 14px;
}

.cn-edit-label {
  font-size: 12px;
  color: #7a563a;
  margin-bottom: 6px;
  font-weight: 700;
}

.cn-edit-total {
  font-size: 14px;
  font-weight: 700;
  color: #1c1408;
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
