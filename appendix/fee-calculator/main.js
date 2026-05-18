import '../../src/site.css'
import './ghostfees.css'
import {
  computeSnapshot,
  computeGhostFromTiers,
  computeSubstackFromTiers,
  formatUsd,
  searchBreakEvenPaying,
  searchBeatSubstackPaying,
  breakEvenSearchCap,
  scaleTiersToPaying,
  lowestTierBreakEvenPercent,
} from './pricing.js'
import { buildRecommendations } from './recommendations.js'
import {
  isStarterAvailable,
  PLAN_LABELS,
  STARTER_MAX_MEMBERS,
} from './ghost-tiers.js'

let nextTierId = 1

function newPaidTier(count = 0, pricePerMonth = 3) {
  return { id: String(nextTierId++), count, pricePerMonth }
}

const state = {
  totalSubscribers: 1000,
  paidTiers: [newPaidTier(100, 3)],
  billingPeriod: 'annual',
  ghostPlan: 'publisher',
}

function planLabel(plan) {
  return PLAN_LABELS[plan] ?? plan
}

function planTitle(plan) {
  return `${planLabel(plan)} plan`
}

function renderPaidTiersHtml() {
  const showTierNames = state.paidTiers.length > 1
  return state.paidTiers
    .map(
      (tier, index) => `
    <div class="paid-tier-row" data-id="${tier.id}">
      ${
        showTierNames
          ? `<span class="paid-tier-name">Tier ${index + 1}</span>`
          : ''
      }
      <div class="field paid-tier-field">
        <label for="tier-price-${tier.id}">$/mo</label>
        <input
          id="tier-price-${tier.id}"
          type="number"
          min="0"
          step="0.5"
          data-field="pricePerMonth"
          value="${tier.pricePerMonth}"
        />
      </div>
      <div class="field paid-tier-field">
        <label for="tier-count-${tier.id}">Subs</label>
        <input
          id="tier-count-${tier.id}"
          type="number"
          min="0"
          step="1"
          data-field="count"
          value="${tier.count}"
        />
      </div>
      ${
        state.paidTiers.length > 1
          ? `<button type="button" class="remove-tier" data-id="${tier.id}" aria-label="Remove Tier ${index + 1}">×</button>`
          : ''
      }
    </div>`,
    )
    .join('')
}

/** Auto-switch off Starter when list exceeds 1,000 members. */
function enforceStarterPlan() {
  if (state.ghostPlan === 'starter' && !isStarterAvailable(state.totalSubscribers)) {
    state.ghostPlan = 'publisher'
  }
}

function updateGhostPlanButtons() {
  const el = document.getElementById('ghost-plan')
  if (!el) return
  const starterAvail = isStarterAvailable(state.totalSubscribers)
  el.querySelectorAll('button[data-value]').forEach((btn) => {
    const isStarter = btn.dataset.value === 'starter'
    btn.disabled = isStarter && !starterAvail
    btn.classList.toggle('is-disabled', isStarter && !starterAvail)
    btn.classList.toggle('is-active', btn.dataset.value === state.ghostPlan && !btn.disabled)
    if (isStarter && !starterAvail) {
      btn.title = `Starter is limited to ${STARTER_MAX_MEMBERS.toLocaleString()} members`
    } else {
      btn.removeAttribute('title')
    }
  })
}

function updateBillingButtons() {
  const el = document.getElementById('billing-period')
  if (!el) return
  el.querySelectorAll('button[data-value]').forEach((btn) => {
    btn.classList.toggle('is-active', btn.dataset.value === state.billingPeriod)
  })
}

function breakEvenForPlatform(platform, snapshot) {
  const { paidTiers, billingPeriod, ghostPlan, totalMembers } = snapshot
  const cap = breakEvenSearchCap(totalMembers)
  const computeRow = (paying) => {
    const tiers = scaleTiersToPaying(paidTiers, paying)
    return platform === 'substack'
      ? computeSubstackFromTiers(tiers)
      : computeGhostFromTiers(tiers, totalMembers, billingPeriod, ghostPlan)
  }
  return searchBreakEvenPaying(computeRow, cap)
}

