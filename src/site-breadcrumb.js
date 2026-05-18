/** @param {{ href?: string, label: string }[]} items */
export function breadcrumb(items, { currentId } = {}) {
  const parts = items.map((item, i) => {
    const isLast = i === items.length - 1
    if (isLast || !item.href) {
      const idAttr = isLast && currentId ? ` id="${currentId}"` : ''
      return `<span class="site-nav__current"${idAttr}>${item.label}</span>`
    }
    return `<a href="${item.href}">${item.label}</a>`
  })
  return `<nav class="site-nav" aria-label="Breadcrumb">${parts.join('<span class="site-nav__sep">/</span>')}</nav>`
}
