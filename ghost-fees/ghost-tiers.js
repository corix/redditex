// Ghost(Pro) Starter, Publisher + Business tiers (USD/mo displayed rate).
// verifiedDate: 2026-05-17 — cross-check https://ghost.org/pricing/ member slider.

/** Starter is capped at 1,000 registered members on Ghost(Pro). */
export const STARTER_MAX_MEMBERS = 1_000

const ANNUAL_STARTER = [{ maxMembers: STARTER_MAX_MEMBERS, rate: 15 }]
const ANNUAL_PUBLISHER = [
  { maxMembers: 1_000, rate: 29 },
  { maxMembers: 2_500, rate: 46 },
  { maxMembers: 5_000, rate: 63 },
  { maxMembers: 7_500, rate: 79 },
  { maxMembers: 10_000, rate: 88 },
  { maxMembers: 25_000, rate: 141 },
  { maxMembers: 50_000, rate: 208 },
  { maxMembers: 75_000, rate: 241 },
  { maxMembers: 100_000, rate: 274 },
]

const ANNUAL_BUSINESS = [
  { maxMembers: 10_000, rate: 199 },
  { maxMembers: 25_000, rate: 266 },
  { maxMembers: 50_000, rate: 333 },
  { maxMembers: 75_000, rate: 366 },
  { maxMembers: 100_000, rate: 399 },
]

function scaleTiers(annualTiers, ratio) {
  return annualTiers.map((t) => ({
    maxMembers: t.maxMembers,
    rate: Math.round(t.rate * ratio),
  }))
}

const MONTHLY_STARTER = [{ maxMembers: STARTER_MAX_MEMBERS, rate: 18 }]
const MONTHLY_PUBLISHER = scaleTiers(ANNUAL_PUBLISHER, 35 / 29)
const MONTHLY_BUSINESS = scaleTiers(ANNUAL_BUSINESS, 239 / 199)

export const PLAN_LABELS = {
  starter: 'Starter',
  publisher: 'Publisher',
  business: 'Business',
}

export const TIERS = {
  annual: {
    starter: ANNUAL_STARTER,
    publisher: ANNUAL_PUBLISHER,
    business: ANNUAL_BUSINESS,
  },
  monthly: {
    starter: MONTHLY_STARTER,
    publisher: MONTHLY_PUBLISHER,
    business: MONTHLY_BUSINESS,
  },
}

export function isStarterAvailable(totalMembers) {
  return Math.floor(totalMembers) <= STARTER_MAX_MEMBERS
}

export const TIER_BREAKPOINTS = [
  1_000, 2_500, 5_000, 7_500, 10_000, 25_000, 50_000, 75_000, 100_000,
]

function formatMembers(n) {
  return n.toLocaleString('en-US')
}

/**
 * @param {{ maxMembers: number, rate: number }[]} tiers
 * @param {number} totalMembers
 */
export function lookupTier(tiers, totalMembers) {
  const members = Math.max(0, Math.floor(totalMembers))

  if (members === 0) {
    const first = tiers[0]
    return {
      rate: first.rate,
      bandLabel: `1–${formatMembers(first.maxMembers)} members`,
      isCustom: false,
    }
  }

  let prevMax = 0
  for (const tier of tiers) {
    if (members <= tier.maxMembers) {
      const min = prevMax + 1
      const label =
        min === 1
          ? `up to ${formatMembers(tier.maxMembers)} members`
          : `${formatMembers(min)}–${formatMembers(tier.maxMembers)} members`
      return { rate: tier.rate, bandLabel: label, isCustom: false }
    }
    prevMax = tier.maxMembers
  }

  return {
    rate: null,
    bandLabel: '100,000+ members (Custom)',
    isCustom: true,
  }
}

/**
 * @param {number} totalMembers
 * @param {'monthly' | 'annual'} billingPeriod
 * @param {'starter' | 'publisher' | 'business'} plan
 */
export function ghostHostingMonthly(totalMembers, billingPeriod, plan) {
  const members = Math.max(0, Math.floor(totalMembers))

  if (plan === 'starter' && members > STARTER_MAX_MEMBERS) {
    return {
      rate: null,
      bandLabel: `Not available above ${formatMembers(STARTER_MAX_MEMBERS)} members`,
      isCustom: false,
      isUnavailable: true,
      unavailableReason: 'starter_limit',
      plan,
      billingPeriod,
    }
  }

  const tiers = TIERS[billingPeriod]?.[plan]
  if (!tiers) {
    throw new Error(`Unknown billing/plan: ${billingPeriod}/${plan}`)
  }
  const tier = lookupTier(tiers, members)
  return {
    ...tier,
    isUnavailable: false,
    plan,
    billingPeriod,
  }
}

/**
 * Audience size at which Ghost hosting moves to the next band (null if none).
 * @param {number} totalMembers
 * @param {'monthly' | 'annual'} billingPeriod
 * @param {'starter' | 'publisher' | 'business'} plan
 */
/** Member counts where hosting steps up (e.g. 1,001, 2,501 on Publisher). */
export function hostingTierThresholds(billingPeriod, plan) {
  if (plan === 'starter') return []
  const tiers = TIERS[billingPeriod]?.[plan]
  if (!tiers || tiers.length < 2) return []
  return tiers.slice(0, -1).map((tier) => tier.maxMembers + 1)
}

export function nextTierMemberThreshold(totalMembers, billingPeriod, plan) {
  if (plan === 'starter') return null
  const members = Math.max(0, Math.floor(totalMembers))
  const tiers = TIERS[billingPeriod]?.[plan]
  if (!tiers?.length) return null

  for (let i = 0; i < tiers.length; i++) {
    if (members <= tiers[i].maxMembers) {
      if (i >= tiers.length - 1) return null
      return tiers[i].maxMembers + 1
    }
  }
  return null
}

/** Paying subs at which total members cross a tier boundary (fixed conversion %). */
export function tierPayingBreakpoints(conversionPercent) {
  if (conversionPercent <= 0) return []
  const ratio = conversionPercent / 100
  return TIER_BREAKPOINTS.map((maxMembers) => ({
    paying: Math.ceil(maxMembers * ratio),
    members: maxMembers,
  }))
}