function beatSubstackPaying(snapshot) {
  const { paidTiers, billingPeriod, ghostPlan, totalMembers } = snapshot
  const cap = breakEvenSearchCap(totalMembers)
  return searchBeatSubstackPaying(
    (paying) =>
      computeGhostFromTiers(
        scaleTiersToPaying(paidTiers, paying),
        totalMembers,
        billingPeriod,
        ghostPlan,
      ),
    (paying) => computeSubstackFromTiers(scaleTiersToPaying(paidTiers, paying)),
    cap,
  )
}

function formatReaderPercent(percent) {
  if (percent < 10) return percent.toFixed(1)
  return String(Math.round(percent))
}

function renderSummaryHtml(
  snapshot,
  ghostBreakEven,
  beatSubstack,
  lowestTierConversion,
) {
  const { substack, ghost, billingPeriod, ghostPlan, totalMembers, paying } =
    snapshot
  const billingLabel = billingPeriod === 'annual' ? 'billed annually' : 'billed monthly'
  const ghostPlanTitle = planTitle(ghostPlan)
  const ghostNetClass = ghost.net !== null && ghost.net < 0 ? 'negative' : 'positive'
  const substackNetClass = substack.net < 0 ? 'negative' : 'positive'

  let ghostHostingLine = '—'
  if (ghost.tier.isUnavailable) {
    ghostHostingLine = `Not available (${ghost.tier.bandLabel})`
  } else if (ghost.tier.isCustom) {
    ghostHostingLine = 'Custom pricing'
  } else if (ghost.hosting !== null) {
    ghostHostingLine = `${formatUsd(ghost.hosting)}/mo ${billingLabel}`
  }

  let ghostBreakEvenLine = ''
  const ghostSubsNeeded =
    ghostBreakEven != null ? ghostBreakEven - paying : null
  if (ghostSubsNeeded != null && ghostSubsNeeded > 0 && ghost.net !== null && ghost.net < 0) {
    ghostBreakEvenLine = `<p class="break-even-callout">You need <strong>${ghostSubsNeeded}</strong> more paid subs to cover Ghost hosting at current settings.</p>`
  }

  let lowestTierLine = ''
  if (lowestTierConversion != null && ghost.net !== null && ghost.net < 0) {
    const pct = formatReaderPercent(lowestTierConversion.percent)
    lowestTierLine = `<p class="break-even-callout lowest-tier-callout">At this plan, <strong>~${pct}%</strong> of your readers must be on a paid tier (assuming they all are on the lowest tier, ${formatUsd(lowestTierConversion.lowestPrice)}/mo).</p>`
  }

  let beatSubstackLine = ''
  const beatSubsNeeded = beatSubstack != null ? beatSubstack - paying : null
  if (
    beatSubsNeeded != null &&
    beatSubsNeeded > 0 &&
    ghost.net !== null &&
    ghost.net <= substack.net
  ) {
    beatSubstackLine = `<p class="break-even-callout beat-substack-callout">You need <strong>${beatSubsNeeded}</strong> more paid subs to beat Substack's rate.</p>`
  }

  const delta = ghost.net !== null ? ghost.net - substack.net : null

  let winnerTitleSuffix = ''
  const ghostWins = delta !== null && delta > 0
  const substackWins = delta !== null && delta < 0
  if (ghostWins || substackWins) {
    const advantage = Math.abs(delta)
    const advantageAnnual = advantage * 12
    winnerTitleSuffix = ` <span class="winner-badge">⭐️ Winner — ${formatUsd(advantage)}/mo (${formatUsd(advantageAnnual)}/yr) more</span>`
  }

  const tierReadoutHtml = ghost.tier.isUnavailable
    ? `<strong>${ghostPlanTitle}</strong> — ${ghost.tier.bandLabel}. Choose Publisher or Business for larger lists.`
    : ghost.tier.isCustom
      ? `<strong>Custom</strong> — ${ghost.tier.bandLabel}. Contact Ghost for pricing above 100k members.`
      : `<strong>${ghostPlanTitle}</strong><br /><strong>${formatUsd(ghost.hosting)}/mo</strong> ${billingLabel} · ${ghost.tier.bandLabel}`

  return {
    substackCard: `
      <div class="summary-card summary-card--substack">
        <h3>Substack${substackWins ? winnerTitleSuffix : ''}</h3>
        <dl class="summary-dl">
          <dt>Gross revenue</dt><dd>${formatUsd(substack.gross)}/mo</dd>
          <dt>Platform fee (10%)</dt><dd>${formatUsd(substack.platform)}/mo</dd>
          <dt>Stripe</dt><dd>${formatUsd(substack.stripe)}/mo</dd>
          <dt class="net">Income <span class="income-sub">before taxes</span></dt>
          <dd class="net ${substackNetClass}">${formatUsd(substack.net)}/mo · ${formatUsd(substack.net * 12)}/yr</dd>
        </dl>
      </div>`,
    ghostCard: `
      <div class="summary-card summary-card--ghost">
        <h3>Ghost${ghostWins ? winnerTitleSuffix : ''}</h3>
        <div class="ghost-card-controls">
          <div class="segmented-row segmented-row--inline">
            <span class="label">Plan</span>
            <div class="segmented segmented--plans" id="ghost-plan">
              <button type="button" data-value="starter">Starter</button>
              <button type="button" data-value="publisher">Publisher</button>
              <button type="button" data-value="business">Business</button>
            </div>
          </div>
          <div class="segmented-row segmented-row--inline">
            <span class="label" id="billing-label">Billing</span>
            <div class="segmented segmented--billing" id="billing-period" role="group" aria-labelledby="billing-label">
              <button type="button" data-value="annual"${billingPeriod === 'annual' ? ' class="is-active"' : ''}>Annual</button>
              <button type="button" data-value="monthly"${billingPeriod === 'monthly' ? ' class="is-active"' : ''}>Monthly</button>
            </div>
          </div>
          <p class="tier-readout" id="tier-readout">${tierReadoutHtml}</p>
        </div>
        <dl class="summary-dl">
          <dt>Gross revenue</dt><dd>${
            ghost.noPaidMemberships
              ? '<span class="starter-no-paid">No paid memberships</span>'
              : `${formatUsd(ghost.gross)}/mo`
          }</dd>
          <dt>Hosting</dt><dd>${ghostHostingLine}</dd>
          <dt>Stripe</dt><dd>${
            ghost.noPaidMemberships ? 'n/a' : `${formatUsd(ghost.stripe)}/mo`
          }</dd>
          <dt class="net">Income <span class="income-sub">before taxes</span></dt>
          <dd class="net ${ghostNetClass}">${
            ghost.net !== null
              ? `${formatUsd(ghost.net)}/mo · ${formatUsd(ghost.net * 12)}/yr`
              : '—'
          }</dd>
        </dl>
        ${ghostBreakEvenLine}
        ${lowestTierLine}
        ${beatSubstackLine}
      </div>`,
  }
}

