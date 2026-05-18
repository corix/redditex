import { ghostHostingMonthly, nextTierMemberThreshold } from './ghost-tiers.js'

const STRIPE_RATE = 0.029
const STRIPE_FIXED = 0.3
const SUBSTACK_PLATFORM = 0.1
const STRIPE_BILLING = 0.007

/** @typedef {{ count: number, pricePerMonth: number }} PaidTier */

export function totalPayingCount(paidTiers) {
  return paidTiers.reduce(
    (sum, tier) => sum + Math.max(0, Math.floor(tier.count || 0)),
    0,
  )
}

export function grossFromPaidTiers(paidTiers) {
  return paidTiers.reduce((sum, tier) => {
    const count = Math.max(0, Math.floor(tier.count || 0))
    const price = Math.max(0, tier.pricePerMonth || 0)
    return sum + count * price
  }, 0)
}

/** Scale tier counts to a target total while keeping price mix. */
export function scaleTiersToPaying(paidTiers, targetPaying) {
  const target = Math.max(0, Math.floor(targetPaying))
  const normalized = paidTiers.map((tier) => ({
    count: Math.max(0, Math.floor(tier.count || 0)),
    pricePerMonth: Math.max(0, tier.pricePerMonth || 0),
  }))
  const current = totalPayingCount(normalized)

  if (current <= 0) {
    const price = normalized[0]?.pricePerMonth ?? 0
    return [{ count: target, pricePerMonth: price }]
  }

  if (target === current) return normalized

  const scaled = normalized.map((tier) => ({
    pricePerMonth: tier.pricePerMonth,
    count: Math.floor((tier.count / current) * target),
  }))

  let remainder = target - totalPayingCount(scaled)
  let i = 0
  while (remainder > 0 && scaled.length > 0) {
    scaled[i % scaled.length].count += 1
    remainder -= 1
    i += 1
  }

  return scaled
}

export function stripeFees(paying, pricePerMonth) {
  const subs = Math.max(0, Math.floor(paying))
  const price = Math.max(0, pricePerMonth)
  if (subs <= 0 || price <= 0) return 0
  const gross = subs * price
  return subs * (price * STRIPE_RATE + STRIPE_FIXED) + gross * STRIPE_BILLING
}

export function stripeFeesFromPaidTiers(paidTiers) {
  return paidTiers.reduce((sum, tier) => {
    const count = Math.max(0, Math.floor(tier.count || 0))
    const price = Math.max(0, tier.pricePerMonth || 0)
    return sum + stripeFees(count, price)
  }, 0)
}

/** Ghost: Stripe 2.9% + $0.30 per transaction (no Substack billing fee). */
export function ghostStripeFees(paying, pricePerMonth) {
  const subs = Math.max(0, Math.floor(paying))
  const price = Math.max(0, pricePerMonth)
  if (subs <= 0 || price <= 0) return 0
  return subs * (price * STRIPE_RATE + STRIPE_FIXED)
}

export function ghostStripeFeesFromPaidTiers(paidTiers) {
  return paidTiers.reduce((sum, tier) => {
    const count = Math.max(0, Math.floor(tier.count || 0))
    const price = Math.max(0, tier.pricePerMonth || 0)
    return sum + ghostStripeFees(count, price)
  }, 0)
}

export function computeSubstackFromTiers(paidTiers) {
  const paying = totalPayingCount(paidTiers)
  const gross = grossFromPaidTiers(paidTiers)
  const platform = paying <= 0 || gross <= 0 ? 0 : gross * SUBSTACK_PLATFORM
  const stripe = stripeFeesFromPaidTiers(paidTiers)
  const fees = platform + stripe
  const net = gross - fees
  return { gross, platform, stripe, fees, net, hosting: 0, paying }
}

export function computeSubstack(paying, pricePerMonth) {
  return computeSubstackFromTiers([
    { count: paying, pricePerMonth },
  ])
}

export function computeGhostFromTiers(
  paidTiers,
  totalMembers,
  billingPeriod,
  plan,
) {
  const paying = totalPayingCount(paidTiers)
  const tier = ghostHostingMonthly(totalMembers, billingPeriod, plan)
  /** Ghost Starter has no paid membership tiers—hosting only. */
  const noPaidMemberships = plan === 'starter'
  const gross = noPaidMemberships || paying <= 0 ? 0 : grossFromPaidTiers(paidTiers)
  const stripe = noPaidMemberships ? 0 : ghostStripeFeesFromPaidTiers(paidTiers)

  if (tier.isUnavailable) {
    return {
      gross,
      hosting: null,
      stripe,
      fees: null,
      net: null,
      tier,
      noPaidMemberships,
    }
  }

  const hosting = tier.isCustom ? null : tier.rate
  const fees = hosting === null ? null : hosting + stripe
  const net = fees === null ? null : gross - fees
  return {
    gross,
    hosting,
    stripe,
    fees,
    net,
    tier,
    noPaidMemberships,
    paying,
  }
}

export function computeGhost(paying, pricePerMonth, totalMembers, billingPeriod, plan) {
  return computeGhostFromTiers(
    [{ count: paying, pricePerMonth }],
    totalMembers,
    billingPeriod,
    plan,
  )
}

/** Cheapest paid tier price in the membership ladder, or null. */
export function lowestPaidTierPrice(paidTiers) {
  const prices = paidTiers
    .map((tier) => Math.max(0, tier.pricePerMonth || 0))
    .filter((price) => price > 0)
  if (prices.length === 0) return null
  return Math.min(...prices)
}

