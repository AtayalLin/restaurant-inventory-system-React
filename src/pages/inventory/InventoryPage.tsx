import { useState, useMemo } from 'react'
// useState：管理搜尋關鍵字、分類篩選、Modal 開關與編輯目標等 UI 狀態
// useMemo：篩選結果、分類選項、供應商 Map 只在依賴變動時重新計算

import { useIngredients, useSuppliers, useDeleteIngredient } from '../../hooks/useIngredients'
// 關聯：src/hooks/useIngredients.ts
// useIngredients：GET /api/ingredients → 食材列表
// useSuppliers：GET /api/suppliers → 供應商列表（用於顯示供應商名稱）
// useDeleteIngredient：DELETE /api/ingredients/:id

import IngredientFormModal from './IngredientFormModal'
// 關聯：src/pages/inventory/IngredientFormModal.tsx（下一步建立）
// 新增與編輯共用同一個 Modal

import type { Ingredient } from '../../types'
// 關聯：src/types/index.ts
// Ingredient：{ id, name, unit, category, supplierId, currentStock,
//              safetyStock, expiryDays, costPerUnit, createdAt }

// ── 庫存狀態判斷函式 ──────────────────────────────────────
// 為什麼抽成函式：列表每列都需要判斷，抽出來避免重複邏輯
// 回傳值用於決定 Badge 的顏色和文字
function getStockStatus(ingredient: Ingredient): {
  label: string
  color: string
  bg: string
} {
  if (ingredient.currentStock <= 0) {
    return { label: '已缺貨', color: '#DC2626', bg: '#FEE2E2' }
    // 危險色：庫存歸零，需要緊急補貨
  }
  if (ingredient.currentStock < ingredient.safetyStock) {
    return { label: '庫存不足', color: '#D97706', bg: '#FEF3C7' }
    // 警告色：低於安全庫存量，需要注意
  }
  return { label: '庫存正常', color: '#16A34A', bg: '#DCFCE7' }
  // 成功色：庫存充足
}

// ── 效期狀態判斷函式 ──────────────────────────────────────
// expiryDays 是「保存天數」，不是「到期日期」
// 這裡用來判斷是否需要顯示效期警示
// 注意：這個判斷是顯示「這種食材通常幾天會過期」的警示
//       精確的「某批食材的到期日」需要進貨時記錄，Week 3 再做
function getExpiryWarning(expiryDays: number | null): string | null {
  if (expiryDays === null) return null
  // null 代表無效期限制（如鹽、糖等乾貨），不顯示警示

  if (expiryDays <= 3) return '極短效期'
  // 3 天以內：生鮮肉品等，需要特別注意

  if (expiryDays <= 7) return '短效期'
  // 7 天以內：對應文件的「7 天內到期顯示預警」設定

  return null
  // 7 天以上：不顯示效期警示
}

