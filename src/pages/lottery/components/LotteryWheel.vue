<template>
  <div class="lottery-wheel-stage" :class="sizeClass" :style="stageSizeStyle">
    <div class="lottery-pointer" aria-hidden="true"></div>
    <div
      class="lottery-wheel-outer"
      :class="{ spinning: isSpinning }"
      :style="wheelOuterStyle"
    >
      <div class="lottery-wheel-face">
        <div class="lottery-wheel-disk" :style="diskStyle"></div>
        <svg class="lottery-wedge-layer" viewBox="0 0 100 100" aria-hidden="true">
          <g>
            <template v-for="seg in segments" :key="'raise-' + seg.prize.id">
              <circle
                v-if="isFullCircle(seg)"
                cx="50"
                cy="50"
                r="50"
                :fill="seg.prize.color"
                class="lottery-wedge-raised"
                :class="{ active: hoveredId === seg.prize.id }"
              />
              <path
                v-else
                :d="wedgePath(seg)"
                :fill="seg.prize.color"
                class="lottery-wedge-raised"
                :class="{ active: hoveredId === seg.prize.id }"
              />
            </template>
          </g>
          <g>
            <template v-for="seg in segments" :key="'hit-' + seg.prize.id">
              <circle
                v-if="isFullCircle(seg)"
                cx="50"
                cy="50"
                r="50"
                class="lottery-wedge-hit"
                @mouseenter="onSegEnter(seg)"
                @mouseleave="onSegLeave(seg)"
              />
              <path
                v-else
                :d="wedgePath(seg)"
                class="lottery-wedge-hit"
                @mouseenter="onSegEnter(seg)"
                @mouseleave="onSegLeave(seg)"
              />
            </template>
          </g>
        </svg>
        <div class="lottery-label-ring" aria-hidden="true">
          <div
            v-for="seg in segments"
            :key="seg.prize.id"
            class="lottery-radial-slot"
            :style="{ transform: `rotate(${seg.midDeg}deg)` }"
          >
            <span class="lottery-radial-text" :style="textStyle(seg)">
              {{ seg.prize.label }}
            </span>
          </div>
        </div>
        <div
          v-if="hoveredSegment"
          class="lottery-tip-slot"
          :style="{ transform: `rotate(${hoveredSegment.midDeg}deg)` }"
        >
          <div
            class="lottery-tip"
            :style="{ transform: `translate(-50%, -112%) rotate(${-hoveredSegment.midDeg}deg)` }"
          >
            <span class="lottery-tip-label">{{ hoveredSegment.prize.label }}</span>
            <!-- <span class="lottery-tip-rate">中奖率 {{ ratePercentOf(hoveredSegment) }}</span> -->
          </div>
        </div>
      </div>
      <button
        type="button"
        class="lottery-wheel-center"
        :disabled="disabled || isSpinning || !segments.length"
        @click="$emit('spin')"
      >
        {{ isSpinning ? '抽奖中' : '开始' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, ref } from 'vue';
import { computePrizeSegments } from '../lotteryDraw.js';

const props = defineProps({
  prizes: { type: Array, default: () => [] },
  rotationDeg: { type: Number, default: 0 },
  spinDurationMs: { type: Number, default: 5000 },
  wheelBackgroundImage: { type: String, default: '' },
  isSpinning: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  /** full：视口 80%；compact：设置页预览 */
  size: { type: String, default: 'full' }
});

defineEmits(['spin']);

const sizeClass = computed(() =>
  props.size === 'compact' ? 'lottery-wheel-stage--compact' : 'lottery-wheel-stage--full'
);

const stageSizeStyle = computed(() => {
  if (props.size === 'compact') {
    return { width: 'min(280px, 72vw)', height: 'min(280px, 72vw)' };
  }
  return {
    width: 'min(80vw, 80vh)',
    height: 'min(80vw, 80vh)'
  };
});

const segments = computed(() => computePrizeSegments(props.prizes));

/** 视口尺寸跟踪（full 尺寸转盘随视口变化，字号需要重算） */
const viewportMin = ref(Math.min(window.innerWidth, window.innerHeight));
function trackViewport() {
  viewportMin.value = Math.min(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', trackViewport);
onBeforeUnmount(() => window.removeEventListener('resize', trackViewport));

/** 盘面（face）的估算像素尺寸，与 stageSizeStyle 对应 */
const wheelPx = computed(() => {
  if (props.size === 'compact') return Math.min(280, window.innerWidth * 0.72);
  return viewportMin.value * 0.8;
});

const hoveredId = ref(null);
const hoveredSegment = computed(
  () => segments.value.find(s => s.prize.id === hoveredId.value) || null
);

function onSegEnter(seg) {
  if (props.isSpinning) return;
  hoveredId.value = seg.prize.id;
}

function onSegLeave(seg) {
  if (hoveredId.value === seg.prize.id) hoveredId.value = null;
}

/** CSS 角度（0=顶部，顺时针）转 SVG 坐标（viewBox 100x100，圆心 50,50） */
function polarXY(deg, r) {
  const rad = (deg * Math.PI) / 180;
  return [50 + r * Math.sin(rad), 50 - r * Math.cos(rad)];
}

function isFullCircle(seg) {
  return segmentSweep(seg) >= 359.9;
}

function wedgePath(seg, r = 50) {
  const [x1, y1] = polarXY(seg.startDeg, r);
  const [x2, y2] = polarXY(seg.endDeg, r);
  const large = segmentSweep(seg) > 180 ? 1 : 0;
  return `M 50 50 L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`;
}

function ratePercentOf(seg) {
  return ((segmentSweep(seg) / 360) * 100).toFixed(1) + '%';
}

const conicGradient = computed(() => {
  if (!segments.value.length) {
    return 'conic-gradient(#ddd 0deg 360deg)';
  }
  const stops = segments.value
    .map(seg => `${seg.prize.color} ${seg.startDeg}deg ${seg.endDeg}deg`)
    .join(', ');
  return `conic-gradient(${stops})`;
});

const wheelOuterStyle = computed(() => ({
  transform: `rotate(${props.rotationDeg}deg)`,
  transition: props.isSpinning
    ? `transform ${props.spinDurationMs}ms cubic-bezier(0.15, 0.85, 0.2, 1)`
    : 'none'
}));

const diskStyle = computed(() => {
  const style = { background: conicGradient.value };
  if (props.wheelBackgroundImage) {
    style.backgroundImage = `url(${props.wheelBackgroundImage}), ${conicGradient.value}`;
    style.backgroundSize = 'cover, auto';
    style.backgroundBlendMode = 'overlay, normal';
  }
  return style;
});

function segmentSweep(seg) {
  return seg.endDeg - seg.startDeg;
}

/**
 * 沿角平分线（径向）在外缘显示完整奖项名；
 * 字号取「扇区弧宽」与「径向可用长度」的较小值，保证文字尽量完整落盘
 */
function textStyle(seg) {
  const sweep = segmentSweep(seg);
  const size = wheelPx.value;
  const insetTop = 10;

  const label = String(seg.prize.label || '').trim();
  let effLen = 0;
  for (const ch of label) {
    effLen += ch.charCodeAt(0) > 0xff ? 1 : 0.55;
  }

  // 径向：文字起点到中心按钮之间的距离
  const radialAvail = size * (0.5 - insetTop / 100) - size * 0.115 - 6;
  const fontByRadial = effLen > 0 ? radialAvail / effLen : 15;
  // 切向：文字中段半径处的弧长
  const fontByArc = size * 0.00296 * sweep;

  const fontSize = Math.max(7, Math.min(15, fontByRadial, fontByArc));

  // 文字绝对角度 = midDeg + 90；midDeg ∈ (0,180)（右半盘）时文字会倒置，需反向
  const flip = seg.midDeg > 0 && seg.midDeg < 180;
  const textRotate = flip ? -90 : 90;

  return {
    fontSize: `${(Math.round(fontSize * 2) / 2).toFixed(1)}px`,
    top: `${insetTop}%`,
    transform: `translateX(-50%) rotate(${textRotate}deg)`
  };
}
</script>

<style scoped>
.lottery-wheel-stage {
  position: relative;
  flex-shrink: 0;
  margin: 0 auto;
  padding: 6px;
  box-sizing: content-box;
  overflow: visible;
}

.lottery-pointer {
  position: absolute;
  top: -2px;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 14px solid transparent;
  border-right: 14px solid transparent;
  border-top: 28px solid #c0392b;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.25));
  z-index: 3;
}

.lottery-wheel-outer {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  box-sizing: border-box;
  padding: 10px;
  background: linear-gradient(145deg, #f5d76e, #c8952e);
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.2), inset 0 0 0 4px rgba(255, 255, 255, 0.35);
  position: relative;
  will-change: transform;
  overflow: visible;
}

.lottery-wheel-face {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: visible;
}

.lottery-wheel-disk {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.65);
  box-sizing: border-box;
}

.lottery-label-ring {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: visible;
}

/**
 * 整盘旋转的「辐条槽」：文字放在槽的 12 点方向 = 该扇区角平分线的外缘
 */
.lottery-radial-slot {
  position: absolute;
  inset: 0;
  /* transform-origin: 50% 50%; */
  pointer-events: none;
  /* margin-left: 0px;
  margin-top: 0px; */
}

/**
 * 父级已 rotate(midDeg)，文字再 rotate(90deg) 与角平分线（径向）同向；锚点在外缘，向圆心延伸
 */
.lottery-radial-text {
  position: absolute;
  left: 50%;
  writing-mode: horizontal-tb;
  transform-origin: top center;
  font-weight: 800;
  color: #fff;
  line-height: 1;
  letter-spacing: 0.02em;
  text-align: center;
  white-space: nowrap;
  text-shadow:
    0 0 3px rgba(0, 0, 0, 0.85),
    0 1px 2px rgba(0, 0, 0, 0.6);
}

.lottery-wedge-layer {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  overflow: visible;
}

/* 悬浮凸起层：默认透明且原尺寸，hover 时放大弹出 */
.lottery-wedge-raised {
  opacity: 0;
  transform: scale(1);
  transform-box: view-box;
  transform-origin: 50% 50%;
  transition:
    opacity 0.18s ease,
    transform 0.18s ease-out,
    filter 0.18s ease;
}

.lottery-wedge-raised.active {
  opacity: 1;
  transform: scale(1.06);
  filter: drop-shadow(0 6px 10px rgba(0, 0, 0, 0.35));
}

.lottery-wedge-hit {
  fill: rgba(0, 0, 0, 0);
  pointer-events: all;
  cursor: pointer;
}

.lottery-tip-slot {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 4;
}

.lottery-tip {
  position: absolute;
  left: 50%;
  top: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 6px 12px;
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.92);
  color: #fff;
  white-space: nowrap;
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.35);
  animation: lottery-tip-in 0.16s ease-out;
}

.lottery-tip-label {
  font-size: 20px;
  font-weight: 800;
}

.lottery-tip-rate {
  font-size: 11px;
  font-weight: 700;
  color: #fbbf24;
}

@keyframes lottery-tip-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.lottery-wheel-center {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 22%;
  aspect-ratio: 1;
  border-radius: 50%;
  border: 3px solid #fff;
  background: linear-gradient(180deg, #ff6b6b, #c0392b);
  color: #fff;
  font-size: clamp(12px, 3vw, 15px);
  font-weight: 900;
  cursor: pointer;
  z-index: 2;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
}

.lottery-wheel-center:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}
</style>
