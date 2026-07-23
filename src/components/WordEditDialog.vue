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
            <el-input v-model="formData.word" class="word-edit-control" placeholder="输入单词或短语" disabled />
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
              popper-class="word-edit-level-popper" :teleported="false">
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
import { ElInput, ElSelect, ElOption, ElButton } from 'element-plus'
import { useVocabularyStore } from '../stores/vocabulary.js'

const props = defineProps({
  visible: { type: Boolean, default: false },
  word: { type: String, default: '' }
})

const emit = defineEmits(['close', 'saved'])

const vocabularyStore = useVocabularyStore()

const VOCABULARY_LEVELS = [
  { value: 0, label: '未学习' },
  { value: 1, label: '已学习' },
  { value: 2, label: '已掌握' },
  { value: 3, label: '已熟悉' },
  { value: 4, label: '已遗忘' }
]

const formData = ref({
  word: '',
  meaning: '',
  phonetic: '',
  level: 0,
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
      level: entry.level || 0,
      memoryText: entry.memoryText || '',
      tagIds: entry.tagIds || [],
      note: entry.note || ''
    }
  }
}

function levelClass(level) {
  const classes = ['level-unknown', 'level-new', 'level-learned', 'level-mastered', 'level-familiar', 'level-forgot']
  return classes[level + 1] || classes[0]
}

function close() {
  emit('close')
}

function save() {
  vocabularyStore.updateWord({
    word: formData.value.word,
    meaning: formData.value.meaning,
    phonetic: formData.value.phonetic,
    level: formData.value.level,
    memoryText: formData.value.memoryText,
    tagIds: formData.value.tagIds,
    note: formData.value.note
  })
  emit('saved')
  close()
}

function removeWord() {
  vocabularyStore.removeWord(formData.value.word)
  emit('saved')
  close()
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

.word-edit-control.level-unknown :deep(.el-input__wrapper) {
  box-shadow: 0 0 0 1px #cbd5e1 inset;
}

.word-edit-control.level-new :deep(.el-input__wrapper) {
  box-shadow: 0 0 0 1px #ef4444 inset;
}

.word-edit-control.level-learned :deep(.el-input__wrapper) {
  box-shadow: 0 0 0 1px #3b82f6 inset;
}

.word-edit-control.level-mastered :deep(.el-input__wrapper) {
  box-shadow: 0 0 0 1px #22c55e inset;
}

.word-edit-control.level-familiar :deep(.el-input__wrapper) {
  box-shadow: 0 0 0 1px #eab308 inset;
}

.word-edit-control.level-forgot :deep(.el-input__wrapper) {
  box-shadow: 0 0 0 1px #f97316 inset;
}

.word-edit-control.level-unknown :deep(.el-select__wrapper) {
  box-shadow: 0 0 0 1px #cbd5e1 inset;
}

.word-edit-control.level-new :deep(.el-select__wrapper) {
  box-shadow: 0 0 0 1px #ef4444 inset;
}

.word-edit-control.level-learned :deep(.el-select__wrapper) {
  box-shadow: 0 0 0 1px #3b82f6 inset;
}

.word-edit-control.level-mastered :deep(.el-select__wrapper) {
  box-shadow: 0 0 0 1px #22c55e inset;
}

.word-edit-control.level-familiar :deep(.el-select__wrapper) {
  box-shadow: 0 0 0 1px #eab308 inset;
}

.word-edit-control.level-forgot :deep(.el-select__wrapper) {
  box-shadow: 0 0 0 1px #f97316 inset;
}
</style>
