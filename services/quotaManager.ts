const QUOTA_KEY = 'screen_buddy_daily_quota';
const DATE_KEY = 'screen_buddy_quota_date';

export const MAX_QUOTA = 1500;
export const SAFETY_LIMIT = 1490;

export const quotaManager = {
  getUsage: (): number => {
    if (typeof window === 'undefined') return 0;
    
    // Check for daily reset
    const today = new Date().toDateString();
    const lastDate = localStorage.getItem(DATE_KEY);
    
    if (lastDate !== today) {
      localStorage.setItem(DATE_KEY, today);
      localStorage.setItem(QUOTA_KEY, '0');
      return 0;
    }

    return parseInt(localStorage.getItem(QUOTA_KEY) || '0', 10);
  },

  increment: (): number => {
    const current = quotaManager.getUsage();
    const newUsage = current + 1;
    localStorage.setItem(QUOTA_KEY, newUsage.toString());
    return newUsage;
  },

  isSafetyLocked: (): boolean => {
    return quotaManager.getUsage() >= SAFETY_LIMIT;
  },

  remaining: (): number => {
    return Math.max(0, MAX_QUOTA - quotaManager.getUsage());
  }
};