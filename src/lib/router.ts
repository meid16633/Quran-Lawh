import { useSyncExternalStore } from 'react'

export interface Route {
  path: string[]
  params: URLSearchParams
}

function parse(hash: string): Route {
  const [path, query = ''] = hash.replace(/^#\/?/, '').split('?')
  return { path: path.split('/').filter(Boolean), params: new URLSearchParams(query) }
}

const subscribe = (cb: () => void) => {
  window.addEventListener('hashchange', cb)
  return () => window.removeEventListener('hashchange', cb)
}

export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, () => location.hash)
  return parse(hash)
}

// How many in-app pushes are behind us, so "back" never leaves the app.
let depth = 0

/** Navigate to a hash route. `replace` keeps page turns out of the back-button history. */
export function navigate(to: string, { replace = false } = {}) {
  const hash = '#/' + to.replace(/^\/+/, '')
  if (replace) {
    location.replace(hash)
  } else {
    depth++
    location.hash = hash
  }
}

export function back() {
  if (depth > 0) {
    depth--
    history.back()
  } else {
    navigate('', { replace: true })
  }
}
