import { reactive } from 'vue';
import { STORAGE_KEYS } from '../types/index.js';
import { settingsRepository } from '../repositories/index.js';
import { createDefaultLotteryConfig, createPrizeId, DEFAULT_PRIZE_COLORS } from '../pages/lottery/lotteryDefaults.js';
import { applyAutoThankYouRate, migratePrizesToRates, THANK_YOU_LABEL } from '../pages/lottery/lotteryRates.js';

let lotteryStoreInstance = null;

const FALLBACK_CONFIG = createDefaultLotteryConfig();

function createActivityId() {
  return 'act_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
}

function createActivity(name, config) {
  return {
    id: createActivityId(),
    name: String(name || '').trim() || '默认抽奖',
    config: config || createDefaultLotteryConfig()
  };
}

function normalizePrize(raw, index, isThankYou) {
  const label = isThankYou ? THANK_YOU_LABEL : String(raw?.label || '').trim();
  if (!label) return null;
  const ratePercent = Math.max(0, Number(raw?.ratePercent ?? raw?.weight) || 0);
  const color =
    String(raw?.color || '').trim() ||
    DEFAULT_PRIZE_COLORS[index % DEFAULT_PRIZE_COLORS.length];
  return {
    id: String(raw?.id || createPrizeId()),
    label,
    color,
    ratePercent,
    weight: ratePercent,
    enabled: isThankYou ? true : raw?.enabled !== false
  };
}

function normalizeConfig(raw) {
  const defaults = createDefaultLotteryConfig();
  const spinDurationMs = Math.min(Math.max(Number(raw?.spinDurationMs) || defaults.spinDurationMs, 2000), 15000);
  const spinMinTurns = Math.min(Math.max(Number(raw?.spinMinTurns) || defaults.spinMinTurns, 3), 12);
  const prizesRaw = Array.isArray(raw?.prizes) ? raw.prizes : defaults.prizes;
  const migrated = migratePrizesToRates(prizesRaw.map((p, i) => normalizePrize(p, i, false)).filter(Boolean));
  const prizes = applyAutoThankYouRate(migrated);
  return {
    title: String(raw?.title || defaults.title).trim() || defaults.title,
    spinDurationMs,
    spinMinTurns,
    wheelBackgroundImage: String(raw?.wheelBackgroundImage || ''),
    pageBackgroundImage: String(raw?.pageBackgroundImage || ''),
    prizes: prizes.length ? prizes : defaults.prizes
  };
}

/** 规范化整体状态：活动列表 + 当前选中 id，至少保留一个活动 */
function normalizeState(raw) {
  const list = Array.isArray(raw?.activities) ? raw.activities : [];
  const activities = list.map(a => ({
    id: String(a?.id || createActivityId()),
    name: String(a?.name || '').trim() || '未命名抽奖',
    config: normalizeConfig(a?.config)
  }));
  if (!activities.length) activities.push(createActivity('默认抽奖'));
  const activeId = activities.some(a => a.id === raw?.activeId)
    ? raw.activeId
    : activities[0].id;
  return { activities, activeId };
}

export function useLotteryStore() {
  if (lotteryStoreInstance) return lotteryStoreInstance;

  const store = reactive({
    activities: [],
    activeId: '',
    _loaded: false,

    get active() {
      return this.activities.find(a => a.id === this.activeId) || this.activities[0] || null;
    },

    // —— 以下为当前活动配置字段的代理，页面读写方式与单转盘时代一致 ——
    get title() { return this.active?.config.title ?? FALLBACK_CONFIG.title; },
    set title(v) { if (this.active) this.active.config.title = v; },
    get spinDurationMs() { return this.active?.config.spinDurationMs ?? FALLBACK_CONFIG.spinDurationMs; },
    set spinDurationMs(v) { if (this.active) this.active.config.spinDurationMs = v; },
    get spinMinTurns() { return this.active?.config.spinMinTurns ?? FALLBACK_CONFIG.spinMinTurns; },
    set spinMinTurns(v) { if (this.active) this.active.config.spinMinTurns = v; },
    get wheelBackgroundImage() { return this.active?.config.wheelBackgroundImage ?? ''; },
    set wheelBackgroundImage(v) { if (this.active) this.active.config.wheelBackgroundImage = v; },
    get pageBackgroundImage() { return this.active?.config.pageBackgroundImage ?? ''; },
    set pageBackgroundImage(v) { if (this.active) this.active.config.pageBackgroundImage = v; },
    get prizes() { return this.active?.config.prizes ?? FALLBACK_CONFIG.prizes; },
    set prizes(v) { if (this.active) this.active.config.prizes = v; },

    async load() {
      if (this._loaded) return;
      const raw = await settingsRepository.get(STORAGE_KEYS.LOTTERY_ACTIVITIES);
      if (raw) {
        try {
          Object.assign(this, normalizeState(JSON.parse(raw)));
        } catch {
          Object.assign(this, normalizeState(null));
        }
      } else {
        // 迁移旧的单转盘配置为首个活动
        const legacy = await settingsRepository.get(STORAGE_KEYS.LOTTERY_CONFIG);
        let config = null;
        if (legacy) {
          try {
            config = normalizeConfig(JSON.parse(legacy));
          } catch {
            config = null;
          }
        }
        const activity = createActivity('默认抽奖', config || createDefaultLotteryConfig());
        this.activities = [activity];
        this.activeId = activity.id;
        await this.save();
      }
      this._loaded = true;
    },

    async save() {
      const payload = normalizeState({ activities: this.activities, activeId: this.activeId });
      this.activities = payload.activities;
      this.activeId = payload.activeId;
      await settingsRepository.set(STORAGE_KEYS.LOTTERY_ACTIVITIES, JSON.stringify(payload));
    },

    async addActivity(name) {
      const activity = createActivity(name, createDefaultLotteryConfig());
      this.activities.push(activity);
      this.activeId = activity.id;
      await this.save();
      return activity;
    },

    async renameActivity(id, name) {
      const target = this.activities.find(a => a.id === id);
      const trimmed = String(name || '').trim();
      if (!target || !trimmed) return;
      target.name = trimmed;
      await this.save();
    },

    async removeActivity(id) {
      if (this.activities.length <= 1) return;
      const idx = this.activities.findIndex(a => a.id === id);
      if (idx < 0) return;
      this.activities.splice(idx, 1);
      if (this.activeId === id) this.activeId = this.activities[0].id;
      await this.save();
    },

    async setActive(id) {
      if (!this.activities.some(a => a.id === id) || this.activeId === id) return;
      this.activeId = id;
      await this.save();
    },

    /** 恢复当前活动的默认配置 */
    async resetToDefaults() {
      if (!this.active) return;
      this.active.config = createDefaultLotteryConfig();
      await this.save();
    },

    ensureLoaded() {
      if (!this._loaded) this.load();
    }
  });

  store.load();
  lotteryStoreInstance = store;
  return store;
}
