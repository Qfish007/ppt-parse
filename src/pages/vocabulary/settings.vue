<template>
  <div class="vocab-settings-page">
    <header class="settings-header">
      <div class="settings-title-wrap">
        <el-button type="primary" @click="goBack">
          <el-icon><ArrowLeft /></el-icon>
          返回生词本
        </el-button>
        <h2 class="settings-title">生词本设置</h2>
      </div>
    </header>

    <section class="settings-card">
      <div class="tag-editor">
        <label class="field-label">自定义标签</label>
        <div class="tag-input-row">
          <el-input
            v-model="tagName"
            clearable
            placeholder="例如：第一学期、本周、爸妈要求的"
            @keyup.enter="addTag"
          />
          <el-button type="primary" @click="addTag">添加</el-button>
        </div>
      </div>

      <div class="tag-list">
        <div v-if="!vocabularyStore.tags.length" class="tag-empty">暂无自定义标签。</div>
        <div v-for="tag in vocabularyStore.tags" :key="tag.id" class="tag-pill">
          <span class="tag-name">{{ tag.name }}</span>
          <button class="tag-remove" title="删除" @click="removeTag(tag)">&times;</button>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft } from '@element-plus/icons-vue'
import { useVocabularyStore } from '../../stores/vocabulary.js'

const router = useRouter()
const vocabularyStore = useVocabularyStore()
const tagName = ref('')

function goBack() {
  router.push('/vocabulary')
}

function addTag() {
  const name = tagName.value.trim()
  if (!name) {
    ElMessage.warning('请输入标签名称')
    return
  }
  const existing = vocabularyStore.tags.find(tag => tag.name === name)
  const tag = vocabularyStore.addTag(name)
  tagName.value = ''
  ElMessage.success(existing ? `标签「${tag.name}」已存在` : `已添加标签「${tag.name}」`)
}

async function removeTag(tag) {
  try {
    await ElMessageBox.confirm(`删除标签「${tag.name}」后，会从所有单词上移除这个标签。`, '提示', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning'
    })
    vocabularyStore.removeTag(tag.id)
    ElMessage.success('已删除')
  } catch {
    // 用户取消
  }
}
</script>

<style scoped>
.vocab-settings-page {
  min-height: 100vh;
  box-sizing: border-box;
  padding: 28px;
  background: linear-gradient(135deg, #eef4f1 0%, #f8f7f2 48%, #edf1f8 100%);
}

.settings-header,
.settings-card {
  max-width: 760px;
  margin: 0 auto;
}

.settings-header {
  margin-bottom: 18px;
}

.settings-title-wrap,
.tag-input-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.settings-title {
  margin: 0;
  color: #16201f;
  font-size: 22px;
  font-weight: 700;
}

.settings-card {
  padding: 22px;
  border: 1px solid #d7dfdc;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 18px 50px rgba(22, 32, 31, 0.1);
}

.field-label {
  display: block;
  margin-bottom: 10px;
  color: #40504c;
  font-size: 13px;
  font-weight: 700;
}

.tag-input-row .el-input {
  flex: 1;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 18px;
  padding-top: 18px;
  border-top: 1px solid #edf1ef;
}

.tag-pill {
  position: relative;
  display: inline-flex;
  align-items: center;
  min-height: 36px;
  padding: 0 14px;
  border: 1px solid #b8d6cb;
  border-radius: 999px;
  background: #eef7f4;
  color: #126b62;
}

.tag-name {
  font-size: 14px;
  font-weight: 700;
}

.tag-remove {
  position: absolute;
  top: -8px;
  right: -8px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  padding: 0;
  border: 1px solid #f2b8b8;
  border-radius: 999px;
  background: #fff;
  color: #e5484d;
  cursor: pointer;
  font-size: 18px;
  line-height: 18px;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.15s;
}

.tag-pill:hover .tag-remove {
  opacity: 1;
  pointer-events: auto;
}

.tag-empty {
  width: 100%;
  padding: 10px 0 0;
  color: #8c9996;
  text-align: center;
}
</style>