/**
 * Share of audience that must pay (all on lowest tier) to cover Ghost at this plan.
 * @returns {{ percent: number, breakEvenPaying: number, lowestPrice: number } | null}
 */
export function lowestTierBreakEvenPercent(snapshot) {
  const { paidTiers, totalMembers, billingPeriod, ghostPlan, ghost } = snapshot

  if (ghostPlan === 'starter' || ghost.noPaidMemberships) return null
  if (totalMembers <= 0 || ghost.net === null) return null

  const lowestPrice = lowestPaidTierPrice(paidTiers)
  if (lowestPrice == null) return null

  const cap = breakEvenSearchCap(totalMembers)
  const breakEvenPaying = searchBreakEvenPaying(
    (paying) =>
      computeGhostFromTiers(
        [{ count: paying, pricePerMonth: lowestPrice }],
        totalMembers,
        billingPeriod,
        ghostPlan,
      ),
    cap,
  )
  if (breakEvenPaying == null) return null

  return {
    percent: (breakEvenPaying / totalMembers) * 100,
    breakEvenPaying,
    lowestPrice,
  }
}

/** Upper bound when searching for break-even paying count. */
export function breakEvenSearchCap(totalSubscribers) {
  return Math.min(1000, Math.max(1, Math.floor(totalSubscribers)))
}

/** Smallest paying count in [minPaying, maxPaying] whose net is at least targetNet. */
export function searchPayingForMinNet(computeRow, targetNet, minPaying, maxPaying) {
  const min = Math.max(0, Math.floor(minPaying))
  const max = Math.floor(maxPaying)
  if (max < min) return null
  for (let paying = min; paying <= max; paying++) {
    const row = computeRow(paying)
    if (row.net !== null && row.net !== undefined && row.net >= targetNet) {
      return paying
    }
  }
  return null
}

/**
 * Paying subs needed above current count to keep Ghost net at the next hosting tier.
 * @returns {{ additional: number, nextMembers: number } | null}
 */
export function payingSubsToMaintainNetAtNextTier(snapshot) {
  const {
    paying,
    totalMembers,
    paidTiers,
    billingPeriod,
    ghostPlan,
    ghost,
  } = snapshot

  if (ghostPlan === 'starter' || ghost.noPaidMemberships) return null
  if (ghost.net === null || paying <= 0) return null

  const nextMembers = nextTierMemberThreshold(
    totalMembers,
    billingPeriod,
    ghostPlan,
  )
  if (nextMembers == null) return null

  const targetNet = ghost.net
  const requiredPaying = searchPayingForMinNet(
    (p) =>
      computeGhostFromTiers(
        scaleTiersToPaying(paidTiers, p),
        nextMembers,
        billingPeriod,
        ghostPlan,
      ),
    targetNet,
    0,
    nextMembers,
  )
  if (requiredPaying == null) return null

  const additional = requiredPaying - paying
  if (additional <= 0) return null

  return { additional, nextMembers }
}

/** Search integer paying counts for first break-even. */
export function searchBreakEvenPaying(computeRow, xMax) {
  const cap = Math.floor(xMax)
  if (cap < 1) return null
  for (let paying = 1; paying <= cap; paying++) {
    const row = computeRow(paying)
    if (row.net !== null && row.net !== undefined && row.net >= 0) return paying
  }
  return null
}

/** First paying count where Ghost take-home exceeds Substack (fixed list size). */
export function searchBeatSubstackPaying(computeGhostRow, computeSubstackRow, xMax) {
  const cap = Math.floor(xMax)
  if (cap < 1) return null
  for (let paying = 1; paying <= cap; paying++) {
    const ghost = computeGhostRow(paying)
    const substack = computeSubstackRow(paying)
    if (ghost.net !== null && ghost.net !== undefined && ghost.net > substack.net) {
      return paying
    }
  }
  return null
}

/**
 * @param {object} params
 * @param {number} params.totalSubscribers
 * @param {PaidTier[]} params.paidTiers
 * @param {'monthly' | 'annual'} params.billingPeriod
 * @param {'starter' | 'publisher' | 'business'} params.ghostPlan
 */
export function computeSnapshot(params) {
  const { totalSubscribers, paidTiers, billingPeriod, ghostPlan } = params

  const tiers = paidTiers.map((tier) => ({
    count: Math.max(0, Math.floor(tier.count || 0)),
    pricePerMonth: Math.max(0, tier.pricePerMonth || 0),
  }))
  const paying = totalPayingCount(tiers)
  const gross = grossFromPaidTiers(tiers)
  const totalMembers = Math.max(0, Math.floor(totalSubscribers))
  const conversionPercent =
    totalMembers > 0 ? (paying / totalMembers) * 100 : 0
  const blendedPricePerMonth = paying > 0 ? gross / paying : 0

  const substack = computeSubstackFromTiers(tiers)
  const ghost = computeGhostFromTiers(
    tiers,
    totalMembers,
    billingPeriod,
    ghostPlan,
  )

  return {
    paying,
    totalMembers,
    conversionPercent,
    blendedPricePerMonth,
    paidTiers: tiers,
    billingPeriod,
    ghostPlan,
    substack,
    ghost,
  }
}

export function formatUsd(amount, { signed = false } = {}) {
  if (amount === null || Number.isNaN(amount)) return '—'
  const neg = amount < 0
  const abs = Math.abs(amount)
  const str = abs.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
  if (neg) return `-${str}`
  if (signed && amount > 0) return `+${str}`
  return str
}
