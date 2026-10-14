// 採購進貨管理頁面 - 對應路由 /purchase
// 流程：建立採購單（待確認）→ 確認下單（已下單）→ 確認收貨（已收貨，自動增加食材庫存）
import { useMemo, useState } from 'react'
import { Check, PackageCheck, Plus, ShoppingCart, X } from 'lucide-react'
import { usePurchaseOrders, useUpdatePurchaseStatus, useReceivePurchaseOrder } from '../../hooks/usePurchaseOrders'
import { useSuppliers, useIngredients } from '../../hooks/useIngredients'
import PurchaseFormModal from './PurchaseFormModal'
import {
  Badge, Button, EmptyState, FilterTabs, OrderCard, PageHeader, TableSkeleton,
  useToast, errorMessage, type Tone,
} from '../../components/ui'
import { useSession } from '../../session/SessionProvider'
import { formatCurrency } from '../../lib/format'
import type { PurchaseOrder } from '../../types'

type Status = PurchaseOrder['status']
const STATUS: Record<Status, { label: string; tone: Tone }> = {
  PENDING: { label: '待確認', tone: 'warning' },
  ORDERED: { label: '已下單', tone: 'brand' },
  RECEIVED: { label: '已收貨', tone: 'success' },
  CANCELLED: { label: '已取消', tone: 'neutral' },
}
const STATUS_ORDER: Status[] = ['PENDING', 'ORDERED', 'RECEIVED', 'CANCELLED']
const date = (iso: string) => new Date(iso).toLocaleDateString('zh-TW')

