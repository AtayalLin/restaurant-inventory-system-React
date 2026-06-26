import { useState } from 'react'
// useState：管理 Modal 開關、篩選狀態等 UI 狀態

import {
  usePurchaseOrders,
  useUpdatePurchaseStatus,
  useReceivePurchaseOrder,
} from '../../hooks/usePurchaseOrders'
// 關聯：src/hooks/usePurchaseOrders.ts
// usePurchaseOrders：GET /api/purchaseOrders
// useUpdatePurchaseStatus：PATCH status（PENDING→ORDERED 或 →CANCELLED）
// useReceivePurchaseOrder：PATCH status=RECEIVED + 更新所有食材庫存

import { useSuppliers, useIngredients } from '../../hooks/useIngredients'
// 關聯：src/hooks/useIngredients.ts
// 供應商列表用於顯示採購單的供應商名稱
// 食材列表用於顯示採購明細中的食材名稱

import PurchaseFormModal from './PurchaseFormModal'
// 關聯：src/pages/purchase/PurchaseFormModal.tsx（下一步建立）

import type { PurchaseOrder } from '../../types'
// 關聯：src/types/index.ts
// PurchaseOrder：{ id, supplierId, status, items, totalAmount, expectedDate, note, createdAt }


// ── 狀態顯示對照表 ────────────────────────────────────────
// 為什麼用 Map 不用 if/else：
//   四種狀態各有不同的顏色、文字、可執行動作
//   集中定義讓邏輯清晰，新增狀態時只改這裡
const STATUS_CONFIG: Record<PurchaseOrder['status'], {
  label: string
  color: string
  bg: string
}> = {
  PENDING:   { label: '待確認', color: '#D97706', bg: '#FEF3C7' },
  // 待確認：剛建立，尚未向供應商下單
  ORDERED:   { label: '已下單', color: '#2563EB', bg: '#DBEAFE' },
  // 已下單：已通知供應商，等待送達
  RECEIVED:  { label: '已收貨', color: '#16A34A', bg: '#DCFCE7' },
  // 已收貨：貨品已到，庫存已更新
  CANCELLED: { label: '已取消', color: '#6B7280', bg: '#F3F4F6' },
  // 已取消：訂單作廢
}

