<template>
  <Teleport to="body">
    <div v-if="visible" class="word-edit-mask" @click="close">
      <div class="word-edit-dialog" @click.stop>
        <div class="word-edit-header">
          <span class="word-edit-title">编辑单词</span>
          <button class="word-edit-close" @click="close">&times;</button>
        </div>
        <div class="word-edit-body">
          <div class="word-edit-field">
            <div class="word-edit-label">单词名称</div>
            <el-input v-model="formData.word" class="word-edit-control" placeholder="输入单词或短语"
              :disabled="!editableWord" />
          </div>
          <div class="word-edit-field">
            <div class="word-edit-label">中文释义</div>
            <el-input v-model="formData.meaning" class="word-edit-control" placeholder="输入中文释义" />
          </div>
          <div class="word-edit-field">
            <div class="word-edit-label">音标</div>
            <el-input v-model="formData.phonetic" class="word-edit-control" placeholder="输入音标，如 /əˈbɪləti/" />
          </div>
          <div class="word-edit-field">
            <div class="word-edit-label">掌握水平</div>
            <el-select v-model="formData.level" :class="['word-edit-control', levelClass(formData.level)]"
              popper-class="word-edit-level-popper" :teleported="false" clearable placeholder="选择掌握水平">
              <el-option v-for="level in VOCABULARY_LEVELS" :key="level.value" :class="levelClass(level.value)"
                :label="level.label" :value="level.value" />
            </el-select>
          </div>
          <div class="word-edit-field">
            <div class="word-edit-label">辅助记忆</div>
            <el-input v-model="formData.memoryText" class="word-edit-control" placeholder="例如：fa.mous" clearable />
          </div>
          <div class="word-edit-field">
            <div class="word-edit-label">单词标签</div>
            <div class="word-edit-control-wrap">
              <el-select v-model="formData.tagIds" multiple clearable placeholder="选择标签" class="word-edit-control"
                :teleported="false">
                <el-option v-for="tag in tags" :key="tag.id" :label="tag.name" :value="tag.id" />
              </el-select>
              <div v-if="!tags.length" class="word-edit-empty">
                还没有标签，请先到设置里添加。
              </div>
            </div>
          </div>
          <div class="word-edit-field">
            <div class="word-edit-label">备注</div>
            <el-input v-model="formData.note" type="textarea" :rows="3" class="word-edit-control"
              placeholder="添加备注信息" />
          </div>
        </div>
        <div class="word-edit-footer">
          <el-button type="danger" plain @click="removeWord">移除单词</el-button>
          <span class="word-edit-spacer"></span>
          <el-button @click="close">取消</el-button>
          <el-button type="primary" @click="save">保存</el-button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, watch } from 'vue'
import { ElInput, ElSelect, ElOption, ElButton, ElMessageBox, ElMessage } from 'element-plus'
import { useVocabularyStore } from '../stores/vocabulary.js'

const props = defineProps({
  visible: { type: Boolean, default: false },
  word: { type: String, default: '' },
  editableWord: { type: Boolean, default: false }
})

const emit = defineEmits(['close', 'saved'])

const vocabularyStore = useVocabularyStore()

const VOCABULARY_LEVELS = [
  { value: 'unknown', label: '不认识' },
  { value: 'learning', label: '已了解' },
  { value: 'mastered', label: '已掌握' },
  { value: 'familiar', label: '已熟记' }
]

const formData = ref({
  word: '',
  meaning: '',
  phonetic: '',
  level: null,
  memoryText: '',
  tagIds: [],
  note: ''
})

const tags = ref([])

watch(() => props.visible, (val) => {
  if (val && props.word) {
    loadWordData()
  }
})

watch(() => props.word, (val) => {
  if (props.visible && val) {
    loadWordData()
  }
})

function loadWordData() {
  tags.value = vocabularyStore.tags
  const entry = vocabularyStore.words.find(w => w.word === props.word)
  if (entry) {
    formData.value = {
      word: entry.word,
      meaning: entry.meaning || '',
      phonetic: entry.phonetic || '',
      level: entry.level || null,
      memoryText: entry.memoryText || '',
      tagIds: entry.tagIds || [],
      note: entry.note || ''
    }
  }
}

