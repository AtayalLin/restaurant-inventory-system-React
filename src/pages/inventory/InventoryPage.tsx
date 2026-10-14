// 食材庫存管理頁面 - 對應路由 /inventory
// 負責：食材列表、名稱／分類／庫存狀態篩選、新增或編輯 Modal、刪除食材
import { useState, useMemo } from 'react'
import { AlertTriangle, Package, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { useIngredients, useSuppliers, useDeleteIngredient } from '../../hooks/useIngredients'
import IngredientFormModal from './IngredientFormModal'
import {
  Badge, Button, DataTable, EmptyRow, EmptyState, PageHeader, TableSkeleton,
  inputClass, useToast, errorMessage, type Tone,
} from '../../components/ui'
import { useSession } from '../../session/SessionProvider'
import type { Ingredient } from '../../types'

type StatusFilter = 'all' | 'low' | 'normal'

/** 庫存狀態：缺貨 > 不足 > 正常，對應 Badge 顏色 */
function getStockStatus(ing: Ingredient): { label: string; tone: Tone } {
  if (ing.currentStock <= 0) return { label: '已缺貨', tone: 'danger' }
  if (ing.currentStock < ing.safetyStock) return { label: '庫存不足', tone: 'warning' }
  return { label: '庫存正常', tone: 'success' }
}

/** 效期提醒：3 天內極短、7 天內短；null 代表不會過期（例如調味料） */
function getExpiryWarning(expiryDays: number | null): string | null {
  if (expiryDays === null) return null
  if (expiryDays <= 3) return '極短效期'
  if (expiryDays <= 7) return '短效期'
  return null
}

const fmt = (n: number) => n.toLocaleString('zh-TW')

function InventoryPage() {
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterStatus, setFilterStatus] = useState<StatusFilter>('all')
  // undefined = Modal 關閉；null = 新增；Ingredient = 編輯
  const [editing, setEditing] = useState<Ingredient | null | undefined>(undefined)

  const { data: ingredients = [], isLoading } = useIngredients()
  const { data: suppliers = [] } = useSuppliers()
  const { mutate: deleteIngredient } = useDeleteIngredient()
  const toast = useToast()
  // 沒有編輯權限時隱藏新增、編輯、刪除（員工唯讀）
  const canEdit = useSession().can('inventory:edit')

  const supplierMap = useMemo(() => new Map(suppliers.map(s => [s.id, s.name])), [suppliers])

  // 分類選項從現有食材動態產生，新增食材時填了新分類就會自動出現
  const categories = useMemo(() => [...new Set(ingredients.map(i => i.category))].sort(), [ingredients])

  const filtered = useMemo(() => {
    const keyword = search.trim()
    return ingredients.filter(i => {
      const isLow = i.currentStock < i.safetyStock
      return i.name.includes(keyword)
        && (filterCategory === '' || i.category === filterCategory)
        && (filterStatus === 'all' || (filterStatus === 'low') === isLow)
    })
  }, [ingredients, search, filterCategory, filterStatus])

  const lowStockCount = useMemo(() => ingredients.filter(i => i.currentStock < i.safetyStock).length, [ingredients])

  function handleDelete(ing: Ingredient) {
    if (!window.confirm(`確定刪除「${ing.name}」？此操作無法復原。`)) return
    deleteIngredient(ing.id, {
      onSuccess: () => toast.success(`已刪除「${ing.name}」`),
      onError: err => toast.error(errorMessage(err, '刪除失敗，請稍後再試')),
    })
  }

  if (isLoading) return <TableSkeleton />

  const addButton = canEdit ? (
    <Button icon={<Plus size={16} aria-hidden="true" />} onClick={() => setEditing(null)}>新增食材</Button>
  ) : null

  return (
    <div className="mx-auto max-w-[1400px]">
      <PageHeader
        title="食材庫存管理"
        description={
          <>
            共 {filtered.length} 筆食材
            {lowStockCount > 0 && (
              <span className="ml-3 inline-flex items-center gap-1 align-middle font-medium text-amber-700">
                <AlertTriangle size={14} aria-hidden="true" />
                {lowStockCount} 樣食材庫存不足
              </span>
            )}
          </>
        }
        action={addButton}
      />

      {ingredients.length === 0 ? (
        <EmptyState
          className="bg-white"
          icon={<Package size={20} />}
          title="還沒有任何食材"
          description="建立食材並設定安全庫存，系統就能提醒低庫存並提供 AI 補貨建議。"
          action={addButton}
        />
      ) : (
        <>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row">
            <label className="relative flex-1">
              <span className="sr-only">搜尋食材名稱</span>
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" aria-hidden="true" />
              <input type="search" placeholder="搜尋食材名稱…" value={search}
                onChange={e => setSearch(e.target.value)} className={`${inputClass()} pl-9`} />
            </label>
            <label className="sm:w-40">
              <span className="sr-only">依分類篩選</span>
              <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className={inputClass()}>
                <option value="">全部分類</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label className="sm:w-40">
              <span className="sr-only">依庫存狀態篩選</span>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as StatusFilter)} className={inputClass()}>
                <option value="all">全部狀態</option>
                <option value="low">庫存不足</option>
                <option value="normal">庫存正常</option>
              </select>
            </label>
          </div>

          <DataTable minWidth={880} headers={['食材名稱', '分類', '現有庫存', '安全庫存', '供應商', '效期', '庫存狀態', ...(canEdit ? ['操作'] : [])]}>
            {filtered.length === 0 ? (
              <EmptyRow colSpan={canEdit ? 8 : 7}>沒有符合條件的食材</EmptyRow>
            ) : (
              filtered.map(ing => {
                const status = getStockStatus(ing)
                const expiryWarning = getExpiryWarning(ing.expiryDays)
                const isLow = status.tone !== 'success'
                return (
                  // 庫存不足的列加淡黃底，掃一眼就找得到
                  <tr key={ing.id} className={isLow ? 'bg-amber-50/40' : 'hover:bg-canvas/60'}>
                    <td className="px-4 py-3.5 font-medium text-ink">{ing.name}</td>
                    <td className="px-4 py-3.5 text-ink-2">{ing.category}</td>
                    <td className={`tabular px-4 py-3.5 ${isLow ? 'font-semibold text-amber-700' : 'text-ink'}`}>
                      {fmt(ing.currentStock)} {ing.unit}
                    </td>
                    <td className="tabular px-4 py-3.5 text-ink-3">{fmt(ing.safetyStock)} {ing.unit}</td>
                    <td className="px-4 py-3.5 text-ink-2">{(ing.supplierId && supplierMap.get(ing.supplierId)) || '—'}</td>
                    <td className="px-4 py-3.5 text-[13px]">
                      {ing.expiryDays === null
                        ? <span className="text-ink-3">無限制</span>
                        : <span className={expiryWarning ? 'text-rose-600' : 'text-ink-2'}>
                            {ing.expiryDays} 天{expiryWarning && `（${expiryWarning}）`}
                          </span>}
                    </td>
                    <td className="px-4 py-3.5"><Badge tone={status.tone}>{status.label}</Badge></td>
                    {canEdit && (
                      <td className="px-4 py-3.5">
                        <div className="flex gap-2">
                          <Button variant="secondary" size="sm" icon={<Pencil size={13} aria-hidden="true" />}
                            onClick={() => setEditing(ing)} aria-label={`編輯 ${ing.name}`}>編輯</Button>
                          <Button variant="danger" size="sm" icon={<Trash2 size={13} aria-hidden="true" />}
                            onClick={() => handleDelete(ing)} aria-label={`刪除 ${ing.name}`}>刪除</Button>
                        </div>
                      </td>
                    )}
                  </tr>
                )
              })
            )}
          </DataTable>
        </>
      )}

      {editing !== undefined && <IngredientFormModal ingredient={editing} onClose={() => setEditing(undefined)} />}
    </div>
  )
}

export default InventoryPage
