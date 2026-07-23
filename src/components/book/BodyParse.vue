<template>
  <section class="panel-right" :style="{
    flex,
    '--reader-body-font-size': `${bodyFontSize}px`,
    '--reader-title-font-size': `${bodyFontSize + 12}px`
  }">
    <div class="reader-header">
      <div class="reader-header-info">
        <span>第 {{ currentPage?.page || 0 }} 页 / {{ pageCount }} 页</span>
      </div>
      <div class="reader-actions">
        <el-button v-if="isToolbarHidden" size="small" @click="$emit('show-toolbar')">显示设置栏</el-button>
        <el-button size="small" :disabled="currentIndex <= 0" @click="$emit('prev-page')">
          <el-icon>
            <ArrowLeft />
          </el-icon>
        </el-button>
        <el-button size="small" type="primary" :disabled="!currentPage?.lines?.length"
          @click="$emit('read-current-page')">
          <el-icon>
            <VideoPlay />
          </el-icon> 朗读
        </el-button>
        <el-button size="small" type="danger" plain @click="$emit('stop')">
          <el-icon>
            <VideoPause />
          </el-icon> 停止
        </el-button>
        <el-button size="small" :disabled="currentIndex >= Math.max(pageCount, 1) - 1" @click="$emit('next-page')">
          <el-icon>
            <ArrowRight />
          </el-icon>
        </el-button>
      </div>
    </div>

    <div ref="contentRef" class="page-content">
      <div v-if="!currentPage" class="empty-state">
        <p>请选择一页开始学习。</p>
      </div>
      <div v-else-if="!currentPage.lines?.length" class="empty-state">
        <p>这一页还没有逐行文本。</p>
      </div>
      <template v-else>
        <section v-for="(group, index) in displayGroups" :key="index" class="study-block"
          :class="{ 'heading-block': index === 0 && isHeading(orderedLine(group)[0]) }">
          <span class="study-number">{{ String(index + 1).padStart(2, '0') }}</span>

          <template v-if="isTransProject">
            <template v-if="orderedLine(group)[1] === 'en'">
              <div class="study-lang-row">
                <button class="mini-play en" :disabled="!String(group?.en || '').trim()" title="朗读英文这一段"
                  @click="$emit('speak-en', group.en)">
                  <svg viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z"></path>
                  </svg>
                </button>
                <p class="english paragraph-text"
                  :class="{ 'lesson-title': index === 0 && isHeading(orderedLine(group)[0]) }">
                  <template v-for="(part, ti) in tokenize(orderedLine(group)[0])" :key="'f-' + ti">
                    <span v-if="shouldAddSpace(orderedLine(group)[0], ti)" class="space"> </span>
                    <button type="button" class="word" :class="{ readable: isReadable(part) }"
                      :disabled="!isReadable(part)" @click.stop="$emit('word-click', $event, part)">{{ part }}</button>
                  </template>
                </p>
              </div>
            </template>
            <template v-else>
              <div class="study-lang-row">
                <button class="mini-play zh" :disabled="!String(group?.zh || '').trim()" title="朗读中文这一段"
                  @click="$emit('speak-zh', group.zh)">
                  <svg viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z"></path>
                  </svg>
                </button>
                <div class="chinese chinese-first" contenteditable="true" data-placeholder="在这里补中文对照"
                  :innerHTML="orderedLine(group)[0]" @input="$emit('first-lang-edit', $event, group, 'zh')"></div>
              </div>
            </template>

            <template v-if="orderedLine(group)[3] === 'en'">
              <div class="study-lang-row">
                <button class="mini-play en" :disabled="!String(group?.en || '').trim()" title="朗读英文这一段"
                  @click="$emit('speak-en', group.en)">
                  <svg viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z"></path>
                  </svg>
                </button>
                <p class="english paragraph-text">
                  <template v-for="(part, ti) in tokenize(orderedLine(group)[2])" :key="'s-' + ti">
                    <span v-if="shouldAddSpace(orderedLine(group)[2], ti)" class="space"> </span>
                    <button type="button" class="word" :class="{ readable: isReadable(part) }"
                      :disabled="!isReadable(part)" @click.stop="$emit('word-click', $event, part)">{{ part }}</button>
                  </template>
                </p>
              </div>
            </template>
            <template v-else>
              <div class="study-lang-row">
                <button class="mini-play zh" :disabled="!String(group?.zh || '').trim()" title="朗读中文这一段"
                  @click="$emit('speak-zh', group.zh)">
                  <svg viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z"></path>
                  </svg>
                </button>
                <div class="chinese" contenteditable="true" data-placeholder="在这里补中文对照"
                  :innerHTML="orderedLine(group)[2]" @input="$emit('first-lang-edit', $event, group, 'zh')"></div>
              </div>
            </template>
          </template>

          <template v-else>
            <div class="study-lang-row">
              <button class="mini-play en" :disabled="!String(group?.en || '').trim()" title="朗读英文这一段"
                @click="$emit('speak-en', group.en)">
                <svg viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z"></path>
                </svg>
              </button>
              <p class="english paragraph-text" :class="{ 'lesson-title': index === 0 && isHeading(group.en) }">
                <template v-for="(part, ti) in tokenize(group.en)" :key="ti">
                  <span v-if="shouldAddSpace(group.en, ti)" class="space"> </span>
                  <button type="button" class="word" :class="{ readable: isReadable(part) }"
                    :disabled="!isReadable(part)" @click.stop="$emit('word-click', $event, part)">{{ part }}</button>
                </template>
              </p>
            </div>

            <div class="study-lang-row">
              <button class="mini-play zh" :disabled="!String(group?.zh || '').trim()" title="朗读中文这一段"
                @click="$emit('speak-zh', group.zh)">
                <svg viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z"></path>
                </svg>
              </button>
              <div class="chinese" contenteditable="true" data-placeholder="在这里补中文对照" :innerHTML="group.zh"
                @input="$emit('chinese-edit', $event, group)"></div>
            </div>
          </template>
        </section>
      </template>
    </div>

    <WordPopup :visible="wordPopup.visible" :word="wordPopup.word" :phonetic="wordPopup.phonetic"
      :meaning="wordPopup.meaning" :translating="wordPopup.translating" :style="wordPopup.style"
      @close="$emit('close-popup')" @speak="$emit('speak-en', $event)" @translate="$emit('translate-word')"
      @add="$emit('add-word')" />
  </section>
