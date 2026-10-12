import { Card, Skeleton } from '../ui'

/** 儀表板載入中的骨架畫面：版面和實際內容一致，資料進來時畫面不會跳動 */
export function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="儀表板載入中">
      <Skeleton className="h-8 w-40" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="space-y-3 p-5">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-7 w-32" />
            <Skeleton className="h-3 w-24" />
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="p-5 xl:col-span-2"><Skeleton className="h-[280px] w-full" /></Card>
        <Card className="p-5"><Skeleton className="h-[280px] w-full" /></Card>
      </div>
    </div>
  )
}