function InventoryPage() {
  // ── UI 狀態 ──────────────────────────────────────────────
  const [search, setSearch] = useState('')
  // 搜尋關鍵字，對應食材名稱的模糊搜尋

  const [filterCategory, setFilterCategory] = useState('')
  // 選中的分類，空字串代表「全部」
  // 為什麼不用外鍵 id：食材分類是自由字串，直接用字串篩選

  const [filterStatus, setFilterStatus] = useState<'all' | 'low' | 'normal'>('all')
  // 庫存狀態篩選：all=全部, low=庫存不足, normal=正常
  // 為什麼用 union type 而不是 string：限制只能是這三個值，TypeScript 會報錯防呆

  const [modalOpen, setModalOpen] = useState(false)
  const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(null)
  // null → 新增模式；Ingredient → 編輯模式

  // ── 資料取得 ─────────────────────────────────────────────
  const { data: ingredients = [], isLoading } = useIngredients()
  // ingredients 預設 []，避免 isLoading 期間 .map() 出錯

  const { data: suppliers = [] } = useSuppliers()
  // 供應商列表，用於建立 id→名稱 的查找 Map

  const { mutate: deleteIngredient } = useDeleteIngredient()

  // ── 供應商 id → 名稱 查找表 ──────────────────────────────
  const supplierMap = useMemo(() => {
    return new Map(suppliers.map(s => [s.id, s.name]))
    // 結果範例：Map { 's001' => '台灣生鮮肉品行', 's002' => '南北乾貨批發' }
    // 為什麼用 Map 不用 find()：Map 查找是 O(1)，find() 是 O(n)
  }, [suppliers])

  // ── 動態產生分類選項 ──────────────────────────────────────
  // 為什麼動態產生而不是硬編碼：
  //   食材分類是自由字串，新增食材時可以填任意分類
  //   動態從現有食材資料去重產生，永遠和實際資料同步
  const categories = useMemo(() => {
    const set = new Set(ingredients.map(i => i.category))
    // Set 自動去重：同一個分類只出現一次
    return Array.from(set).sort()
    // sort()：字母順序排列，讓下拉選單更好找
  }, [ingredients])

  // ── 前端篩選邏輯 ──────────────────────────────────────────
  const filtered = useMemo(() => {
    return ingredients.filter(i => {
      const matchName = i.name.includes(search)

      const matchCategory = filterCategory === '' || i.category === filterCategory

      const matchStatus = filterStatus === 'all'
        ? true
        : filterStatus === 'low'
          ? i.currentStock < i.safetyStock   // 庫存不足條件
          : i.currentStock >= i.safetyStock  // 庫存正常條件

      return matchName && matchCategory && matchStatus
    })
  }, [ingredients, search, filterCategory, filterStatus])

  // ── 統計數字（儀表板 KPI 用） ─────────────────────────────
  const lowStockCount = useMemo(() =>
    ingredients.filter(i => i.currentStock < i.safetyStock).length,
    [ingredients]
  )
  // 低庫存數量：顯示在頁首，讓老闆一眼看到有幾樣食材需要補貨

  // ── 事件處理 ──────────────────────────────────────────────
  function handleAdd() {
    setEditingIngredient(null)
    setModalOpen(true)
  }

  function handleEdit(ingredient: Ingredient) {
    setEditingIngredient(ingredient)
    setModalOpen(true)
  }

  function handleDelete(ingredient: Ingredient) {
    if (!window.confirm(`確定刪除「${ingredient.name}」？此操作無法復原。`)) return
    deleteIngredient(ingredient.id)
  }

  function handleModalClose() {
    setModalOpen(false)
    setEditingIngredient(null)
  }

  // ── 載入中狀態 ────────────────────────────────────────────
  if (isLoading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#6B7280' }}>
        載入食材資料中...
      </div>
    )
  }

  // ── 畫面渲染 ──────────────────────────────────────────────
  return (
    <div>
      {/* ── 頁首 ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '20px', color: '#1E3A5F' }}>食材庫存管理</h2>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#6B7280' }}>
            共 {filtered.length} 筆食材
            {lowStockCount > 0 && (
              <span style={{ marginLeft: '12px', color: '#D97706', fontWeight: 500 }}>
                ⚠️ {lowStockCount} 樣食材庫存不足
              </span>
            )}
          </p>
        </div>
        <button
          onClick={handleAdd}
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
          ＋ 新增食材
        </button>
      </div>

      {/* ── 搜尋 + 篩選列 ── */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="搜尋食材名稱..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            flex: 1,
            minWidth: '200px',
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
          style={selectStyle}
        >
          <option value="">全部分類</option>
          {categories.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value as 'all' | 'low' | 'normal')}
          // as 型別斷言：select 的 value 是 string，斷言成 union type 讓 TypeScript 認可
          style={selectStyle}
        >
          <option value="all">全部狀態</option>
          <option value="low">庫存不足</option>
          <option value="normal">庫存正常</option>
        </select>
      </div>

      {/* ── 食材表格 ── */}
      <div style={{
        background: '#fff',
        borderRadius: '8px',
        border: '1px solid #E5E7EB',
        overflow: 'hidden',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E5E7EB' }}>
              {['食材名稱', '分類', '現有庫存', '安全庫存', '供應商', '效期', '庫存狀態', '操作'].map(h => (
                <th key={h} style={{
                  padding: '12px 16px',
                  textAlign: 'left',
                  fontSize: '13px',
                  color: '#6B7280',
                  fontWeight: 500,
                  whiteSpace: 'nowrap',
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#9CA3AF' }}>
                  沒有符合條件的食材
                </td>
              </tr>
            ) : (
              filtered.map((ingredient, index) => {
                const status = getStockStatus(ingredient)
                const expiryWarning = getExpiryWarning(ingredient.expiryDays)
                // 每列計算一次狀態和效期警示，避免在 JSX 裡寫複雜邏輯

                return (
                  <tr
                    key={ingredient.id}
                    style={{
                      borderBottom: index < filtered.length - 1 ? '1px solid #E5E7EB' : 'none',
                      background: ingredient.currentStock < ingredient.safetyStock
                        ? 'rgba(251, 191, 36, 0.03)'
                        : 'transparent',
                      // 庫存不足時列背景加淡黃色，整列一眼識別
                    }}
                  >
                    {/* 食材名稱 */}
                    <td style={{ padding: '14px 16px', fontSize: '14px', fontWeight: 500, color: '#111827' }}>
                      {ingredient.name}
                    </td>

                    {/* 分類 */}
                    <td style={{ padding: '14px 16px', fontSize: '14px', color: '#374151' }}>
                      {ingredient.category}
                    </td>

                    {/* 現有庫存：低於安全庫存時數字變橙色 */}
                    <td style={{
                      padding: '14px 16px',
                      fontSize: '14px',
                      fontWeight: 500,
                      color: ingredient.currentStock < ingredient.safetyStock ? '#D97706' : '#111827',
                    }}>
                      {ingredient.currentStock.toLocaleString()} {ingredient.unit}
                    </td>

                    {/* 安全庫存 */}
                    <td style={{ padding: '14px 16px', fontSize: '14px', color: '#6B7280' }}>
                      {ingredient.safetyStock.toLocaleString()} {ingredient.unit}
                    </td>

                    {/* 供應商：從 supplierMap 查 id 對應的名稱 */}
                    <td style={{ padding: '14px 16px', fontSize: '14px', color: '#374151' }}>
                      {ingredient.supplierId
                        ? supplierMap.get(ingredient.supplierId) ?? '—'
                        : '—'
                      }
                      {/* supplierId 為 null 時顯示破折號 */}
                    </td>

                    {/* 效期 */}
                    <td style={{ padding: '14px 16px', fontSize: '13px' }}>
                      {ingredient.expiryDays === null ? (
                        <span style={{ color: '#9CA3AF' }}>無限制</span>
                      ) : (
                        <span style={{ color: expiryWarning ? '#DC2626' : '#374151' }}>
                          {ingredient.expiryDays} 天
                          {expiryWarning && ` (${expiryWarning})`}
                          {/* 短效期時顯示警示文字 */}
                        </span>
                      )}
                    </td>

                    {/* 庫存狀態 Badge */}
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '2px 10px',
                        borderRadius: '999px',
                        fontSize: '12px',
                        fontWeight: 500,
                        background: status.bg,
                        color: status.color,
                      }}>
                        {status.label}
                      </span>
                    </td>

                    {/* 操作按鈕 */}
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => handleEdit(ingredient)}
                          style={editBtnStyle}
                        >
                          編輯
                        </button>
                        <button
                          onClick={() => handleDelete(ingredient)}
                          style={deleteBtnStyle}
                        >
                          刪除
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── Modal ── */}
      {modalOpen && (
        <IngredientFormModal
          ingredient={editingIngredient}
          // ingredient=null → 新增模式；ingredient=Ingredient → 編輯模式
          onClose={handleModalClose}
        />
      )}
    </div>
  )
}

// ── 共用樣式 ──────────────────────────────────────────────────
const selectStyle: React.CSSProperties = {
  padding: '8px 12px',
  border: '1px solid #E5E7EB',
  borderRadius: '6px',
  fontSize: '14px',
  background: '#fff',
  cursor: 'pointer',
}

const editBtnStyle: React.CSSProperties = {
  padding: '4px 12px',
  fontSize: '13px',
  border: '1px solid #E5E7EB',
  borderRadius: '4px',
  background: '#fff',
  cursor: 'pointer',
  color: '#374151',
}

const deleteBtnStyle: React.CSSProperties = {
  padding: '4px 12px',
  fontSize: '13px',
  border: '1px solid #FCA5A5',
  borderRadius: '4px',
  background: '#fff',
  cursor: 'pointer',
  color: '#DC2626',
}

export default InventoryPage