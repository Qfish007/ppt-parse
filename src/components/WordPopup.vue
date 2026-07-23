<template>
  <Teleport to="body">
    <div v-if="visible" class="word-popup" :style="style">
      <button class="word-popup-x" title="关闭" @click="$emit('close')">&times;</button>
      <div class="word-popup-heading">
        <div class="word-popup-title">{{ word }}</div>
        <div v-if="phonetic" class="word-popup-phonetic">{{ phonetic }}</div>
      </div>
      <div class="word-popup-meaning">{{ meaning }}</div>
      <div class="word-popup-actions">
        <button class="word-popup-sound" @click.stop="$emit('speak', word)">
          <svg viewBox="0 0 24 24">
            <path d="M11 5 6 9H3v6h3l5 4V5z"></path>
            <path d="M15.5 8.5a5 5 0 0 1 0 7"></path>
          </svg>
          <span>发音</span>
        </button>
        <button class="word-popup-translate" :disabled="translating" @click.stop="$emit('translate')">
          {{ translating ? '翻译中' : '翻译' }}
        </button>
        <button class="word-popup-add" :disabled="translating" @click.stop="$emit('add')">加入生词本</button>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  word: {
    type: String,
    default: ''
  },
  phonetic: {
    type: String,
    default: ''
  },
  meaning: {
    type: String,
    default: ''
  },
  translating: {
    type: Boolean,
    default: false
  },
  style: {
    type: Object,
    default: () => ({})
  }
})

defineEmits(['close', 'speak', 'translate', 'add'])
</script>

<style>
.word-popup {
  position: fixed;
  z-index: 20;
  width: min(280px, calc(100vw - 24px));
  padding: 14px 40px 14px 14px;
  border: 1px solid #bed0ca;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 16px 42px rgba(22, 32, 31, 0.18);
}

.word-popup-x {
  position: absolute;
  top: 8px;
  right: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: 1px solid transparent;
  border-radius: 999px;
  background: transparent;
  color: #63706d;
  cursor: pointer;
  font-size: 22px;
  line-height: 1;
  transition: all 0.15s;
}

.word-popup-x:hover {
  border-color: #d7dfdc;
  background: #f0f4f3;
  color: #16201f;
}

.word-popup::before {
  position: absolute;
  top: -7px;
  left: 50%;
  width: 12px;
  height: 12px;
  border-top: 1px solid #bed0ca;
  border-left: 1px solid #bed0ca;
  background: #ffffff;
  content: "";
  transform: translateX(-50%) rotate(45deg);
}

.word-popup-heading {
  display: flex;
  align-items: baseline;
  gap: 8px;
  min-width: 0;
}

.word-popup-title {
  color: #0f1b19;
  font-size: 24px;
  font-weight: 800;
  line-height: 1.2;
}

.word-popup-phonetic {
  color: #126b62;
  font-family: "Trebuchet MS", Arial, sans-serif;
  font-size: 15px;
  font-weight: 700;
  line-height: 1.35;
  white-space: nowrap;
}

.word-popup-meaning {
  margin-top: 8px;
  color: #40504c;
  font-size: 16px;
  line-height: 1.55;
}

.word-popup-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.word-popup-sound,
.word-popup-translate,
.word-popup-add {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 34px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
  transition: opacity 0.15s;
}

.word-popup-sound {
  gap: 6px;
  padding: 0 12px;
  border: 1px solid #126b62;
  background: #126b62;
  color: #fff;
}

.word-popup-sound svg {
  width: 16px;
  height: 16px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.word-popup-translate {
  padding: 0 10px;
  border: 1px solid #bed0ca;
  background: #f2faf7;
  color: #126b62;
  font-weight: 700;
}

.word-popup-translate:disabled {
  cursor: wait;
  opacity: 0.72;
}

.word-popup-add {
  padding: 0 10px;
  border: 1px solid #c9d5d1;
  background: #fffdfa;
  color: #40504c;
  font-weight: 700;
}

.word-popup-add:disabled {
  cursor: wait;
  opacity: 0.72;
}
</style>
