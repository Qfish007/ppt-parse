export function createPrizeId() {
  return 'prize_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
}

export const DEFAULT_PRIZE_COLORS = [
  '#e74c3c',
  '#f39c12',
  '#2ecc71',
  '#3498db',
  '#9b59b6',
  '#1abc9c',
  '#e67e22',
  '#95a5a6'
];

export function createDefaultPrizes() {
  return [
    { id: createPrizeId(), label: '一等奖', color: '#e74c3c', ratePercent: 5, weight: 5, enabled: true },
    { id: createPrizeId(), label: '二等奖', color: '#f39c12', ratePercent: 10, weight: 10, enabled: true },
    { id: createPrizeId(), label: '三等奖', color: '#3498db', ratePercent: 15, weight: 15, enabled: true },
    { id: createPrizeId(), label: '鼓励奖', color: '#2ecc71', ratePercent: 20, weight: 20, enabled: true },
    { id: createPrizeId(), label: '再来一次', color: '#9b59b6', ratePercent: 15, weight: 15, enabled: true },
    { id: createPrizeId(), label: '谢谢参与', color: '#95a5a6', ratePercent: 35, weight: 35, enabled: true }
  ];
}

export function createDefaultLotteryConfig() {
  return {
    title: '幸运大转盘',
    spinDurationMs: 5000,
    spinMinTurns: 5,
    wheelBackgroundImage: '',
    pageBackgroundImage: '',
    prizes: createDefaultPrizes()
  };
}
