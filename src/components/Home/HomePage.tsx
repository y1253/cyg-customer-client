import { Card } from '@/components/ui/card'
import { useHealth } from '@/hooks/useHealth'

export function HomePage() {
  const { data, isLoading, isError } = useHealth()

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0B1C2C] p-4">
      <Card className="w-full max-w-md p-6 flex flex-col gap-2">
        <h1 className="text-xl font-semibold">CYG Finance</h1>
        <p className="text-sm text-muted-foreground">Customer portal</p>
        <p className="text-xs text-muted-foreground">
          API:{' '}
          {isLoading ? (
            'checking…'
          ) : isError ? (
            <span className="text-red-600">unreachable</span>
          ) : (
            <span className="text-[#3BBFB4]">{data?.status}</span>
          )}
        </p>
      </Card>
    </div>
  )
}
