import { Link } from 'react-router-dom'
import { Truck } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/AuthContext'
import { can } from '@/lib/roleAccess'

export function LogisticsStatusList() {
  const { user } = useAuth()

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PageHeader title="Logistics Status" subtitle="Export & local order tracking" module="logisticsStatus" />
        {can(user, 'enter') && (
          <Button asChild>
            <Link to="/logistics-status/new">New Logistics Order</Link>
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="flex h-48 flex-col items-center justify-center gap-2 text-center text-muted">
          <Truck size={28} />
          <p>Logistics order list is coming soon — will replace this once real data is wired up.</p>
        </CardContent>
      </Card>
    </div>
  )
}
