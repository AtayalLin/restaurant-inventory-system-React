import { useState, useMemo } from 'react'
// useState：管理「搜尋關鍵字」、「選中的分類篩選」、「Modal 開關與編輯目標」等 UI 狀態
// useMemo：當商品列表或搜尋條件變動時，才重新計算篩選結果，避免每次 render 都重算

import { useProducts, useProductCategories, useDeleteProduct } from '../../hooks/useProducts'
// 關聯：src/hooks/useProducts.ts
// 這三個 hook 封裝了所有 API 呼叫邏輯，頁面元件只負責顯示與互動

import ProductFormModal from './ProductFormModal'
// 關聯：src/pages/products/ProductFormModal.tsx（下一步建立）
// 新增與編輯共用同一個 Modal，透過傳入 product 是否為 null 來區分模式

import type { Product } from '../../types'
// 關聯：src/types/index.ts
// Product 型別：{ id, name, categoryId, price, taxType, description, imageUrl, recipe, isActive, createdAt }

// ── 稅率顯示對照表 ──────────────────────────────────────────
// 為什麼這樣寫：TaxType 是 enum 字串，UI 要顯示人看得懂的文字
// 集中在這裡定義，改動時只需改一處
const TAX_LABEL: Record<string, string> = {
  TAX_5:    '含稅 5%',
  TAX_10:   '含稅 10%',
  TAX_FREE: '免稅',
}

