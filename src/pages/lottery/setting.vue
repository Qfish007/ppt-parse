<template>
  <div class="lottery-settings-page">
    <header class="settings-header">
      <div class="settings-title-wrap">
        <el-button type="primary" @click="goBack">
          <el-icon><ArrowLeft /></el-icon>
          返回转盘
        </el-button>
        <h2 class="settings-title">抽奖设置<span v-if="lotteryStore.active" class="settings-activity-name">· {{ lotteryStore.active.name }}</span></h2>
      </div>
      <div class="settings-actions">
        <el-button @click="resetDefaults">恢复默认</el-button>
        <el-button type="primary" :loading="saving" @click="saveAll">保存</el-button>
      </div>
    </header>

    <section class="settings-card">
      <div class="card-header">
        <label class="field-label">基础设置</label>
      </div>
      <div class="card-body form-grid">
        <div class="form-row">
          <span class="form-label">活动标题</span>
          <el-input v-model="form.title" maxlength="30" show-word-limit placeholder="幸运大转盘" />
        </div>
        <div class="form-row">
          <span class="form-label">转盘旋转时间</span>
          <div class="slider-row">
            <el-slider v-model="form.spinDurationMs" :min="2000" :max="15000" :step="500" show-input />
            <span class="unit-hint">{{ (form.spinDurationMs / 1000).toFixed(1) }} 秒</span>
          </div>
        </div>
        <div class="form-row">
          <span class="form-label">最少旋转圈数</span>
          <el-input-number v-model="form.spinMinTurns" :min="3" :max="12" />
        </div>
      </div>
    </section>

    <section class="settings-card">
      <div class="card-header">
        <label class="field-label">背景图</label>
      </div>
      <div class="card-body">
        <div class="setting-desc">支持本地上传，图片会保存在浏览器本地存储中。转盘背景图叠加在色块扇区之上（混合模式）。</div>
        <div class="bg-upload-grid">
          <div class="bg-upload-item">
            <span class="form-label">页面背景</span>
            <div class="upload-row">
              <input ref="pageBgInput" type="file" accept="image/*" class="hidden-input" @change="e => onPickImage(e, 'pageBackgroundImage')" />
              <el-button @click="pageBgInput?.click()">选择图片</el-button>
              <el-button v-if="form.pageBackgroundImage" text type="danger" @click="form.pageBackgroundImage = ''">清除</el-button>
            </div>
            <div v-if="form.pageBackgroundImage" class="preview-box preview-page" :style="{ backgroundImage: `url(${form.pageBackgroundImage})` }"></div>
          </div>
          <div class="bg-upload-item">
            <span class="form-label">转盘背景</span>
            <div class="upload-row">
              <input ref="wheelBgInput" type="file" accept="image/*" class="hidden-input" @change="e => onPickImage(e, 'wheelBackgroundImage')" />
              <el-button @click="wheelBgInput?.click()">选择图片</el-button>
              <el-button v-if="form.wheelBackgroundImage" text type="danger" @click="form.wheelBackgroundImage = ''">清除</el-button>
            </div>
            <div v-if="form.wheelBackgroundImage" class="preview-box preview-wheel" :style="{ backgroundImage: `url(${form.wheelBackgroundImage})` }"></div>
          </div>
        </div>
      </div>
    </section>

    <section class="settings-card">
      <div class="card-header card-header-row">
        <label class="field-label">奖项与中奖率</label>
        <el-button type="primary" plain size="small" @click="addPrize">添加奖项</el-button>
      </div>
      <div class="card-body">
        <div class="setting-desc">
          除最后一项固定为「谢谢参与」外，可设置各奖项中奖率（合计不超过 100%）。「谢谢参与」的中奖率自动为剩余部分，扇区大小与中奖率一致。
        </div>
        <div class="weight-summary">
          已设置：<strong>{{ sumEditableRatesDisplay }}%</strong>
          · 谢谢参与（自动）：<strong>{{ thankYouRateDisplay }}%</strong>
          <span v-if="rateWarning" class="weight-warn">{{ rateWarning }}</span>
        </div>
        <div class="prize-list">
          <div
            v-for="(prize, index) in form.prizes"
            :key="prize.id"
            class="prize-row"
            :class="{ 'prize-row--thank-you': isThankYouRow(index) }"
          >
            <el-switch v-model="prize.enabled" :disabled="isThankYouRow(index)" />
            <el-input
              v-model="prize.label"
              class="prize-label"
              placeholder="奖项名称"
              maxlength="12"
              :disabled="isThankYouRow(index)"
            />
            <el-color-picker v-model="prize.color" />
            <template v-if="!isThankYouRow(index)">
              <el-input-number
                v-model="prize.ratePercent"
                :min="0"
                :max="100"
                :precision="1"
                :step="1"
                :disabled="!prize.enabled"
                controls-position="right"
                class="prize-rate"
              />
              <span class="prize-percent">%</span>
            </template>
            <template v-else>
              <span class="prize-rate-auto">{{ thankYouRateDisplay }}%</span>
              <span class="prize-auto-tag">自动</span>
            </template>
            <el-button
              text
              type="danger"
              :disabled="isThankYouRow(index) || form.prizes.length <= 2"
              @click="removePrize(index)"
            >
              删除
            </el-button>
          </div>
        </div>
      </div>
    </section>

    <section class="settings-card preview-card">
      <div class="card-header">
        <label class="field-label">预览</label>
      </div>
      <div class="card-body preview-wrap">
        <LotteryWheel
          size="compact"
          :prizes="prizesForPreview"
          :rotation-deg="0"
          :spin-duration-ms="form.spinDurationMs"
          :wheel-background-image="form.wheelBackgroundImage"
          :disabled="true"
        />
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { ArrowLeft } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import LotteryWheel from './components/LotteryWheel.vue';
import { useLotteryStore } from '../../stores/lottery.js';
import { createPrizeId, DEFAULT_PRIZE_COLORS } from './lotteryDefaults.js';
import {
  applyAutoThankYouRate,
  isThankYouIndex,
  sumEditableRates,
  THANK_YOU_LABEL
} from './lotteryRates.js';