function renderSummary(
  snapshot,
  ghostBE,
  beatSubstack,
  lowestTierConversion,
) {
  const summary = renderSummaryHtml(
    snapshot,
    ghostBE,
    beatSubstack,
    lowestTierConversion,
  )
  const summaryEl = document.getElementById('summary-grid')
  if (summaryEl) {
    summaryEl.innerHTML = summary.substackCard + summary.ghostCard
  }
  updateGhostPlanButtons()
  updateBillingButtons()
}

function renderPaidTiersList() {
  const list = document.getElementById('paid-tiers-list')
  if (list) list.innerHTML = renderPaidTiersHtml()
}

function renderRecommendations(snapshot) {
  const el = document.getElementById('recommendations-list')
  if (!el) return
  const tips = buildRecommendations(snapshot)
  if (tips.length === 0) {
    el.innerHTML =
      '<li class="recommendations-empty">Adjust audience size and paid tiers to see tailored notes.</li>'
    return
  }
  el.innerHTML = tips.map((tip) => `<li>${tip}</li>`).join('')
}

function render() {
  enforceStarterPlan()

  const snapshot = computeSnapshot({
    totalSubscribers: state.totalSubscribers,
    paidTiers: state.paidTiers,
    billingPeriod: state.billingPeriod,
    ghostPlan: state.ghostPlan,
  })

  const ghostBE = breakEvenForPlatform('ghost', snapshot)
  const beatSubstack = beatSubstackPaying(snapshot)
  const lowestTierConversion = lowestTierBreakEvenPercent(snapshot)
  renderSummary(snapshot, ghostBE, beatSubstack, lowestTierConversion)
  renderRecommendations(snapshot)
}