function ProductsPage() {
  // ── UI 狀態 ──────────────────────────────────────────────
  const [search, setSearch] = useState('')
  // search：搜尋關鍵字，對應商品名稱的模糊搜尋
  // 為什麼用 useState 不用 URL query：這是暫時的 UI 狀態，不需要分享連結

  const [filterCategory, setFilterCategory] = useState('')
  // filterCategory：選中的分類 id，空字串代表「全部」

  const [modalOpen, setModalOpen] = useState(false)
  // modalOpen：控制 ProductFormModal 顯示/隱藏

  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  // editingProduct：
  //   null  → 開啟新增模式
  //   Product → 開啟編輯模式，並把資料帶入表單
  // 型別是 Product | null，對應 types/index.ts 的 Product 介面

  // ── 資料取得 ─────────────────────────────────────────────
  const { data: products = [], isLoading: productsLoading } = useProducts()
  // products 預設給 []，避免 isLoading 期間 map() 出錯
  // 關聯：useProducts() 打 GET /api/products → json-server → db.json

  const { data: categories = [] } = useProductCategories()
  // 關聯：useProductCategories() 打 GET /api/productCategories

  const { mutate: deleteProduct } = useDeleteProduct()
  // mutate 是觸發 mutation 的函式，命名為 deleteProduct 更語意化
  // 關聯：useDeleteProduct() 打 DELETE /api/products/:id

  // ── 分類 id → 名稱 的查找表 ─────────────────────────────
  // 為什麼用 Map 不用 find()：
  //   find() 每次查找是 O(n)，Map 是 O(1)
  //   商品列表每列都要查分類名稱，用 Map 效能更好
  const categoryMap = useMemo(() => {
    return new Map(categories.map(c => [c.id, c.name]))
    // 結果範例：Map { 'cat001' => '主食', 'cat002' => '飲料' }
  }, [categories])

  // ── 前端篩選邏輯 ──────────────────────────────────────────
  // 為什麼用 useMemo：
  //   products 或搜尋條件變動才重新計算
  //   避免每次 re-render 都重跑 filter（商品多時有感）
  const filtered = useMemo(() => {
    return products.filter(p => {
      const matchName = p.name.includes(search)
      // 名稱模糊搜尋，includes() 區分大小寫但中文夠用

      const matchCategory = filterCategory === '' || p.categoryId === filterCategory
      // 空字串代表「不篩選分類」

      return matchName && matchCategory
    })
  }, [products, search, filterCategory])

  // ── 事件處理 ──────────────────────────────────────────────
  function handleAdd() {
    setEditingProduct(null)   // null → Modal 進入新增模式
    setModalOpen(true)
  }

  function handleEdit(product: Product) {
    setEditingProduct(product) // 傳入商品資料 → Modal 進入編輯模式
    setModalOpen(true)
  }

  function handleDelete(product: Product) {
    // 為什麼用 window.confirm：
    //   目前階段先用瀏覽器原生 confirm，夠用且不需要額外元件
    //   之後可換成自訂 ConfirmModal（Week 3 UI 細節優化）
    if (!window.confirm(`確定刪除「${product.name}」？此操作無法復原。`)) return
    deleteProduct(product.id)
    // deleteProduct 成功後 useDeleteProduct 的 onSuccess 會自動刷新列表
  }

  function handleModalClose() {
    setModalOpen(false)
    setEditingProduct(null)   // 關閉時清除，避免下次開啟帶到舊資料
  }

  // ── 載入中狀態 ────────────────────────────────────────────
  if (productsLoading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#6B7280' }}>
        載入商品資料中...
      </div>
    )
  }

  // ── 畫面渲染 ──────────────────────────────────────────────
  return (
    <div>
      {/* ── 頁首：標題 + 新增按鈕 ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '20px', color: '#1E3A5F' }}>商品列表</h2>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#6B7280' }}>
            共 {filtered.length} 筆商品
          </p>
        </div>
        <button
          onClick={handleAdd}
          style={{
            background: '#1E40AF',  // 強調色：對應設計系統的按鈕主色
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            padding: '10px 20px',
            fontSize: '14px',
            cursor: 'pointer',
          }}
        >
          ＋ 新增商品
        </button>
      </div>

      {/* ── 搜尋 + 篩選列 ── */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
        <input
          type="text"
          placeholder="搜尋商品名稱..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          // onChange 每次輸入都更新 search，useMemo 自動重算 filtered
          style={{
            flex: 1,
            padding: '8px 12px',
            border: '1px solid #E5E7EB',
            borderRadius: '6px',
            fontSize: '14px',
            outline: 'none',
          }}
        />
        <select
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value)}
          // 選擇分類 → filterCategory 更新 → useMemo 重算 filtered
          style={{
            padding: '8px 12px',
            border: '1px solid #E5E7EB',
            borderRadius: '6px',
            fontSize: '14px',
            background: '#fff',
            cursor: 'pointer',
          }}
        >
          <option value="">全部分類</option>
          {categories.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* ── 商品表格 ── */}
      <div style={{
        background: '#fff',
        borderRadius: '8px',
        border: '1px solid #E5E7EB',
        overflow: 'hidden',   // 讓圓角套用到表格
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E5E7EB' }}>
              {['商品名稱', '分類', '售價', '稅別', '狀態', '操作'].map(h => (
                <th key={h} style={{
                  padding: '12px 16px',
                  textAlign: 'left',
                  fontSize: '13px',
                  color: '#6B7280',
                  fontWeight: 500,
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              // 空狀態：搜尋無結果或資料庫沒有商品
              <tr>
                <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#9CA3AF' }}>
                  沒有符合條件的商品
                </td>
              </tr>
            ) : (
              filtered.map((product, index) => (
                <tr
                  key={product.id}
                  style={{
                    borderBottom: index < filtered.length - 1 ? '1px solid #E5E7EB' : 'none',
                    // 最後一列不加底線，視覺更乾淨
                  }}
                >
                  {/* 商品名稱 */}
                  <td style={{ padding: '14px 16px', fontSize: '14px', fontWeight: 500, color: '#111827' }}>
                    {product.name}
                  </td>

                  {/* 分類：從 categoryMap 查 id 對應的名稱 */}
                  <td style={{ padding: '14px 16px', fontSize: '14px', color: '#374151' }}>
                    {categoryMap.get(product.categoryId) ?? '—'}
                    {/* ?? '—'：查不到分類時顯示破折號，避免顯示 undefined */}
                  </td>

                  {/* 售價 */}
                  <td style={{ padding: '14px 16px', fontSize: '14px', color: '#374151' }}>
                    NT$ {product.price.toLocaleString()}
                    {/* toLocaleString()：數字加千分位，例如 1000 → 1,000 */}
                  </td>

                  {/* 稅別 */}
                  <td style={{ padding: '14px 16px', fontSize: '13px', color: '#6B7280' }}>
                    {TAX_LABEL[product.taxType] ?? product.taxType}
                  </td>

                  {/* 狀態 Badge */}
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '2px 10px',
                      borderRadius: '999px',   // 膠囊形狀
                      fontSize: '12px',
                      fontWeight: 500,
                      // isActive 為 true → 綠色（正常販售）；false → 灰色（已下架）
                      background: product.isActive ? '#DCFCE7' : '#F3F4F6',
                      color: product.isActive ? '#16A34A' : '#6B7280',
                    }}>
                      {product.isActive ? '販售中' : '已下架'}
                    </span>
                  </td>

                  {/* 操作按鈕 */}
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => handleEdit(product)}
                        style={{
                          padding: '4px 12px',
                          fontSize: '13px',
                          border: '1px solid #E5E7EB',
                          borderRadius: '4px',
                          background: '#fff',
                          cursor: 'pointer',
                          color: '#374151',
                        }}
                      >
                        編輯
                      </button>
                      <button
                        onClick={() => handleDelete(product)}
                        style={{
                          padding: '4px 12px',
                          fontSize: '13px',
                          border: '1px solid #FCA5A5',
                          borderRadius: '4px',
                          background: '#fff',
                          cursor: 'pointer',
                          color: '#DC2626',  // 危險色：對應設計系統
                        }}
                      >
                        刪除
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── 新增/編輯 Modal ── */}
      {/* modalOpen 為 true 才 render，節省不必要的 DOM */}
      {modalOpen && (
        <ProductFormModal
          product={editingProduct}
          // product=null → 新增模式；product=Product → 編輯模式
          // 關聯：ProductFormModal 用這個 prop 決定表單初始值和 API 動作
          onClose={handleModalClose}
        />
      )}
    </div>
  )
}

export default ProductsPage