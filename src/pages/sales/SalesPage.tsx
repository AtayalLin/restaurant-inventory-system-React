// 銷售管理頁面 - 對應路由 /sales
// 流程：新增訂單（待出餐）→ 開始備餐（準備中）→ 出餐完成（已完成，依配方自動扣食材庫存）
import { useMemo, useState } from 'react'
import { Check, ChefHat, Plus, ReceiptText, RotateCcw, X } from 'lucide-react'
import { useSalesOrders, useUpdateSalesStatus, useCompleteSalesOrder, useRefundSalesOrder } from '../../hooks/useSalesOrders'
import { useProducts } from '../../hooks/useProducts'
import SalesFormModal from './SalesFormModal'
import {
  Badge, Button, EmptyState, FilterTabs, OrderCard, PageHeader, TableSkeleton,
  useToast, errorMessage, type Tone,
} from '../../components/ui'
import { useSession } from '../../session/SessionProvider'
import { useStores } from '../../hooks/useStores'
import { ALL_STORES, filterByStore, storeOf } from '../../lib/permissions'
import { formatCurrency } from '../../lib/format'
import type { SalesOrder } from '../../types'

type Status = SalesOrder['status']
const STATUS: Record<Status, { label: string; tone: Tone }> = {
  PENDING: { label: '待出餐', tone: 'warning' },
  PREPARING: { label: '準備中', tone: 'brand' },
  COMPLETED: { label: '已完成', tone: 'success' },
  REFUNDED: { label: '已退款', tone: 'neutral' },
}
const STATUS_ORDER: Status[] = ['PENDING', 'PREPARING', 'COMPLETED', 'REFUNDED']
const CHANNEL_LABEL: Record<SalesOrder['channel'], string> = { DINE_IN: '內用', TAKEOUT: '外帶', DELIVERY: '外送' }
const PAGE_SIZE = 20 // 一次渲染 20 筆，訂單累積到上百筆時頁面仍然流暢

