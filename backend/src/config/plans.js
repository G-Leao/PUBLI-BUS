export const PLAN_LIMITS = {
  FREE: { advertisers: 3, campaigns: 5, tablets: 2 },
  PLUS: { advertisers: 20, campaigns: 30, tablets: 10 },
  PRO: { advertisers: null, campaigns: null, tablets: 50 },
};

export function getPlanLimits(plan) {
  return PLAN_LIMITS[plan] || PLAN_LIMITS.FREE;
}
