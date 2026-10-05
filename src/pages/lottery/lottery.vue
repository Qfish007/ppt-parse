<template>
  <div class="lottery-page" :style="pageStyle">
    <header class="lottery-header">
      <el-button type="primary" @click="goBack">
        <el-icon><ArrowLeft /></el-icon>
        返回首页
      </el-button>
      <h1 class="lottery-title">{{ lotteryStore.title }}</h1>
      <el-button @click="goSettings" title="抽奖设置">
        设置
      </el-button>
    </header>

    <div class="lottery-body">
      <aside class="lottery-aside">
        <div class="lottery-aside-header">
          <span class="lottery-aside-title">抽奖列表</span>
          <el-button size="small" type="primary" plain @click="onAddActivity">添加</el-button>
        </div>
        <ul class="lottery-activity-list">
          <li
            v-for="act in lotteryStore.activities"
            :key="act.id"
            class="lottery-activity-item"
            :class="{ active: act.id === lotteryStore.activeId }"
            @click="onSelectActivity(act)"
          >
            <span class="activity-name" :title="act.name">{{ act.name }}</span>
            <span class="activity-actions" @click.stop>
              <el-icon class="activity-action" title="重命名" @click="onRenameActivity(act)"><Edit /></el-icon>
              <el-icon
                class="activity-action activity-action--danger"
                :class="{ disabled: lotteryStore.activities.length <= 1 }"
                title="删除"
                @click="onRemoveActivity(act)"
              ><Delete /></el-icon>
            </span>
          </li>
        </ul>
      </aside>

      <main class="lottery-main">
        <LotteryWheel
          :prizes="lotteryStore.prizes"
          :rotation-deg="rotationDeg"
          :spin-duration-ms="lotteryStore.spinDurationMs"
          :wheel-background-image="lotteryStore.wheelBackgroundImage"
          :is-spinning="isSpinning"
          @spin="onSpin"
        />

        <p v-if="lastResult" class="lottery-result">
          恭喜获得：<strong>{{ lastResult.label }}</strong>
        </p>
        <p v-else class="lottery-hint">点击转盘中央「开始」或下方按钮参与抽奖</p>

        <el-button
          type="danger"
          size="large"
          round
          class="lottery-spin-btn"
          :disabled="isSpinning"
          @click="onSpin"
        >
          {{ isSpinning ? '抽奖进行中…' : '立即抽奖' }}
        </el-button>
      </main>
    </div>

    <el-dialog v-model="resultVisible" title="抽奖结果" width="360px" align-center>
      <div class="result-dialog-body">
        <div class="result-badge">🎉</div>
        <p class="result-label">{{ dialogPrize?.label }}</p>
      </div>
      <template #footer>
        <el-button type="primary" @click="resultVisible = false">知道了</el-button>
        <el-button @click="closeResultAndAgain">再抽一次</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ArrowLeft, Delete, Edit } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import LotteryWheel from './components/LotteryWheel.vue';
import { useLotteryStore } from '../../stores/lottery.js';
import { computePrizeSegments, pickPrizeByWeight } from './lotteryDraw.js';
import { playStartClick, playWinFanfare, startSpinTicks } from './lotterySound.js';

const router = useRouter();
const lotteryStore = useLotteryStore();

const rotationDeg = ref(0);
const isSpinning = ref(false);
const lastResult = ref(null);
const resultVisible = ref(false);
const dialogPrize = ref(null);
let stopSpinTicks = null;
let resultTimer = null;

onBeforeUnmount(() => {
  if (stopSpinTicks) stopSpinTicks();
  if (resultTimer) window.clearTimeout(resultTimer);
});

