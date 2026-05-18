import {
  STARTER_MAX_MEMBERS,
  PLAN_LABELS,
  hostingTierThresholds,
  nextTierMemberThreshold,
  ghostHostingMonthly,
} from './ghost-tiers.js'
import {
  lowestPaidTierPrice,
  totalPayingCount,
  searchBeatSubstackPaying,
  breakEvenSearchCap,
  computeGhostFromTiers,
  computeSubstackFromTiers,
  searchPayingForMinNet,
  scaleTiersToPaying,
  formatUsd,
} from './pricing.js'

function formatPercent(percent) {
  if (percent < 10) return percent.toFixed(1)
  return String(Math.round(percent))
}

function formatMemberList(numbers) {
  if (numbers.length === 0) return ''
  const formatted = numbers.map((n) => n.toLocaleString('en-US'))
  if (formatted.length === 1) return formatted[0]
  if (formatted.length === 2) return `${formatted[0]} and ${formatted[1]}`
  return `${formatted.slice(0, -1).join(', ')}, and ${formatted.at(-1)}`
}

/**
 * Paid subs (all on lowest tier) needed for Ghost to beat Substack.
 * @returns {{ percent: number, beatPaying: number, lowestPrice: number } | null}
 */
function beatSubstackAtLowestTier(snapshot, ghostPlan) {
  const { paidTiers, totalMembers, billingPeriod } = snapshot
  const lowestPrice = lowestPaidTierPrice(paidTiers)
  if (lowestPrice == null || totalMembers <= 0) return null

  const cap = breakEvenSearchCap(totalMembers)
  const beatPaying = searchBeatSubstackPaying(
    (paying) =>
      computeGhostFromTiers(
        [{ count: paying, pricePerMonth: lowestPrice }],
        totalMembers,
        billingPeriod,
        ghostPlan,
      ),
    (paying) =>
      computeSubstackFromTiers([{ count: paying, pricePerMonth: lowestPrice }]),
    cap,
  )
  if (beatPaying == null) return null

  return {
    percent: (beatPaying / totalMembers) * 100,
    beatPaying,
    lowestPrice,
  }
}

function requiredPayingAtNextHostingTier(snapshot) {
  const { totalMembers, paidTiers, billingPeriod, ghostPlan, ghost } = snapshot
  if (ghostPlan === 'starter' || ghost.noPaidMemberships) return null
  if (ghost.net === null) return null

  const nextMembers = nextTierMemberThreshold(
    totalMembers,
    billingPeriod,
    ghostPlan,
  )
  if (nextMembers == null) return null

  return searchPayingForMinNet(
    (paying) =>
      computeGhostFromTiers(
        scaleTiersToPaying(paidTiers, paying),
        nextMembers,
        billingPeriod,
        ghostPlan,
      ),
    ghost.net,
    0,
    nextMembers,
  )
}

/**
 * @param {ReturnType<import('./pricing.js').computeSnapshot>} snapshot
 * @returns {string[]}
 */