function initSummaryGridControls() {
  const grid = document.getElementById('summary-grid')
  if (!grid || grid.dataset.controlsBound) return
  grid.dataset.controlsBound = '1'
  grid.addEventListener('click', (e) => {
    const planBtn = e.target.closest('#ghost-plan button[data-value]')
    if (planBtn && !planBtn.disabled) {
      state.ghostPlan = planBtn.dataset.value
      render()
      return
    }
    const billingBtn = e.target.closest('#billing-period button[data-value]')
    if (billingBtn) {
      state.billingPeriod = billingBtn.dataset.value
      render()
    }
  })
}

function initCalcPanelControls() {
  const panel = document.querySelector('.calc-panel')
  if (!panel || panel.dataset.controlsBound) return
  panel.dataset.controlsBound = '1'

  panel.addEventListener('input', (e) => {
    if (e.target.id === 'total-subs') {
      state.totalSubscribers = Number(e.target.value) || 0
      render()
      return
    }

    const row = e.target.closest('.paid-tier-row')
    if (!row) return
    const tier = state.paidTiers.find((t) => t.id === row.dataset.id)
    if (!tier) return

    if (e.target.dataset.field === 'count') {
      tier.count = Math.max(0, Math.floor(Number(e.target.value) || 0))
    } else if (e.target.dataset.field === 'pricePerMonth') {
      tier.pricePerMonth = Math.max(0, Number(e.target.value) || 0)
    }
    render()
  })

  panel.addEventListener('click', (e) => {
    if (e.target.id === 'add-paid-tier') {
      state.paidTiers.push(newPaidTier(0, 3))
      renderPaidTiersList()
      render()
      return
    }

    const removeBtn = e.target.closest('.remove-tier')
    if (removeBtn && state.paidTiers.length > 1) {
      const id = removeBtn.dataset.id
      state.paidTiers = state.paidTiers.filter((t) => t.id !== id)
      renderPaidTiersList()
      render()
    }
  })
}

function init() {
  const app = document.getElementById('app')
  if (!app) return

  app.innerHTML = `
    <div class="site-layout ghostfees-layout">
      <nav class="site-nav"><a href="/appendix/">← Appendix</a> · <a href="/">Home</a></nav>

      <header class="site-header">
        <h1>Ghost Fees</h1>
        <p class="page-subtitle">
          Compare Ghost(Pro) and Substack costs for your list and paid subscribers.
        </p>
      </header>

      <div class="main-columns">
        <section class="calc-panel calc-panel--controls" aria-label="Calculator inputs">
          <div class="field field--compact">
            <label for="total-subs">Total readers</label>
            <input id="total-subs" type="number" min="0" step="1" value="${state.totalSubscribers}" />
          </div>
          <h3 class="controls-section-title">Paid subs</h3>
          <div id="paid-tiers-list" class="paid-tiers-list"></div>
          <button type="button" class="add-tier-btn" id="add-paid-tier">Add tier</button>
        </section>

        <div id="summary-grid" class="summary-grid"></div>
      </div>

      <section
        id="recommendations-card"
        class="summary-card summary-card--recommendations"
        aria-label="Findings"
      >
        <h3>Findings</h3>
        <ul id="recommendations-list" class="recommendations-list"></ul>
      </section>

      <footer class="footnotes">
        <p class="footer-links">
          <a href="https://ghost.org/vs/substack/" target="_blank" rel="noopener">Ghost vs Substack</a>
          <a href="https://ghost.org/pricing/" target="_blank" rel="noopener">Ghost pricing</a>
          <a href="https://support.substack.com/hc/en-us/articles/360037607131-How-much-does-Substack-cost" target="_blank" rel="noopener">Substack fees</a>
        </p>
        <p>
          Models Ghost(Pro) Starter (≤1,000 members), Publisher, and Business hosting from
          <a href="https://ghost.org/pricing/">ghost.org/pricing</a>.
          Substack: 10% + Stripe per
          <a href="https://support.substack.com/hc/en-us/articles/360037607131-How-much-does-Substack-cost">Substack support</a>.
          Apple IAP not included.
        </p>
      </footer>
    </div>
  `

  renderPaidTiersList()
  initCalcPanelControls()
  initSummaryGridControls()
  render()
}

init()