const pageStyle = computed(() => {
  if (!lotteryStore.pageBackgroundImage) return {};
  return {
    backgroundImage: `url(${lotteryStore.pageBackgroundImage})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center'
  };
});

onMounted(() => {
  lotteryStore.ensureLoaded();
});

function goBack() {
  router.push('/home');
}

function goSettings() {
  router.push('/lottery/settings');
}

function resetWheelState() {
  rotationDeg.value = 0;
  isSpinning.value = false;
  lastResult.value = null;
  resultVisible.value = false;
}

async function onSelectActivity(act) {
  if (isSpinning.value) {
    ElMessage.warning('抽奖进行中，请稍候');
    return;
  }
  await lotteryStore.setActive(act.id);
  resetWheelState();
}

async function onAddActivity() {
  try {
    const { value } = await ElMessageBox.prompt('请输入抽奖名称', '添加抽奖', {
      confirmButtonText: '添加',
      cancelButtonText: '取消',
      inputPlaceholder: '如：读书奖励、旅游抽奖',
      inputValidator: v => (v && v.trim() ? true : '名称不能为空')
    });
    if (isSpinning.value) {
      ElMessage.warning('抽奖进行中，请稍候');
      return;
    }
    await lotteryStore.addActivity(value);
    resetWheelState();
    ElMessage.success('已添加');
  } catch {
    /* cancelled */
  }
}

async function onRenameActivity(act) {
  try {
    const { value } = await ElMessageBox.prompt('请输入新的抽奖名称', '重命名', {
      confirmButtonText: '保存',
      cancelButtonText: '取消',
      inputValue: act.name,
      inputValidator: v => (v && v.trim() ? true : '名称不能为空')
    });
    await lotteryStore.renameActivity(act.id, value);
    ElMessage.success('已重命名');
  } catch {
    /* cancelled */
  }
}

async function onRemoveActivity(act) {
  if (lotteryStore.activities.length <= 1) {
    ElMessage.warning('至少保留一个抽奖');
    return;
  }
  try {
    await ElMessageBox.confirm(`确定删除「${act.name}」吗？该抽奖的奖项设置会一并删除。`, '删除抽奖', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消'
    });
    if (isSpinning.value) {
      ElMessage.warning('抽奖进行中，请稍候');
      return;
    }
    await lotteryStore.removeActivity(act.id);
    resetWheelState();
    ElMessage.success('已删除');
  } catch {
    /* cancelled */
  }
}

function onSpin() {
  if (isSpinning.value) return;

  const picked = pickPrizeByWeight(lotteryStore.prizes);
  if (!picked) {
    ElMessage.warning('请先在设置中添加至少一个有效奖项');
    return;
  }

  const segments = computePrizeSegments(lotteryStore.prizes);
  const segment = segments.find(s => s.prize.id === picked.id);
  if (!segment) return;

  isSpinning.value = true;
  lastResult.value = null;

  const currentMod = ((rotationDeg.value % 360) + 360) % 360;
  const targetMod = ((360 - segment.midDeg) % 360 + 360) % 360;
  let delta = targetMod - currentMod;
  if (delta <= 0) delta += 360;
  delta += lotteryStore.spinMinTurns * 360;
  rotationDeg.value += delta;

  playStartClick();
  stopSpinTicks = startSpinTicks(delta, lotteryStore.spinDurationMs);

  resultTimer = window.setTimeout(() => {
    if (stopSpinTicks) {
      stopSpinTicks();
      stopSpinTicks = null;
    }
    isSpinning.value = false;
    lastResult.value = picked;
    dialogPrize.value = picked;
    resultVisible.value = true;
    playWinFanfare();
    resultTimer = null;
  }, lotteryStore.spinDurationMs);
}

function closeResultAndAgain() {
  resultVisible.value = false;
  onSpin();
}
</script>

<style scoped>
.lottery-page {
  min-height: 100vh;
  box-sizing: border-box;
  padding: 16px 12px 24px;
  background: linear-gradient(160deg, #1a1a2e 0%, #16213e 45%, #0f3460 100%);
  display: flex;
  flex-direction: column;
}

.lottery-header {
  width: 100%;
  max-width: none;
  margin: 0 0 12px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.lottery-title {
  margin: 0;
  flex: 1;
  text-align: center;
  font-size: clamp(22px, 5vw, 32px);
  font-weight: 900;
  color: #fef3c7;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.35);
}

.lottery-body {
  flex: 1;
  width: 100%;
  display: flex;
  align-items: stretch;
  gap: 16px;
  min-height: 0;
}

.lottery-aside {
  flex-shrink: 0;
  width: 220px;
  display: flex;
  flex-direction: column;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.14);
  backdrop-filter: blur(4px);
  overflow: hidden;
}

.lottery-aside-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
}

.lottery-aside-title {
  font-size: 14px;
  font-weight: 800;
  color: #fef3c7;
}

.lottery-activity-list {
  list-style: none;
  margin: 0;
  padding: 8px;
  overflow-y: auto;
  display: grid;
  gap: 6px;
  align-content: start;
}

.lottery-activity-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 10px;
  cursor: pointer;
  color: rgba(255, 255, 255, 0.85);
  transition: background 0.15s ease;
}

.lottery-activity-item:hover {
  background: rgba(255, 255, 255, 0.12);
}

.lottery-activity-item.active {
  background: rgba(251, 191, 36, 0.22);
  color: #fde68a;
  font-weight: 800;
  box-shadow: inset 0 0 0 1px rgba(251, 191, 36, 0.45);
}

.activity-name {
  flex: 1;
  min-width: 0;
  font-size: 14px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.activity-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.activity-action {
  font-size: 15px;
  color: rgba(255, 255, 255, 0.65);
  cursor: pointer;
}

.activity-action:hover {
  color: #fff;
}

.activity-action--danger:hover {
  color: #f87171;
}

.activity-action.disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.lottery-main {
  flex: 1;
  min-width: 0;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
}

@media (max-width: 720px) {
  .lottery-body {
    flex-direction: column;
  }

  .lottery-aside {
    width: 100%;
    max-height: 180px;
  }
}

.lottery-hint {
  margin: 0;
  color: rgba(255, 255, 255, 0.75);
  font-size: 14px;
  font-weight: 600;
}

.lottery-result {
  margin: 0;
  color: #fde68a;
  font-size: 18px;
  font-weight: 700;
}

.lottery-result strong {
  color: #fbbf24;
  font-size: 22px;
}

.lottery-spin-btn {
  min-width: 160px;
  font-weight: 800;
}

.result-dialog-body {
  text-align: center;
  padding: 12px 0 8px;
}

.result-badge {
  font-size: 48px;
  line-height: 1;
  margin-bottom: 12px;
}

.result-label {
  margin: 0;
  font-size: 24px;
  font-weight: 900;
  color: #c0392b;
}
</style>
