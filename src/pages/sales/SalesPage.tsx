import { useState } from 'react'


import {
  useSalesOrders,
  useUpdateSalesStatus,
  useCompleteSalesOrder,
  useRefundSalesOrder,
} from '../../hooks/useSalesOrders'
// 關聯：src/hooks/useSalesOrders.ts

import { useProducts } from '../../hooks/useProducts'
// 關聯：src/hooks/useProducts.ts
// 商品列表用於顯示訂單明細中的商品名稱

import SalesFormModal from './SalesFormModal'
// 關聯：src/pages/sales/SalesFormModal.tsx（下一步建立）

import type { SalesOrder } from '../../types'
// 關聯：src/types/index.ts
// SalesOrder：{ id, status, items, subtotal, taxAmount, discount, total, channel, note, createdAt }

// ── 狀態顯示對照表 ────────────────────────────────────────
const STATUS_CONFIG: Record<SalesOrder['status'], { label: string; color: string; bg: string }> = {
  PENDING:   { label: '待出餐', color: '#D97706', bg: '#FEF3C7' },
  PREPARING: { label: '準備中', color: '#2563EB', bg: '#DBEAFE' },
  COMPLETED: { label: '已完成', color: '#16A34A', bg: '#DCFCE7' },
  REFUNDED:  { label: '已退款', color: '#6B7280', bg: '#F3F4F6' },
}

// ── 銷售渠道對照表 ────────────────────────────────────────
const CHANNEL_LABEL: Record<SalesOrder['channel'], string> = {
  DINE_IN:  '🍽️ 內用',
  TAKEOUT:  '🥡 外帶',
  DELIVERY: '🛵 外送',
}

