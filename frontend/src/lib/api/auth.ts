import { apiFetch, ApiError } from './client'

interface BackendLoginResponse {
  status: number
  message: string
  data: { id: number; username: string }
}

/** Logs into the real backend so its httpOnly session cookie is set,
 * alongside (not instead of) the app's existing mock login — see
 * AuthContext.login(). Only accounts that exist on the real backend (right
 * now: the seeded admin) succeed; anyone else's attempt is swallowed by the
 * caller so the rest of the app keeps working purely on the mock session. */
export async function backendLogin(username: string, password: string) {
  return apiFetch<BackendLoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })
}

export { ApiError }
