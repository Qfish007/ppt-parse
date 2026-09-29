/**
 * 根据权重抽取奖项（仅 enabled 且 weight > 0）
 */
export function pickPrizeByWeight(prizes) {
  const pool = (prizes || []).filter(p => p.enabled && Number(p.weight) > 0);
  if (!pool.length) return null;

  const total = pool.reduce((sum, p) => sum + Number(p.weight), 0);
  let roll = Math.random() * total;
  for (const prize of pool) {
    roll -= Number(prize.weight);
    if (roll <= 0) return prize;
  }
  return pool[pool.length - 1];
}

/**
 * 计算每个奖项在转盘上的角度区间（按权重比例划分 360°）
 */
export function computePrizeSegments(prizes) {
  const pool = (prizes || []).filter(p => p.enabled && Number(p.weight) > 0);
  const total = pool.reduce((sum, p) => sum + Number(p.weight), 0) || 1;

  let cursor = 0;
  return pool.map(prize => {
    const sweep = (Number(prize.weight) / total) * 360;
    const start = cursor;
    const end = cursor + sweep;
    cursor = end;
    return {
      prize,
      startDeg: start,
      endDeg: end,
      midDeg: start + sweep / 2
    };
  });
}

/**
 * 指针在顶部（12 点方向）时，为使 midDeg 对准指针所需的旋转角度（顺时针为正）
 */
export function rotationToLandOnSegment(segment, minTurns = 5) {
  const offset = 360 - segment.midDeg;
  return minTurns * 360 + offset;
}

export function formatWeightPercent(weight, totalWeight) {
  if (!totalWeight) return '0%';
  return ((Number(weight) / totalWeight) * 100).toFixed(1) + '%';
}