function levelClass(level) {
  if (level === null || level === undefined || level === '') return ''
  const classMap = {
    unknown: 'level-unknown',
    learning: 'level-learning',
    mastered: 'level-mastered',
    familiar: 'level-familiar'
  }
  return classMap[level] || ''
}

function close() {
  emit('close')
}

async function save() {
  const newWord = formData.value.word.trim()
  if (!newWord) {
    return
  }

  const level = formData.value.level ?? 'unknown'

  if (editableWord && newWord !== props.word) {
    await vocabularyStore.removeWord(props.word)
    await vocabularyStore.addWord({
      word: newWord,
      meaning: formData.value.meaning,
      phonetic: formData.value.phonetic,
      level,
      memoryText: formData.value.memoryText,
      tagIds: formData.value.tagIds,
      note: formData.value.note
    })
  } else {
    vocabularyStore.updateWord({
      word: formData.value.word,
      meaning: formData.value.meaning,
      phonetic: formData.value.phonetic,
      level,
      memoryText: formData.value.memoryText,
      tagIds: formData.value.tagIds,
      note: formData.value.note
    })
  }
  emit('saved')
  close()
}

async function removeWord() {
  try {
    await ElMessageBox.confirm(`确定从生词本移除「${formData.value.word}」吗？`, '提示', {
      confirmButtonText: '移除',
      cancelButtonText: '取消',
      type: 'warning'
    })
    vocabularyStore.removeWord(formData.value.word)
    ElMessage.success('已移除')
    emit('saved')
    close()
  } catch {
    // 用户取消
  }
}
</script>

<style scoped>
.word-edit-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.word-edit-dialog {
  width: 460px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  overflow: hidden;
}

.word-edit-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #eee;
}

.word-edit-title {
  font-size: 18px;
  font-weight: 700;
  color: #1e293b;
}

.word-edit-close {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: #f1f5f9;
  border-radius: 8px;
  font-size: 20px;
  color: #64748b;
  cursor: pointer;
}

.word-edit-body {
  padding: 20px;
  max-height: 60vh;
  overflow-y: auto;
}

.word-edit-field {
  margin-bottom: 16px;
}

.word-edit-label {
  font-size: 14px;
  font-weight: 600;
  color: #475569;
  margin-bottom: 8px;
}

.word-edit-control {
  width: 100%;
}

.word-edit-control-wrap {
  position: relative;
}

.word-edit-empty {
  position: absolute;
  bottom: -20px;
  left: 0;
  font-size: 12px;
  color: #94a3b8;
}

.word-edit-footer {
  display: flex;
  align-items: center;
  padding: 16px 20px;
  border-top: 1px solid #eee;
}

.word-edit-spacer {
  flex: 1;
}

.word-edit-level-popper :deep(.el-select-dropdown) {
  padding: 4px 0;
}

.word-edit-control.level-unknown :deep(.el-input__wrapper),
.word-edit-control.level-unknown :deep(.el-select__wrapper) {
  box-shadow: 0 0 0 1px #e5484d inset;
}

.word-edit-control.level-learning :deep(.el-input__wrapper),
.word-edit-control.level-learning :deep(.el-select__wrapper) {
  box-shadow: 0 0 0 1px #1d68d8 inset;
}

.word-edit-control.level-mastered :deep(.el-input__wrapper),
.word-edit-control.level-mastered :deep(.el-select__wrapper) {
  box-shadow: 0 0 0 1px #f08a24 inset;
}

.word-edit-control.level-familiar :deep(.el-input__wrapper),
.word-edit-control.level-familiar :deep(.el-select__wrapper) {
  box-shadow: 0 0 0 1px #19a974 inset;
}

:deep(.word-edit-level-popper .level-unknown) {
  color: #e5484d;
}

:deep(.word-edit-level-popper .level-learning) {
  color: #1d68d8;
}

:deep(.word-edit-level-popper .level-mastered) {
  color: #f08a24;
}

:deep(.word-edit-level-popper .level-familiar) {
  color: #19a974;
}
</style>
