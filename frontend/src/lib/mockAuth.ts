/**
 * TEMPORARY frontend-only auth stub. There's no backend yet (a teammate
 * owns that separately) — this just gates the UI so pages/roles can be
 * built and reviewed now. Plaintext passwords are fine here since this
 * isn't real security, only a UI demo gate; it'll be replaced wholesale
 * once a real login API exists (swap this file's body, not any page or
 * AuthContext code).
 */

export interface MockUser {
  username: string
  password: string
  name: string
  role: string
}

const USERS: MockUser[] = [
  { username: 'admin', password: 'admin123', name: 'Admin User', role: 'director' },
  { username: 'clerk', password: 'clerk123', name: 'Clerk User', role: 'clerk' },
]

export function mockLogin(username: string, password: string) {
  const user = USERS.find((u) => u.username === username && u.password === password)
  if (!user) throw new Error('Invalid username or password')
  return { username: user.username, name: user.name, role: user.role }
}