export function buildRecommendations(snapshot) {
  const tips = []
  const {
    totalMembers,
    paying,
    conversionPercent,
    ghostPlan,
    billingPeriod,
    paidTiers,
    ghost,
    substack,
  } = snapshot

  const lowestPrice = lowestPaidTierPrice(paidTiers)
  const planForPaid = ghostPlan === 'starter' ? 'publisher' : ghostPlan
  const planLabel = PLAN_LABELS[planForPaid] ?? planForPaid

  if (
    totalMembers > 0 &&
    totalMembers <= STARTER_MAX_MEMBERS &&
    lowestPrice != null &&
    planForPaid !== 'starter'
  ) {
    const beat = beatSubstackAtLowestTier(snapshot, planForPaid)
    if (beat) {
      tips.push(
        `For small creators with ${STARTER_MAX_MEMBERS.toLocaleString('en-US')} or fewer readers, about <strong>${formatPercent(beat.percent)}%</strong> on a paid tier of at least <strong>${formatUsd(beat.lowestPrice)}/mo</strong> (everyone on your lowest tier) is enough for Ghost on <strong>${planLabel}</strong> to beat Substack.`,
      )
    }
  }

  if (ghostPlan === 'starter' && lowestPrice != null && paying > 0) {
    tips.push(
      `Ghost <strong>Starter</strong> does not support paid memberships. Use <strong>Publisher</strong> or <strong>Business</strong> to model paid tiers.`,
    )
  }

  const thresholds = hostingTierThresholds(billingPeriod, ghostPlan)
  const nextMembers = nextTierMemberThreshold(
    totalMembers,
    billingPeriod,
    ghostPlan,
  )
  const requiredAtNext = requiredPayingAtNextHostingTier(snapshot)

  if (
    ghostPlan !== 'starter' &&
    thresholds.length > 0 &&
    nextMembers != null &&
    requiredAtNext != null
  ) {
    const thresholdStr = formatMemberList(thresholds)
    const nextHosting = ghostHostingMonthly(nextMembers, billingPeriod, ghostPlan)
    const planName = PLAN_LABELS[ghostPlan] ?? ghostPlan
    const planIncreaseNote =
      ghost.hosting != null &&
      nextHosting.rate != null &&
      nextHosting.rate > ghost.hosting
        ? ` (<strong>${planName}</strong> plan increases from <strong>${formatUsd(ghost.hosting)}</strong> to <strong>${formatUsd(nextHosting.rate)}/mo</strong>)`
        : ''

    if (paying < requiredAtNext) {
      tips.push(
        `Ghost Pro plans step up at <strong>${thresholdStr}</strong> members. The next step up at <strong>${nextMembers.toLocaleString('en-US')}</strong> readers${planIncreaseNote} will cut into take-home if you have fewer than <strong>${requiredAtNext.toLocaleString('en-US')}</strong> paid subs at your current tier mix.`,
      )
    } else {
      tips.push(
        `Ghost Pro plans step up at <strong>${thresholdStr}</strong> members. With <strong>${paying.toLocaleString('en-US')}</strong> paid subs today, the next step up at <strong>${nextMembers.toLocaleString('en-US')}</strong> readers${planIncreaseNote} is unlikely to reduce take-home.`,
      )
    }
  }

  if (ghost.net != null && substack.net != null && ghost.net > substack.net) {
    tips.push(
      `With your current audience-to-sub ratio, Ghost take-home (<strong>${formatUsd(ghost.net)}/mo</strong>) beats Substack (<strong>${formatUsd(substack.net)}/mo</strong>).`,
    )
  } else if (
    ghost.net != null &&
    substack.net != null &&
    ghost.net <= substack.net &&
    conversionPercent > 0 &&
    lowestPrice != null &&
    planForPaid !== 'starter'
  ) {
    const beat = beatSubstackAtLowestTier(snapshot, planForPaid)
    if (beat && conversionPercent < beat.percent) {
      tips.push(
        `Your audience is about <strong>${formatPercent(conversionPercent)}%</strong> paid today; reaching <strong>${formatPercent(beat.percent)}%</strong> would put Ghost ahead of Substack at this list size.`,
      )
    }
  }

  if (
    totalMembers > 0 &&
    totalMembers <= STARTER_MAX_MEMBERS &&
    ghostPlan !== 'starter' &&
    ghost.net != null &&
    ghost.net >= 0 &&
    paying === 0
  ) {
    tips.push(
      `Under <strong>${STARTER_MAX_MEMBERS.toLocaleString('en-US')}</strong> readers, <strong>Starter</strong> (${formatUsd(ghostHostingMonthly(totalMembers, billingPeriod, 'starter').rate)}/mo) can cover hosting with no paid tiers—compare if you do not need memberships yet.`,
    )
  }

  return tips
}