const router = useRouter();
const lotteryStore = useLotteryStore();
const saving = ref(false);
const pageBgInput = ref(null);
const wheelBgInput = ref(null);

const form = reactive({
  title: '',
  spinDurationMs: 5000,
  spinMinTurns: 5,
  wheelBackgroundImage: '',
  pageBackgroundImage: '',
  prizes: []
});

function isThankYouRow(index) {
  return isThankYouIndex(index, form.prizes.length);
}

function syncThankYouFromRates() {
  if (!form.prizes.length) return;
  const last = form.prizes[form.prizes.length - 1];
  last.label = THANK_YOU_LABEL;
  last.enabled = true;
  const sum = sumEditableRates(form.prizes);
  last.ratePercent = Math.max(0, Math.round((100 - sum) * 10) / 10);
  last.weight = last.ratePercent;
  form.prizes.slice(0, -1).forEach(p => {
    p.weight = p.enabled ? Math.max(0, Number(p.ratePercent) || 0) : 0;
  });
}

function syncFormFromStore() {
  form.title = lotteryStore.title;
  form.spinDurationMs = lotteryStore.spinDurationMs;
  form.spinMinTurns = lotteryStore.spinMinTurns;
  form.wheelBackgroundImage = lotteryStore.wheelBackgroundImage;
  form.pageBackgroundImage = lotteryStore.pageBackgroundImage;
  form.prizes = lotteryStore.prizes.map(p => ({
    ...p,
    ratePercent: Number(p.ratePercent ?? p.weight) || 0
  }));
  syncThankYouFromRates();
}

watch(
  () => form.prizes.map(p => ({ enabled: p.enabled, ratePercent: p.ratePercent })),
  () => syncThankYouFromRates(),
  { deep: true }
);

onMounted(async () => {
  await lotteryStore.load();
  syncFormFromStore();
});

const sumEditableRatesDisplay = computed(() => {
  const sum = sumEditableRates(form.prizes);
  return (Math.round(sum * 10) / 10).toFixed(1);
});

const thankYouRateDisplay = computed(() => {
  const last = form.prizes[form.prizes.length - 1];
  const rate = last ? Number(last.ratePercent) || 0 : 0;
  return (Math.round(rate * 10) / 10).toFixed(1);
});

const prizesForPreview = computed(() => applyAutoThankYouRate(form.prizes));

const rateWarning = computed(() => {
  const sum = sumEditableRates(form.prizes);
  if (sum > 100.001) return '各奖项中奖率合计不能超过 100%';
  const pool = form.prizes.slice(0, -1).filter(p => p.enabled && (Number(p.ratePercent) || 0) > 0);
  const last = form.prizes[form.prizes.length - 1];
  if (!pool.length && !(last && last.ratePercent > 0)) return '请至少设置一个有效奖项';
  return '';
});

function goBack() {
  router.push('/lottery');
}

function addPrize() {
  const insertAt = Math.max(0, form.prizes.length - 1);
  const index = insertAt;
  form.prizes.splice(insertAt, 0, {
    id: createPrizeId(),
    label: '新奖项',
    color: DEFAULT_PRIZE_COLORS[index % DEFAULT_PRIZE_COLORS.length],
    ratePercent: 5,
    weight: 5,
    enabled: true
  });
  syncThankYouFromRates();
}

function removePrize(index) {
  if (isThankYouRow(index)) return;
  form.prizes.splice(index, 1);
  syncThankYouFromRates();
}

function onPickImage(event, field) {
  const file = event.target.files?.[0];
  event.target.value = '';
  if (!file) return;
  if (file.size > 2 * 1024 * 1024) {
    ElMessage.warning('图片建议小于 2MB，过大可能影响本地存储');
  }
  const reader = new FileReader();
  reader.onload = () => {
    form[field] = String(reader.result || '');
  };
  reader.readAsDataURL(file);
}

