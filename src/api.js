// Backend client: auth, cloud sync, usage. Token lives in localStorage.
const TOKEN_KEY = 'rs-token'

export const getToken = () => localStorage.getItem(TOKEN_KEY)
export const setToken = token => localStorage.setItem(TOKEN_KEY, token)
export const clearToken = () => localStorage.removeItem(TOKEN_KEY)

export const authHeaders = () => {
  const token = getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function req(path, { method = 'GET', body } = {}) {
  const res = await fetch(path, {
    method,
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  let data = null
  try {
    data = await res.json()
  } catch {
    /* empty body */
  }
  if (!res.ok) {
    const err = new Error(data?.error || `request_failed_${res.status}`)
    err.code = data?.error || (res.status === 401 ? 'auth_required' : 'network')
    err.status = res.status
    throw err
  }
  return data
}

export async function register(email, password) {
  const data = await req('/api/auth/register', { method: 'POST', body: { email, password } })
  setToken(data.token)
  return data.user
}

export async function login(email, password) {
  const data = await req('/api/auth/login', { method: 'POST', body: { email, password } })
  setToken(data.token)
  return data.user
}

export const me = () => req('/api/auth/me')
export const getUsage = () => req('/api/usage')
export const pullState = () => req('/api/sync')
export const pushState = state => req('/api/sync', { method: 'PUT', body: { state } })
export const logout = clearToken
