import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'

export function AppLayout() {
  const { pathname } = useLocation()

  return (
    <div className="flex min-h-screen bg-canvas">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-8">
        <div key={pathname} className="animate-fade-in-up">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