async function saveAll() {
  if (sumEditableRates(form.prizes) > 100.001) {
    ElMessage.error('各奖项中奖率合计不能超过 100%');
    return;
  }

  const editable = form.prizes.slice(0, -1);
  const labels = editable.map(p => p.label.trim()).filter(Boolean);
  if (labels.length !== editable.length) {
    ElMessage.error('请填写所有奖项名称');
    return;
  }

  syncThankYouFromRates();
  const normalized = applyAutoThankYouRate(form.prizes);
  if (!normalized.some(p => p.enabled && p.weight > 0)) {
    ElMessage.error('至少需要一个有效中奖率大于 0 的奖项');
    return;
  }

  saving.value = true;
  try {
    lotteryStore.title = form.title.trim() || '幸运大转盘';
    lotteryStore.spinDurationMs = form.spinDurationMs;
    lotteryStore.spinMinTurns = form.spinMinTurns;
    lotteryStore.wheelBackgroundImage = form.wheelBackgroundImage;
    lotteryStore.pageBackgroundImage = form.pageBackgroundImage;
    lotteryStore.prizes = normalized.map(p => ({
      ...p,
      label: p.label.trim()
    }));
    await lotteryStore.save();
    syncFormFromStore();
    ElMessage.success('已保存');
  } finally {
    saving.value = false;
  }
}

async function resetDefaults() {
  try {
    await ElMessageBox.confirm('将恢复默认标题、时间与 6 个默认奖项，背景图会清空。', '恢复默认', {
      type: 'warning',
      confirmButtonText: '恢复',
      cancelButtonText: '取消'
    });
    await lotteryStore.resetToDefaults();
    syncFormFromStore();
    ElMessage.success('已恢复默认');
  } catch {
    /* cancelled */
  }
}
</script>

<style scoped>
.lottery-settings-page {
  min-height: 100vh;
  box-sizing: border-box;
  padding: 24px 20px 48px;
  background: #f4f6f8;
}

.settings-header {
  max-width: 920px;
  margin: 0 auto 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.settings-title-wrap {
  display: flex;
  align-items: center;
  gap: 12px;
}

.settings-title {
  margin: 0;
  font-size: 24px;
  font-weight: 900;
  color: #16201f;
}

.settings-activity-name {
  margin-left: 8px;
  font-size: 15px;
  font-weight: 700;
  color: #63706d;
}

.settings-actions {
  display: flex;
  gap: 8px;
}

.settings-card {
  max-width: 920px;
  margin: 0 auto 20px;
  border: 1px solid #dce3e8;
  border-radius: 14px;
  background: #fff;
  overflow: hidden;
}

.card-header {
  padding: 14px 18px;
  border-bottom: 1px solid #eef2f5;
  background: #fafbfc;
}

.card-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.field-label {
  font-size: 15px;
  font-weight: 800;
  color: #16201f;
}

.card-body {
  padding: 18px;
}

.setting-desc {
  margin-bottom: 14px;
  font-size: 13px;
  color: #63706d;
  line-height: 1.6;
}

.form-grid {
  display: grid;
  gap: 16px;
}

.form-row {
  display: grid;
  grid-template-columns: 120px 1fr;
  align-items: center;
  gap: 12px;
}

.form-label {
  font-size: 14px;
  font-weight: 700;
  color: #3d4a47;
}

.slider-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.slider-row :deep(.el-slider) {
  flex: 1;
}

.unit-hint {
  font-size: 13px;
  color: #63706d;
  white-space: nowrap;
}

.bg-upload-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 20px;
}

.upload-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 8px 0;
}

.hidden-input {
  display: none;
}

.preview-box {
  height: 100px;
  border-radius: 10px;
  border: 1px dashed #c5d0d8;
  background-size: cover;
  background-position: center;
}

.preview-wheel {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  margin: 0 auto;
}

.weight-summary {
  margin-bottom: 12px;
  font-size: 14px;
  color: #3d4a47;
}

.weight-warn {
  margin-left: 12px;
  color: #e6a23c;
  font-weight: 700;
}

.prize-list {
  display: grid;
  gap: 10px;
}

.prize-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  padding: 10px 12px;
  border-radius: 10px;
  background: #f8fafb;
  border: 1px solid #eef2f5;
}

.prize-row--thank-you {
  background: #f3f4f6;
  border-color: #e2e8f0;
}

.prize-label {
  width: 140px;
}

.prize-rate {
  width: 120px;
}

.prize-percent {
  font-size: 13px;
  font-weight: 800;
  color: #0c514b;
}

.prize-rate-auto {
  min-width: 72px;
  font-size: 15px;
  font-weight: 900;
  color: #64748b;
}

.prize-auto-tag {
  font-size: 12px;
  font-weight: 700;
  color: #94a3b8;
  padding: 2px 8px;
  border-radius: 999px;
  background: #e2e8f0;
}

.preview-wrap {
  display: flex;
  justify-content: center;
  padding-bottom: 28px;
}

@media (max-width: 640px) {
  .form-row {
    grid-template-columns: 1fr;
  }
}
</style>
