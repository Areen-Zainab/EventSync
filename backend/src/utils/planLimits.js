const VALID_PLANS = new Set(['free', 'plus', 'premium']);

const normalizePlan = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  if (VALID_PLANS.has(normalized)) {
    return normalized;
  }
  return 'free';
};

const getPlanLimits = (planValue) => {
  const plan = normalizePlan(planValue);

  if (plan === 'plus') {
    return {
      plan,
      eventLimit: 10,
      memberLimit: 25,
    };
  }

  if (plan === 'premium') {
    return {
      plan,
      eventLimit: null,
      memberLimit: null,
    };
  }

  return {
    plan: 'free',
    eventLimit: 1,
    memberLimit: 5,
  };
};

module.exports = {
  VALID_PLANS,
  normalizePlan,
  getPlanLimits,
};