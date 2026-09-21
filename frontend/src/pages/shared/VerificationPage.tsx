import { PageHeader } from '@/components/PageHeader'
import { Alert } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuthStore } from '@/stores/authStore'

export function VerificationPage() {
  const profile = useAuthStore((s) => s.profile)

  return (
    <div>
      <PageHeader title="Verification" description="Identity and account verification status" />
      <Card className="max-w-lg">
        <CardHeader><CardTitle>Your verification status</CardTitle></CardHeader>
        <CardContent>
          <Alert variant={profile?.verification_status === 'verified' ? 'success' : 'default'}>
            Status: <strong className="capitalize">{profile?.verification_status ?? 'unknown'}</strong>
          </Alert>
          <p className="mt-4 text-sm text-[var(--color-muted-foreground)]">
            Verified accounts unlock full platform features including payments and certificates.
            Contact support or complete the verification flow when available.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