function SalesPage() {
  const [filterStatus, setFilterStatus] = useState<SalesOrder['status'] | 'ALL'>('ALL')
  const [modalOpen, setModalOpen] = useState(false)

  // ── 資料取得 ─────────────────────────────────────────────
  const { data: orders = [], isLoading } = useSalesOrders()
  const { mutate: updateStatus } = useUpdateSalesStatus()
  const { mutate: completeOrder, isPending: isCompleting } = useCompleteSalesOrder()
  const { mutate: refundOrder } = useRefundSalesOrder()
  const { data: products = [] } = useProducts()
  const productMap = new Map(products.map(p => [p.id, p.name]))
  // id → '招牌牛肉麵' 的查找表

  // ── 篩選 ──────────────────────────────────────────────────
  const filtered = filterStatus === 'ALL'
    ? orders
    : orders.filter(o => o.status === filterStatus)

  // ── 統計 ──────────────────────────────────────────────────
  const pendingCount   = orders.filter(o => o.status === 'PENDING').length
  const preparingCount = orders.filter(o => o.status === 'PREPARING').length
  const todayRevenue   = orders
    .filter(o => {
      const today = new Date().toDateString()
      return o.status === 'COMPLETED' &&
        new Date(o.createdAt).toDateString() === today
    })
    .reduce((sum, o) => sum + o.total, 0)
  // todayRevenue：今日已完成訂單的總營收，顯示在頁首 KPI

  // ── 事件處理 ──────────────────────────────────────────────
  function handlePrepare(order: SalesOrder) {
    updateStatus({ id: order.id, status: 'PREPARING' })
    // PENDING → PREPARING：確認接單開始備餐，不需要 confirm
  }

  function handleComplete(order: SalesOrder) {
    if (!window.confirm('確認出餐完成？系統將自動扣減食材庫存。')) return
    completeOrder(order)
    // PREPARING → COMPLETED：扣減食材庫存
  }

  function handleCancel(order: SalesOrder) {
    if (!window.confirm('確定取消此訂單？')) return
    updateStatus({ id: order.id, status: 'REFUNDED' })
    // 直接標記為退款，不還原庫存（食材尚未使用）
  }

  function handleRefund(order: SalesOrder) {
    if (!window.confirm('確定退款？注意：系統不會自動回補食材庫存。')) return
    refundOrder(order.id)
    // COMPLETED → REFUNDED：食材已消耗，不回補庫存
  }

  if (isLoading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#6B7280' }}>載入銷售資料中...</div>
  }

  return (
    <div>
      {/* ── 頁首 ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '20px', color: '#1E3A5F' }}>銷售管理</h2>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#6B7280' }}>
            共 {filtered.length} 筆訂單
            {pendingCount > 0 && (
              <span style={{ marginLeft: '12px', color: '#D97706', fontWeight: 500 }}>
                🔔 {pendingCount} 筆待出餐
              </span>
            )}
            {preparingCount > 0 && (
              <span style={{ marginLeft: '12px', color: '#2563EB', fontWeight: 500 }}>
                👨‍🍳 {preparingCount} 筆準備中
              </span>
            )}
            <span style={{ marginLeft: '12px', color: '#16A34A', fontWeight: 500 }}>
              💰 今日營收 NT$ {todayRevenue.toLocaleString()}
            </span>
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          style={{
            background: '#1E40AF', color: '#fff', border: 'none',
            borderRadius: '6px', padding: '10px 20px', fontSize: '14px', cursor: 'pointer',
          }}
        >
          ＋ 新增訂單
        </button>
      </div>

      {/* ── 狀態篩選列 ── */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {(['ALL', 'PENDING', 'PREPARING', 'COMPLETED', 'REFUNDED'] as const).map(status => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            style={{
              padding: '6px 16px', borderRadius: '999px', fontSize: '13px',
              border: '1px solid', cursor: 'pointer',
              borderColor: filterStatus === status ? '#1E40AF' : '#E5E7EB',
              background: filterStatus === status ? '#EFF6FF' : '#fff',
              color: filterStatus === status ? '#1E40AF' : '#6B7280',
              fontWeight: filterStatus === status ? 600 : 400,
            }}
          >
            {status === 'ALL' ? '全部' : STATUS_CONFIG[status].label}
            <span style={{ marginLeft: '6px', fontSize: '12px' }}>
              {status === 'ALL' ? orders.length : orders.filter(o => o.status === status).length}
            </span>
          </button>
        ))}
      </div>

      {/* ── 訂單列表 ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {filtered.length === 0 ? (
          <div style={{
            background: '#fff', borderRadius: '8px', border: '1px solid #E5E7EB',
            padding: '40px', textAlign: 'center', color: '#9CA3AF',
          }}>
            沒有符合條件的訂單
          </div>
        ) : (
          filtered.map(order => {
            const config = STATUS_CONFIG[order.status]
            const canPrepare  = order.status === 'PENDING'
            const canComplete = order.status === 'PREPARING'
            const canCancel   = order.status === 'PENDING'
            const canRefund   = order.status === 'COMPLETED'

            return (
              <div key={order.id} style={{
                background: '#fff', borderRadius: '8px',
                border: '1px solid #E5E7EB', padding: '20px',
              }}>
                {/* 訂單標題列 */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                      <span style={{ fontSize: '13px', color: '#6B7280' }}>
                        {CHANNEL_LABEL[order.channel]}
                      </span>
                      <span style={{
                        padding: '2px 10px', borderRadius: '999px',
                        fontSize: '12px', fontWeight: 500,
                        background: config.bg, color: config.color,
                      }}>
                        {config.label}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#9CA3AF' }}>
                      {new Date(order.createdAt).toLocaleString('zh-TW')}
                    </div>
                  </div>
                  {/* 金額區塊 */}
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '18px', fontWeight: 700, color: '#1E3A5F' }}>
                      NT$ {order.total.toLocaleString()}
                    </div>
                    <div style={{ fontSize: '11px', color: '#9CA3AF' }}>
                      小計 {order.subtotal} ＋ 稅 {order.taxAmount}
                      {order.discount > 0 && ` － 折扣 ${order.discount}`}
                    </div>
                  </div>
                </div>

                {/* 訂單明細 */}
                <div style={{
                  background: '#F8FAFC', borderRadius: '6px',
                  padding: '12px', marginBottom: '12px',
                }}>
                  {order.items.map((item, idx) => (
                    <div key={idx} style={{
                      display: 'flex', justifyContent: 'space-between',
                      fontSize: '13px', color: '#374151', padding: '4px 0',
                      borderBottom: idx < order.items.length - 1 ? '1px solid #E5E7EB' : 'none',
                    }}>
                      <span>{productMap.get(item.productId) ?? item.productId}</span>
                      {/* Week 3 優化：改成商品名稱，同 PurchasePage 的 ingredientMap 做法 */}
                      <span>{item.quantity} 份 × NT$ {item.unitPrice} = NT$ {(item.quantity * item.unitPrice).toLocaleString()}</span>
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
                  {canPrepare && (
                    <button onClick={() => handlePrepare(order)} style={btnStyle('#2563EB', '#DBEAFE')}>
                      👨‍🍳 開始備餐
                    </button>
                  )}
                  {canComplete && (
                    <button
                      onClick={() => handleComplete(order)}
                      disabled={isCompleting}
                      style={btnStyle('#16A34A', '#DCFCE7')}
                    >
                      {isCompleting ? '處理中...' : '✓ 出餐完成'}
                    </button>
                  )}
                  {canCancel && (
                    <button onClick={() => handleCancel(order)} style={btnStyle('#DC2626', '#FEE2E2')}>
                      ✕ 取消
                    </button>
                  )}
                  {canRefund && (
                    <button onClick={() => handleRefund(order)} style={btnStyle('#6B7280', '#F3F4F6')}>
                      退款
                    </button>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* ── Modal ── */}
      {modalOpen && <SalesFormModal onClose={() => setModalOpen(false)} />}
    </div>
  )
}

function btnStyle(color: string, bg: string): React.CSSProperties {
  return {
    padding: '6px 16px', fontSize: '13px',
    border: `1px solid ${color}`, borderRadius: '6px',
    background: bg, color, cursor: 'pointer', fontWeight: 500,
  }
}

export default SalesPage