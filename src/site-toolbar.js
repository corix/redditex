/** @param {{ breadcrumb?: string }} [opts]—pass breadcrumb nav HTML to replace the lone Home link */
export function siteToolbar({ breadcrumb } = {}) {
  const start =
    breadcrumb ?? '<a class="site-toolbar__home" href="/">Home</a>'
  return `<nav class="site-toolbar" aria-label="Site">
        <div class="site-toolbar__start">${start}</div>
        <div class="site-toolbar__end">
          <a href="/changelog/">Changelog</a>
        </div>
      </nav>`
}

/** Default toolbar: Home on the left, Changelog on the right. */
export const SITE_TOOLBAR = siteToolbar()
