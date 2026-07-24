import { Link } from 'react-router-dom'
import { PackageSearch } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/AuthContext'
import { can } from '@/lib/roleAccess'

export function ImportsStatusList() {
  const { user } = useAuth()

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PageHeader title="Imports Status" subtitle="Consignment tracking" module="importsStatus" />
        {can(user, 'enter') && (
          <Button asChild>
            <Link to="/imports-status/new">New Consignment</Link>
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="flex h-48 flex-col items-center justify-center gap-2 text-center text-muted">
          <PackageSearch size={28} />
          <p>Consignment list is coming soon — will replace this once real data is wired up.</p>
        </CardContent>
      </Card>
    </div>
  )
}