function PurchasePage() {
  // ── UI 狀態 ──────────────────────────────────────────────
  const [filterStatus, setFilterStatus] = useState<PurchaseOrder['status'] | 'ALL'>('ALL')
  // 篩選狀態，ALL 代表顯示全部
  // 為什麼用 union type：限制只能是合法的狀態值或 'ALL'

  const [modalOpen, setModalOpen] = useState(false)
  // 控制新增採購單 Modal 的開關
  // 注意：採購單建立後不允許編輯（需要先取消再重建），所以不需要 editingOrder

  // ── 資料取得 ─────────────────────────────────────────────
  const { data: orders = [], isLoading } = usePurchaseOrders()
  // orders 預設 []，避免 isLoading 期間 .filter() 出錯

  const { data: suppliers = [] } = useSuppliers()
  // 供應商列表，用於建立 id→名稱 查找 Map

  const { mutate: updateStatus } = useUpdatePurchaseStatus()
  // 更新採購單狀態（下單/取消）

  const { mutate: receiveOrder, isPending: isReceiving } = useReceivePurchaseOrder()
  // 確認收貨（同時更新食材庫存）
  // isPending：收貨操作執行中，防止重複點擊

  // ── 供應商 Map ────────────────────────────────────────────
  const supplierMap = new Map(suppliers.map(s => [s.id, s.name]))
  // 結果範例：Map { 's001' => '台灣生鮮肉品行' }
  // 為什麼不用 useMemo：suppliers 不常變動，直接建立 Map 效能足夠

  const { data: ingredients = [] } = useIngredients()
  const ingredientMap = new Map(ingredients.map(i => [i.id, `${i.name}（${i.unit}）`]))
  // id → '牛腱肉（g）' 的查找表

  // ── 前端篩選 ──────────────────────────────────────────────
  const filtered = filterStatus === 'ALL'
    ? orders
    : orders.filter(o => o.status === filterStatus)
  // 'ALL' 時直接回傳全部，否則篩選指定狀態

  // ── 統計數字 ──────────────────────────────────────────────
  const pendingCount = orders.filter(o => o.status === 'PENDING').length
  const orderedCount = orders.filter(o => o.status === 'ORDERED').length
  // 用於頁首顯示待處理數量，讓老闆一眼掌握待辦事項

  // ── 事件處理 ──────────────────────────────────────────────
  function handleConfirmOrder(order: PurchaseOrder) {
    // PENDING → ORDERED：確認向供應商下單
    if (!window.confirm(`確認向「${supplierMap.get(order.supplierId) ?? '供應商'}」下單？`)) return
    updateStatus({ id: order.id, status: 'ORDERED' })
  }

  function handleCancelOrder(order: PurchaseOrder) {
    // 任何狀態 → CANCELLED
    if (!window.confirm(`確定取消此採購單？此操作無法復原。`)) return
    updateStatus({ id: order.id, status: 'CANCELLED' })
  }

  function handleReceiveOrder(order: PurchaseOrder) {
    // ORDERED → RECEIVED：確認收貨，同時更新食材庫存
    if (!window.confirm(`確認收貨？系統將自動更新以下食材的庫存數量。`)) return
    receiveOrder(order)
    // receiveOrder 會：
    //   1. 取得每筆食材目前庫存
    //   2. 加上採購數量
    //   3. PATCH 每筆食材的 currentStock
    //   4. PATCH 採購單 status = RECEIVED
  }

  // ── 載入中 ────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#6B7280' }}>
        載入採購資料中...
      </div>
    )
  }

  // ── 畫面渲染 ──────────────────────────────────────────────
  return (
    <div>
      {/* ── 頁首 ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '20px', color: '#1E3A5F' }}>採購進貨管理</h2>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#6B7280' }}>
            共 {filtered.length} 筆採購單
            {pendingCount > 0 && (
              <span style={{ marginLeft: '12px', color: '#D97706', fontWeight: 500 }}>
                ⏳ {pendingCount} 筆待確認
              </span>
            )}
            {orderedCount > 0 && (
              <span style={{ marginLeft: '12px', color: '#2563EB', fontWeight: 500 }}>
                🚚 {orderedCount} 筆待收貨
              </span>
            )}
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          style={{
            background: '#1E40AF',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            padding: '10px 20px',
            fontSize: '14px',
            cursor: 'pointer',
          }}
        >
          ＋ 建立採購單
        </button>
      </div>

      {/* ── 狀態篩選列 ── */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {(['ALL', 'PENDING', 'ORDERED', 'RECEIVED', 'CANCELLED'] as const).map(status => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            // as const：讓 TypeScript 推導為 literal type 而不是 string
            style={{
              padding: '6px 16px',
              borderRadius: '999px',
              fontSize: '13px',
              border: '1px solid',
              cursor: 'pointer',
              borderColor: filterStatus === status ? '#1E40AF' : '#E5E7EB',
              background: filterStatus === status ? '#EFF6FF' : '#fff',
              color: filterStatus === status ? '#1E40AF' : '#6B7280',
              fontWeight: filterStatus === status ? 600 : 400,
              // 選中的篩選按鈕加粗+藍色，未選中灰色
            }}
          >
            {status === 'ALL' ? '全部' : STATUS_CONFIG[status].label}
            <span style={{ marginLeft: '6px', fontSize: '12px' }}>
              {status === 'ALL'
                ? orders.length
                : orders.filter(o => o.status === status).length
              }
            </span>
            {/* 每個狀態顯示數量，讓老闆快速掌握各狀態的單數 */}
          </button>
        ))}
      </div>

      {/* ── 採購單列表 ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {filtered.length === 0 ? (
          <div style={{
            background: '#fff',
            borderRadius: '8px',
            border: '1px solid #E5E7EB',
            padding: '40px',
            textAlign: 'center',
            color: '#9CA3AF',
          }}>
            沒有符合條件的採購單
          </div>
        ) : (
          filtered.map(order => {
            const config = STATUS_CONFIG[order.status]
            const supplierName = supplierMap.get(order.supplierId) ?? '未知供應商'
            const canConfirm  = order.status === 'PENDING'
            const canReceive  = order.status === 'ORDERED'
            const canCancel   = order.status === 'PENDING' || order.status === 'ORDERED'
            // 操作按鈕的顯示條件：根據目前狀態決定可執行哪些動作

            return (
              <div
                key={order.id}
                style={{
                  background: '#fff',
                  borderRadius: '8px',
                  border: '1px solid #E5E7EB',
                  padding: '20px',
                }}
              >
                {/* 採購單標題列 */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                      <span style={{ fontSize: '15px', fontWeight: 600, color: '#111827' }}>
                        {supplierName}
                      </span>
                      {/* 狀態 Badge */}
                      <span style={{
                        padding: '2px 10px',
                        borderRadius: '999px',
                        fontSize: '12px',
                        fontWeight: 500,
                        background: config.bg,
                        color: config.color,
                      }}>
                        {config.label}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#9CA3AF' }}>
                      建立：{new Date(order.createdAt).toLocaleDateString('zh-TW')}
                      {order.expectedDate && (
                        <span style={{ marginLeft: '12px' }}>
                          預計到貨：{new Date(order.expectedDate).toLocaleDateString('zh-TW')}
                        </span>
                      )}
                      {order.receivedDate && (
                        <span style={{ marginLeft: '12px', color: '#16A34A' }}>
                          實際收貨：{new Date(order.receivedDate).toLocaleDateString('zh-TW')}
                        </span>
                      )}
                    </div>
                  </div>
                  {/* 總金額 */}
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '18px', fontWeight: 700, color: '#1E3A5F' }}>
                      NT$ {order.totalAmount.toLocaleString()}
                    </div>
                    <div style={{ fontSize: '12px', color: '#9CA3AF' }}>
                      {order.items.length} 項食材
                    </div>
                  </div>
                </div>

                {/* 明細列表 */}
                <div style={{
                  background: '#F8FAFC',
                  borderRadius: '6px',
                  padding: '12px',
                  marginBottom: '12px',
                }}>
                  {order.items.map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '13px',
                        color: '#374151',
                        padding: '4px 0',
                        borderBottom: idx < order.items.length - 1 ? '1px solid #E5E7EB' : 'none',
                      }}
                    >
                      <span>{ingredientMap.get(item.ingredientId) ?? item.ingredientId}</span>

                      {/* 暫時顯示 ID，Week 3 優化時改成食材名稱 */}
                      <span>
                        {item.quantity} 單位 × NT$ {item.unitPrice} = NT$ {(item.quantity * item.unitPrice).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>

                {/* 備註 */}
                {order.note && (
                  <p style={{ fontSize: '13px', color: '#6B7280', margin: '0 0 12px' }}>
                    備註：{order.note}
                  </p>
                )}

                {/* 操作按鈕 */}
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  {canConfirm && (
                    <button
                      onClick={() => handleConfirmOrder(order)}
                      style={actionBtnStyle('#2563EB', '#DBEAFE')}
                    >
                      ✓ 確認下單
                    </button>
                  )}
                  {canReceive && (
                    <button
                      onClick={() => handleReceiveOrder(order)}
                      disabled={isReceiving}
                      style={actionBtnStyle('#16A34A', '#DCFCE7')}
                    >
                      {isReceiving ? '處理中...' : '📦 確認收貨'}
                    </button>
                  )}
                  {canCancel && (
                    <button
                      onClick={() => handleCancelOrder(order)}
                      style={actionBtnStyle('#DC2626', '#FEE2E2')}
                    >
                      ✕ 取消
                    </button>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* ── Modal ── */}
      {modalOpen && (
        <PurchaseFormModal onClose={() => setModalOpen(false)} />
        // 採購單只有新增模式，不支援編輯（需取消後重建）
        // 所以不需要傳 order prop
      )}
    </div>
  )
}

// ── 共用樣式函式 ──────────────────────────────────────────────
function actionBtnStyle(color: string, bg: string): React.CSSProperties {
  return {
    padding: '6px 16px',
    fontSize: '13px',
    border: `1px solid ${color}`,
    borderRadius: '6px',
    background: bg,
    color: color,
    cursor: 'pointer',
    fontWeight: 500,
  }
}

export default PurchasePage