function PurchasePage() {
  const [filterStatus, setFilterStatus] = useState<Status | 'ALL'>('ALL')
  const [modalOpen, setModalOpen] = useState(false)
  const toast = useToast()
  // 採購由總部（中央廚房）統一進貨；店長可查看進度但不能操作
  const canEdit = useSession().can('purchase:edit')

  const { data: orders = [], isLoading } = usePurchaseOrders()
  const { data: suppliers = [] } = useSuppliers()
  const { data: ingredients = [] } = useIngredients()
  const { mutate: updateStatus } = useUpdatePurchaseStatus()
  // variables：目前正在收貨的那張單，只讓那一張的按鈕顯示 loading
  const { mutate: receiveOrder, isPending: isReceiving, variables: receivingOrder } = useReceivePurchaseOrder()

  const supplierMap = useMemo(() => new Map(suppliers.map(s => [s.id, s.name])), [suppliers])
  const ingredientMap = useMemo(() => new Map(ingredients.map(i => [i.id, i])), [ingredients])

  // 各狀態數量只算一次，篩選按鈕與標題列共用
  const counts = useMemo(() => {
    const c = { ALL: orders.length } as Record<Status | 'ALL', number>
    for (const s of STATUS_ORDER) c[s] = 0
    for (const o of orders) c[o.status]++
    return c
  }, [orders])

  // 新的採購單排在最上面
  const filtered = useMemo(() =>
    (filterStatus === 'ALL' ? orders : orders.filter(o => o.status === filterStatus))
      .toSorted((a, b) => b.createdAt.localeCompare(a.createdAt)),
  [orders, filterStatus])

  /** 狀態變更共用：確認 → 送出 → 提示結果 */
  function changeStatus(order: PurchaseOrder, status: Status, confirmText: string, doneText: string) {
    if (!window.confirm(confirmText)) return
    updateStatus({ id: order.id, status }, {
      onSuccess: () => toast.success(doneText),
      onError: err => toast.error(errorMessage(err)),
    })
  }

  function handleReceive(order: PurchaseOrder) {
    if (!window.confirm('確認收貨？系統將自動增加這張單上食材的庫存。')) return
    receiveOrder(order, {
      onSuccess: () => toast.success('已收貨，食材庫存已更新'),
      onError: err => toast.error(errorMessage(err, '收貨失敗，庫存未更新，請稍後再試')),
    })
  }

  if (isLoading) return <TableSkeleton />

  const addButton = canEdit && <Button icon={<Plus size={16} aria-hidden="true" />} onClick={() => setModalOpen(true)}>建立採購單</Button>

  return (
    <div className="mx-auto max-w-[1100px]">
      <PageHeader
        title="採購進貨管理"
        description={
          <>
            共 {filtered.length} 筆採購單
            {counts.PENDING > 0 && <span className="ml-3 font-medium text-amber-700">{counts.PENDING} 筆待確認</span>}
            {counts.ORDERED > 0 && <span className="ml-3 font-medium text-brand-600">{counts.ORDERED} 筆待收貨</span>}
          </>
        }
        action={addButton}
      />

      {orders.length === 0 ? (
        <EmptyState className="bg-white" icon={<ShoppingCart size={20} />} title="還沒有採購單"
          description="建立採購單並確認收貨後，食材庫存會自動增加。" action={addButton} />
      ) : (
        <>
          <FilterTabs
            label="依採購單狀態篩選"
            value={filterStatus}
            onChange={setFilterStatus}
            options={[
              { value: 'ALL', label: '全部', count: counts.ALL },
              ...STATUS_ORDER.map(s => ({ value: s, label: STATUS[s].label, count: counts[s] })),
            ]}
          />

          <div className="space-y-3">
            {filtered.length === 0 && <p className="py-10 text-center text-sm text-ink-3">沒有符合條件的採購單</p>}
            {filtered.map(order => {
              const supplierName = supplierMap.get(order.supplierId) ?? '未知供應商'
              const thisReceiving = isReceiving && receivingOrder?.id === order.id
              return (
                <OrderCard
                  key={order.id}
                  title={<>
                    <span className="text-[15px] font-semibold text-ink">{supplierName}</span>
                    <Badge tone={STATUS[order.status].tone}>{STATUS[order.status].label}</Badge>
                  </>}
                  meta={<>
                    建立 {date(order.createdAt)}
                    {order.expectedDate && <span className="ml-3">預計到貨 {date(order.expectedDate)}</span>}
                    {order.receivedDate && <span className="ml-3 text-emerald-700">實際收貨 {date(order.receivedDate)}</span>}
                  </>}
                  amount={formatCurrency(order.totalAmount)}
                  amountHint={`${order.items.length} 項食材`}
                  lines={order.items.map((item, idx) => {
                    const ing = ingredientMap.get(item.ingredientId)
                    return {
                      key: `${item.ingredientId}-${idx}`,
                      name: ing?.name ?? item.ingredientId,
                      detail: `${item.quantity.toLocaleString('zh-TW')} ${ing?.unit ?? ''} × NT$ ${item.unitPrice} = ${formatCurrency(item.quantity * item.unitPrice)}`,
                    }
                  })}
                  note={order.note}
                  actions={canEdit && <>
                    {order.status === 'PENDING' && (
                      <Button size="sm" icon={<Check size={14} aria-hidden="true" />}
                        onClick={() => changeStatus(order, 'ORDERED', `確認向「${supplierName}」下單？`, `已向「${supplierName}」下單`)}>
                        確認下單
                      </Button>
                    )}
                    {order.status === 'ORDERED' && (
                      <Button size="sm" icon={<PackageCheck size={14} aria-hidden="true" />} loading={thisReceiving}
                        disabled={isReceiving} onClick={() => handleReceive(order)}
                        className="bg-emerald-600 hover:bg-emerald-700 focus-visible:ring-emerald-100">
                        確認收貨
                      </Button>
                    )}
                    {(order.status === 'PENDING' || order.status === 'ORDERED') && (
                      <Button size="sm" variant="danger" icon={<X size={14} aria-hidden="true" />}
                        onClick={() => changeStatus(order, 'CANCELLED', '確定取消此採購單？此操作無法復原。', '採購單已取消')}>
                        取消
                      </Button>
                    )}
                  </>}
                />
              )
            })}
          </div>
        </>
      )}

      {modalOpen && <PurchaseFormModal onClose={() => setModalOpen(false)} />}
    </div>
  )
}

export default PurchasePage
