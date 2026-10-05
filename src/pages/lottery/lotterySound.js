/**
 * 抽奖转盘音效（Web Audio API 合成，无外部资源）
 * - playStartClick：点击开始的一声短响
 * - startSpinTicks：转动期间的「哒哒」打点声，节奏与转盘减速曲线一致
 * - playWinFanfare：出结果时的上扬琶音
 */

let audioCtx = null;

function getCtx() {
  if (!audioCtx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    audioCtx = new AC();
  }
  if (audioCtx.state === 'suspended') {
    // 用户点击手势内调用，可成功恢复
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/** 与转盘 CSS transition 完全相同的 cubic-bezier(0.15, 0.85, 0.2, 1) */
function createEase(x1, y1, x2, y2) {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;

  const sampleX = t => ((ax * t + bx) * t + cx) * t;
  const sampleY = t => ((ay * t + by) * t + cy) * t;
  const sampleDX = t => (3 * ax * t + 2 * bx) * t + cx;

  const solveX = x => {
    let t = x;
    for (let i = 0; i < 8; i += 1) {
      const err = sampleX(t) - x;
      if (Math.abs(err) < 1e-6) return t;
      const d = sampleDX(t);
      if (Math.abs(d) < 1e-6) break;
      t -= err / d;
    }
    let lo = 0;
    let hi = 1;
    t = x;
    while (lo < hi) {
      const xv = sampleX(t);
      if (Math.abs(xv - x) < 1e-6) return t;
      if (x > xv) lo = t;
      else hi = t;
      t = (lo + hi) / 2;
    }
    return t;
  };

  return x => sampleY(solveX(x));
}

const easeSpin = createEase(0.15, 0.85, 0.2, 1);

/** 单个打点声：短促的方波咔哒 */
function playTick(volume = 0.22) {
  const ctx = getCtx();
  if (!ctx) return;
  const t = ctx.currentTime;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'square';
  osc.frequency.setValueAtTime(1100, t);
  osc.frequency.exponentialRampToValueAtTime(520, t + 0.03);

  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(volume, t + 0.002);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 0.06);
}

/** 点击「开始」的一声脆响 */
export function playStartClick() {
  const ctx = getCtx();
  if (!ctx) return;
  const t = ctx.currentTime;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(880, t);
  osc.frequency.exponentialRampToValueAtTime(1760, t + 0.08);

  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.25, t + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 0.16);
}

/**
 * 转动期间的打点循环。
 * 按转盘实际转过的角度（每 TICK_STEP_DEG 度一个「桩」）发声，
 * 因此节奏天然由快变慢；高速时两桩间隔不足 MIN_INTERVAL_MS 则跳过，避免糊成一团。
 *
 * @returns {function} 停止函数
 */
export function startSpinTicks(deltaDeg, durationMs) {
  const TICK_STEP_DEG = 12;
  const MIN_INTERVAL_MS = 45;
  const start = performance.now();
  let raf = 0;
  let stopped = false;
  let lastPeg = 0;
  let lastTickAt = 0;

  const loop = now => {
    if (stopped) return;
    const t = Math.min(1, (now - start) / durationMs);
    const angle = Math.max(0, deltaDeg) * easeSpin(t);
    const peg = Math.floor(angle / TICK_STEP_DEG);

    if (peg > lastPeg) {
      if (now - lastTickAt >= MIN_INTERVAL_MS) {
        playTick();
        lastTickAt = now;
      }
      lastPeg = peg;
    }

    if (t < 1) raf = requestAnimationFrame(loop);
  };

  raf = requestAnimationFrame(loop);

  return function stop() {
    stopped = true;
    cancelAnimationFrame(raf);
  };
}

/** 中奖上扬琶音 */
export function playWinFanfare() {
  const ctx = getCtx();
  if (!ctx) return;

  const notes = [523.25, 659.25, 783.99, 1046.5]; // C5 E5 G5 C6
  const noteDur = 0.13;
  const startT = ctx.currentTime;

  notes.forEach((freq, i) => {
    const t = startT + i * noteDur;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, t);

    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.28, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + noteDur * 1.8);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + noteDur * 2);
  });
}
