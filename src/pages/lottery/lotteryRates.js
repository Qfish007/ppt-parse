import { createPrizeId } from './lotteryDefaults.js';

export const THANK_YOU_LABEL = '谢谢参与';

export function isThankYouIndex(index, length) {
  return length > 0 && index === length - 1;
}

/** 保证最后一项为「谢谢参与」 */
export function ensureThankYouLast(prizes) {
  const list = (prizes || []).map(p => ({ ...p }));
  const tyIdx = list.findIndex(p => String(p.label || '').trim() === THANK_YOU_LABEL);
  let thankYou;
  if (tyIdx >= 0) {
    thankYou = { ...list.splice(tyIdx, 1)[0] };
  } else {
    thankYou = {
      id: createPrizeId(),
      label: THANK_YOU_LABEL,
      color: '#95a5a6',
      enabled: true,
      ratePercent: 0
    };
  }
  thankYou.label = THANK_YOU_LABEL;
  thankYou.enabled = true;
  list.push(thankYou);
  return list;
}

/** 可编辑项（除最后一项）的中奖率之和 */
export function sumEditableRates(prizes) {
  if (!prizes?.length) return 0;
  return prizes.slice(0, -1).reduce((sum, p) => {
    if (!p.enabled) return sum;
    return sum + Math.max(0, Number(p.ratePercent) || 0);
  }, 0);
}

/** 写入 weight，并自动计算最后一项中奖率 */
export function applyAutoThankYouRate(prizes) {
  const list = ensureThankYouLast(prizes);
  const sumOthers = sumEditableRates(list);
  const last = list[list.length - 1];
  last.ratePercent = Math.max(0, Math.round((100 - sumOthers) * 10) / 10);
  last.weight = last.ratePercent;

  list.slice(0, -1).forEach(p => {
    p.weight = p.enabled ? Math.max(0, Number(p.ratePercent) || 0) : 0;
    p.ratePercent = p.enabled ? Math.max(0, Number(p.ratePercent) || 0) : 0;
  });

  return list;
}

/** 从旧版仅 weight 的数据迁移为 ratePercent */
export function migratePrizesToRates(prizes) {
  const list = (prizes || []).map(p => ({ ...p }));
  const hasRate = list.some(p => p.ratePercent != null && p.ratePercent !== '');
  if (hasRate) return ensureThankYouLast(list);

  const total = list.reduce((s, p) => s + Math.max(0, Number(p.weight) || 0), 0) || 100;
  list.forEach(p => {
    const w = Math.max(0, Number(p.weight) || 0);
    p.ratePercent = Math.round((w / total) * 1000) / 10;
  });
  return ensureThankYouLast(list);
}
