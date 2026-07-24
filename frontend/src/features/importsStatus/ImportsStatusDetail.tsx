import { Link, useParams } from 'react-router-dom'
import { PageHeader } from '@/components/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/AuthContext'
import { can } from '@/lib/roleAccess'

export function ImportsStatusDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  // Placeholder: once real records exist, entry's edit rights are scoped to
  // their own drafts — that check needs the record's owner/draft state,
  // which doesn't exist yet, so this only covers the unscoped `editAny` case.
  const canEdit = can(user, 'editAny') || can(user, 'editOwnDraft')

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PageHeader title={`Consignment ${id}`} subtitle="Detail view" module="importsStatus" />
        {canEdit && (
          <Button asChild variant="outline">
            <Link to={`/imports-status/${id}/edit/1`}>Edit</Link>
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="flex h-48 items-center justify-center text-muted">
          Consignment detail for {id} is coming soon.
        </CardContent>
      </Card>
    </div>
  )
}