function SalesPage() {
  const [filterStatus, setFilterStatus] = useState<Status | 'ALL'>('ALL')
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [modalOpen, setModalOpen] = useState(false)
  const toast = useToast()

  const { storeId, can } = useSession()
  const { data: stores = [] } = useStores()
  const { data: allOrders = [], isLoading } = useSalesOrders()
  // 只顯示目前門市的訂單；總部選「全部門市」時看全部
  const orders = useMemo(() => filterByStore(allOrders, storeId), [allOrders, storeId])
  const isAllStores = storeId === ALL_STORES
  const storeName = useMemo(() => new Map(stores.map(s => [s.id, s.name])), [stores])
  const { data: products = [] } = useProducts()
  const { mutate: updateStatus } = useUpdateSalesStatus()
  // variables：正在出餐的那筆訂單，只讓它的按鈕顯示 loading
  const { mutate: completeOrder, isPending: isCompleting, variables: completingOrder } = useCompleteSalesOrder()
  const { mutate: refundOrder } = useRefundSalesOrder()

  const productMap = useMemo(() => new Map(products.map(p => [p.id, p.name])), [products])

  // 各狀態數量與今日營收一次算完
  const { counts, todayRevenue } = useMemo(() => {
    const c = { ALL: orders.length } as Record<Status | 'ALL', number>
    for (const s of STATUS_ORDER) c[s] = 0
    const today = new Date().toDateString()
    let revenue = 0
    for (const o of orders) {
      c[o.status]++
      if (o.status === 'COMPLETED' && new Date(o.createdAt).toDateString() === today) revenue += o.total
    }
    return { counts: c, todayRevenue: revenue }
  }, [orders])

  // 新訂單在最上面：櫃台最常處理剛進來的單
  const filtered = useMemo(() =>
    (filterStatus === 'ALL' ? orders : orders.filter(o => o.status === filterStatus))
      .toSorted((a, b) => b.createdAt.localeCompare(a.createdAt)),
  [orders, filterStatus])
  const visible = filtered.slice(0, visibleCount)

  const notify = (doneText: string, failText?: string) => ({
    onSuccess: () => toast.success(doneText),
    onError: (err: unknown) => toast.error(errorMessage(err, failText)),
  })

  function handleComplete(order: SalesOrder) {
    if (!window.confirm('確認出餐完成？系統將依配方自動扣減食材庫存。')) return
    // 庫存不足時會拋出錯誤，訊息會列出不足的食材（後端或前端版本皆同）
    completeOrder(order, notify('出餐完成，食材庫存已扣減', '出餐失敗，請稍後再試'))
  }

  function handleCancel(order: SalesOrder) {
    if (!window.confirm('確定取消此訂單？')) return
    updateStatus({ id: order.id, status: 'REFUNDED' }, notify('訂單已取消'))
  }

  function handleRefund(order: SalesOrder) {
    if (!window.confirm('確定退款？注意：系統不會自動回補食材庫存。')) return
    refundOrder(order.id, notify('已退款'))
  }

  if (isLoading) return <TableSkeleton />

  // 訂單一定屬於某間門市：總部在「全部門市」模式下要先選門市才能點餐
  const addButton = (
    <Button icon={<Plus size={16} aria-hidden="true" />} onClick={() => setModalOpen(true)} disabled={isAllStores}
      title={isAllStores ? '請先在右上角選擇門市' : undefined}>
      新增訂單
    </Button>
  )

  return (
    <div className="mx-auto max-w-[1100px]">
      <PageHeader
        title="銷售管理"
        description={
          <>
            共 {orders.length} 筆訂單
            {counts.PENDING > 0 && <span className="ml-3 font-medium text-amber-700">{counts.PENDING} 筆待出餐</span>}
            {counts.PREPARING > 0 && <span className="ml-3 font-medium text-brand-600">{counts.PREPARING} 筆準備中</span>}
            <span className="ml-3 font-medium text-emerald-700">今日營收 {formatCurrency(todayRevenue)}</span>
          </>
        }
        action={addButton}
      />

      {orders.length === 0 ? (
        <EmptyState className="bg-white" icon={<ReceiptText size={20} />} title="還沒有訂單"
          description="建立第一筆銷售訂單，出餐完成後會自動扣減食材庫存。" action={addButton} />
      ) : (
        <>
          <FilterTabs
            label="依訂單狀態篩選"
            value={filterStatus}
            onChange={v => { setFilterStatus(v); setVisibleCount(PAGE_SIZE) }}
            options={[
              { value: 'ALL', label: '全部', count: counts.ALL },
              ...STATUS_ORDER.map(s => ({ value: s, label: STATUS[s].label, count: counts[s] })),
            ]}
          />

          <div className="space-y-3">
            {filtered.length === 0 && <p className="py-10 text-center text-sm text-ink-3">沒有符合條件的訂單</p>}
            {visible.map(order => {
              const thisCompleting = isCompleting && completingOrder?.id === order.id
              return (
                <OrderCard
                  key={order.id}
                  title={<>
                    {isAllStores && <span className="text-[13px] font-semibold text-ink">{storeName.get(storeOf(order)) ?? '—'}</span>}
                    <span className="text-[13px] font-medium text-ink-2">{CHANNEL_LABEL[order.channel]}</span>
                    <Badge tone={STATUS[order.status].tone}>{STATUS[order.status].label}</Badge>
                  </>}
                  meta={new Date(order.createdAt).toLocaleString('zh-TW')}
                  amount={formatCurrency(order.total)}
                  amountHint={<>小計 {order.subtotal} ＋ 稅 {order.taxAmount}{order.discount > 0 && ` － 折扣 ${order.discount}`}</>}
                  lines={order.items.map((item, idx) => ({
                    key: `${item.productId}-${idx}`,
                    name: productMap.get(item.productId) ?? item.productId,
                    detail: `${item.quantity} 份 × NT$ ${item.unitPrice} = ${formatCurrency(item.quantity * item.unitPrice)}`,
                  }))}
                  note={order.note}
                  actions={<>
                    {order.status === 'PENDING' && (
                      <>
                        <Button size="sm" icon={<ChefHat size={14} aria-hidden="true" />}
                          onClick={() => updateStatus({ id: order.id, status: 'PREPARING' }, notify('已開始備餐'))}>
                          開始備餐
                        </Button>
                        <Button size="sm" variant="danger" icon={<X size={14} aria-hidden="true" />} onClick={() => handleCancel(order)}>
                          取消
                        </Button>
                      </>
                    )}
                    {order.status === 'PREPARING' && (
                      <Button size="sm" icon={<Check size={14} aria-hidden="true" />} loading={thisCompleting}
                        disabled={isCompleting} onClick={() => handleComplete(order)}
                        className="bg-emerald-600 hover:bg-emerald-700 focus-visible:ring-emerald-100">
                        出餐完成
                      </Button>
                    )}
                    {order.status === 'COMPLETED' && can('sales:refund') && (
                      <Button size="sm" variant="secondary" icon={<RotateCcw size={14} aria-hidden="true" />} onClick={() => handleRefund(order)}>
                        退款
                      </Button>
                    )}
                  </>}
                />
              )
            })}
            {filtered.length > visibleCount && (
              <div className="flex justify-center pt-1">
                <Button variant="secondary" onClick={() => setVisibleCount(c => c + PAGE_SIZE)}>
                  顯示更多（已顯示 {visible.length} / {filtered.length} 筆）
                </Button>
              </div>
            )}
          </div>
        </>
      )}

      {modalOpen && !isAllStores && <SalesFormModal storeId={storeId} onClose={() => setModalOpen(false)} />}
    </div>
  )
}

export default SalesPage
