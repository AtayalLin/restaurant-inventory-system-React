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
  PENDING:   { label: '待出餐', color: '#B45309', bg: '#FEF3C7' },
  PREPARING: { label: '準備中', color: '#2B5287', bg: '#D9E4F1' },
  COMPLETED: { label: '已完成', color: '#047857', bg: '#D1FAE5' },
  REFUNDED:  { label: '已退款', color: '#6B7480', bg: '#EEF1F5' },
}

// ── 銷售渠道對照表 ────────────────────────────────────────
const CHANNEL_LABEL: Record<SalesOrder['channel'], string> = {
  DINE_IN:  '🍽️ 內用',
  TAKEOUT:  '🥡 外帶',
  DELIVERY: '🛵 外送',
}

function SalesPage() {
  const [filterStatus, setFilterStatus] = useState<SalesOrder['status'] | 'ALL'>('ALL')
  // 一次只渲染 PAGE_SIZE 筆，按「顯示更多」再往下載入。
  // 原本一次渲染全部訂單，資料累積到上百筆後頁面會又長又慢（線上 Demo 有 800 多筆時特別明顯）
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
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
  // 新的訂單排在最上面：櫃台最常處理的是剛進來的單
  const filtered = (filterStatus === 'ALL'
    ? orders
    : orders.filter(o => o.status === filterStatus)
  ).toSorted((a, b) => b.createdAt.localeCompare(a.createdAt))
  const visible = filtered.slice(0, visibleCount)

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
    return <div style={{ padding: '40px', textAlign: 'center', color: '#6B7480' }}>載入銷售資料中...</div>
  }

  return (
    <div>
      {/* ── 頁首 ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 700, letterSpacing: '-0.01em', color: '#1B2532' }}>銷售管理</h2>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#6B7480' }}>
            共 {filtered.length} 筆訂單
            {pendingCount > 0 && (
              <span style={{ marginLeft: '12px', color: '#B45309', fontWeight: 500 }}>
                🔔 {pendingCount} 筆待出餐
              </span>
            )}
            {preparingCount > 0 && (
              <span style={{ marginLeft: '12px', color: '#2B5287', fontWeight: 500 }}>
                👨‍🍳 {preparingCount} 筆準備中
              </span>
            )}
            <span style={{ marginLeft: '12px', color: '#047857', fontWeight: 500 }}>
              💰 今日營收 NT$ {todayRevenue.toLocaleString()}
            </span>
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          style={{
            background: '#1F3F6B', color: '#fff', border: 'none',
            borderRadius: '8px', padding: '10px 20px', fontSize: '14px', cursor: 'pointer',
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
            onClick={() => { setFilterStatus(status); setVisibleCount(PAGE_SIZE) }}
            aria-pressed={filterStatus === status}
            style={{
              padding: '6px 16px', borderRadius: '999px', fontSize: '13px',
              border: '1px solid', cursor: 'pointer',
              borderColor: filterStatus === status ? '#1F3F6B' : '#E4E8EE',
              background: filterStatus === status ? '#EEF3F9' : '#fff',
              color: filterStatus === status ? '#1F3F6B' : '#6B7480',
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
            background: '#fff', borderRadius: '12px', border: '1px solid #E4E8EE',
            padding: '40px', textAlign: 'center', color: '#8A93A0',
          }}>
            沒有符合條件的訂單
          </div>
        ) : (
          visible.map(order => {
            const config = STATUS_CONFIG[order.status]
            const canPrepare  = order.status === 'PENDING'
            const canComplete = order.status === 'PREPARING'
            const canCancel   = order.status === 'PENDING'
            const canRefund   = order.status === 'COMPLETED'

            return (
              <div key={order.id} style={{
                background: '#fff', borderRadius: '12px',
                border: '1px solid #E4E8EE', padding: '20px',
              }}>
                {/* 訂單標題列 */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                      <span style={{ fontSize: '13px', color: '#6B7480' }}>
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
                    <div style={{ fontSize: '12px', color: '#8A93A0' }}>
                      {new Date(order.createdAt).toLocaleString('zh-TW')}
                    </div>
                  </div>
                  {/* 金額區塊 */}
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '18px', fontWeight: 700, color: '#1E3A5F' }}>
                      NT$ {order.total.toLocaleString()}
                    </div>
                    <div style={{ fontSize: '11px', color: '#8A93A0' }}>
                      小計 {order.subtotal} ＋ 稅 {order.taxAmount}
                      {order.discount > 0 && ` － 折扣 ${order.discount}`}
                    </div>
                  </div>
                </div>

                {/* 訂單明細 */}
                <div style={{
                  background: '#F5F7FA', borderRadius: '8px',
                  padding: '12px', marginBottom: '12px',
                }}>
                  {order.items.map((item, idx) => (
                    <div key={idx} style={{
                      display: 'flex', justifyContent: 'space-between',
                      fontSize: '13px', color: '#4A5565', padding: '4px 0',
                      borderBottom: idx < order.items.length - 1 ? '1px solid #E4E8EE' : 'none',
                    }}>
                      <span>{productMap.get(item.productId) ?? item.productId}</span>
                      {/* Week 3 優化：改成商品名稱，同 PurchasePage 的 ingredientMap 做法 */}
                      <span>{item.quantity} 份 × NT$ {item.unitPrice} = NT$ {(item.quantity * item.unitPrice).toLocaleString()}</span>
                    </div>
                  ))}
                </div>

                {/* 備註 */}
                {order.note && (
                  <p style={{ fontSize: '13px', color: '#6B7480', margin: '0 0 12px' }}>
                    備註：{order.note}
                  </p>
                )}

                {/* 操作按鈕 */}
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  {canPrepare && (
                    <button onClick={() => handlePrepare(order)} style={btnStyle('#2B5287', '#D9E4F1')}>
                      👨‍🍳 開始備餐
                    </button>
                  )}
                  {canComplete && (
                    <button
                      onClick={() => handleComplete(order)}
                      disabled={isCompleting}
                      style={btnStyle('#047857', '#D1FAE5')}
                    >
                      {isCompleting ? '處理中...' : '✓ 出餐完成'}
                    </button>
                  )}
                  {canCancel && (
                    <button onClick={() => handleCancel(order)} style={btnStyle('#E11D48', '#FFE4E6')}>
                      ✕ 取消
                    </button>
                  )}
                  {canRefund && (
                    <button onClick={() => handleRefund(order)} style={btnStyle('#6B7480', '#EEF1F5')}>
                      退款
                    </button>
                  )}
                </div>
              </div>
            )
          })
        )}
        {filtered.length > visibleCount && (
          <button
            type="button"
            onClick={() => setVisibleCount(c => c + PAGE_SIZE)}
            style={{
              alignSelf: 'center', padding: '8px 20px', fontSize: '13px', fontWeight: 500,
              border: '1px solid #E4E8EE', borderRadius: '8px', background: '#fff',
              color: '#1F3F6B', cursor: 'pointer',
            }}
          >
            顯示更多（已顯示 {visible.length} / {filtered.length} 筆）
          </button>
        )}
      </div>

      {/* ── Modal ── */}
      {modalOpen && <SalesFormModal onClose={() => setModalOpen(false)} />}
    </div>
  )
}

const PAGE_SIZE = 20

function btnStyle(color: string, bg: string): React.CSSProperties {
  return {
    padding: '6px 16px', fontSize: '13px',
    border: `1px solid ${color}`, borderRadius: '8px',
    background: bg, color, cursor: 'pointer', fontWeight: 500,
  }
}

export default SalesPage