</template>

<script setup>
import { ref } from 'vue'
import { ArrowLeft, ArrowRight, VideoPlay, VideoPause } from '@element-plus/icons-vue'
import WordPopup from '../WordPopup.vue'

defineProps({
  flex: {
    type: Number,
    default: 1
  },
  isToolbarHidden: {
    type: Boolean,
    default: false
  },
  currentPage: {
    type: Object,
    default: null
  },
  pageCount: {
    type: Number,
    default: 0
  },
  currentIndex: {
    type: Number,
    default: 0
  },
  bodyFontSize: {
    type: Number,
    default: 18
  },
  displayGroups: {
    type: Array,
    default: () => []
  },
  isTransProject: {
    type: Boolean,
    default: false
  },
  wordPopup: {
    type: Object,
    required: true
  },
  orderedLine: {
    type: Function,
    required: true
  },
  tokenize: {
    type: Function,
    required: true
  },
  isReadable: {
    type: Function,
    required: true
  },
  shouldAddSpace: {
    type: Function,
    required: true
  },
  isHeading: {
    type: Function,
    required: true
  }
})

defineEmits([
  'show-toolbar',
  'prev-page',
  'next-page',
  'read-current-page',
  'stop',
  'speak-en',
  'speak-zh',
  'word-click',
  'first-lang-edit',
  'chinese-edit',
  'translate-word',
  'add-word',
  'close-popup'
])

const contentRef = ref(null)

function scrollToTop() {
  if (contentRef.value) contentRef.value.scrollTop = 0
}

defineExpose({ scrollToTop })
</script>
