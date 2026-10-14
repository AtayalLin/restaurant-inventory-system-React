// 儀表板頁面 - 對應路由 /dashboard
//
// 【重構說明】
// 原本這個檔案約 240 行，混雜統計卡、圖表、AI 查詢、低庫存、毛利表等職責，
// 樣式也是每個區塊各寫一套。現在拆成 src/components/dashboard/ 底下的獨立元件，
// 共用的卡片、按鈕、徽章、空狀態統一放在 src/components/ui/，
// 顏色與圓角改由 src/index.css 的設計 token 管理。
// 這個檔案只負責：取得資料、處理載入／錯誤狀態、決定版面配置。
import { DollarSign, CalendarDays, CalendarRange, Users, RefreshCw, ServerCrash } from 'lucide-react'
import { useDashboard } from '../hooks/useDashboard'
import { useStores } from '../hooks/useStores'
import { useSession } from '../session/SessionProvider'
import { ALL_STORES } from '../lib/permissions'
import { formatCurrency, formatTime } from '../lib/format'
import { lazy, Suspense } from 'react'
import { EmptyState, Button, Card, Skeleton } from '../components/ui'
import {
  StatCard, QueryAssistantCard,
  LowStockCard, ExpiryCard, ForecastCard, StoreCompareCard, MarginTable, DashboardSkeleton,
} from '../components/dashboard'

// 營收趨勢圖用到 Recharts（約占儀表板程式的一半），延遲載入：統計卡先顯示，圖表隨後補上
const RevenueTrendCard = lazy(() =>
  import('../components/dashboard/RevenueTrendCard').then(m => ({ default: m.RevenueTrendCard })))

function Dashboard() {
  const { storeId, can } = useSession()
  const { data: stores = [] } = useStores()
  const {
    isLoading,
    isError,
    lowStockItems,
    expiryWarnings,
    productMargins,
    revenueStats,
    dailyTrend,
    forecast,
    allSalesOrders,
    updatedAt,
  } = useDashboard(storeId)
  const storeName = storeId === ALL_STORES ? '全部門市' : stores.find(s => s.id === storeId)?.name ?? ''

  if (isLoading) return <DashboardSkeleton />

  // 資料來源異常時明確告知，而不是安靜地顯示看起來正常、其實是空的數字
  if (isError) {
    return (
      <EmptyState
        className="mx-auto mt-10 max-w-lg bg-white"
        icon={<ServerCrash size={20} />}
        title="資料載入失敗"
        description="請確認 json-server 是否已啟動（npm run server），再重新整理頁面。"
        action={
          <Button variant="secondary" size="sm" icon={<RefreshCw size={14} aria-hidden="true" />}
            onClick={() => window.location.reload()}>
            重新整理
          </Button>
        }
      />
    )
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      {/* 頁首：標題＋最後更新時間 */}
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-ink">營運總覽</h2>
          <p className="mt-1 text-sm text-ink-3">{storeName && `${storeName}・`}今天的營收、庫存與商品表現</p>
        </div>
        <p className="flex items-center gap-1.5 text-xs text-ink-3">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60 motion-reduce:hidden" />
            <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
          </span>
          每 30 秒自動更新・最後更新 {formatTime(updatedAt)}
        </p>
      </div>

      {/* 營收統計 */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard
          label="今日營收"
          value={formatCurrency(revenueStats.todayRevenue)}
          icon={<DollarSign size={18} />}
          compare={{ current: revenueStats.todayRevenue, previous: revenueStats.yesterdayRevenue, label: '昨日' }}
        />
        <StatCard
          label="近 7 天營收"
          value={formatCurrency(revenueStats.weekRevenue)}
          icon={<CalendarDays size={18} />}
          compare={{ current: revenueStats.weekRevenue, previous: revenueStats.prevWeekRevenue, label: '前 7 天' }}
        />
        <StatCard
          label="本月營收"
          value={formatCurrency(revenueStats.monthRevenue)}
          icon={<CalendarRange size={18} />}
          compare={{ current: revenueStats.monthRevenue, previous: revenueStats.prevMonthRevenue, label: '上月同期' }}
        />
        <StatCard
          label="平均客單價"
          value={formatCurrency(revenueStats.avgOrderValue)}
          icon={<Users size={18} />}
          hint={`累計 ${revenueStats.orderCount} 筆完成訂單・今日 ${revenueStats.todayOrderCount} 筆`}
        />
      </div>

      {/* 跨店比較：只有總部在「全部門市」模式下顯示 */}
      {can('report:crossStore') && storeId === ALL_STORES && stores.length > 1 && (
        <StoreCompareCard orders={allSalesOrders} stores={stores} />
      )}

      {/* 趨勢圖＋AI 查詢 */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
        <div className="xl:col-span-3">
          <Suspense fallback={<Card className="h-full p-5"><Skeleton className="h-full min-h-72 w-full" /></Card>}>
            <RevenueTrendCard data={dailyTrend} />
          </Suspense>
        </div>
        <div className="xl:col-span-2"><QueryAssistantCard /></div>
      </div>

      {/* 庫存相關：明日預估 → 目前低庫存 → 即期食材 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <div className="lg:col-span-2 xl:col-span-1"><ForecastCard forecast={forecast} /></div>
        <LowStockCard items={lowStockItems} />
        <ExpiryCard items={expiryWarnings} />
      </div>

      <MarginTable items={productMargins} />
    </div>
  )
}

export default Dashboard
