// 菜單商品管理頁面 - 對應路由 /products
// 負責：商品列表、搜尋／分類篩選、開啟新增或編輯 Modal、刪除商品
// 樣式改用 src/components/ui 的共用元件，與儀表板一致
import { useState, useMemo } from 'react'
import { Plus, Search, UtensilsCrossed, Pencil, Trash2 } from 'lucide-react'
import { useProducts, useProductCategories, useDeleteProduct } from '../../hooks/useProducts'
import ProductFormModal from './ProductFormModal'
import {
  Badge, Button, DataTable, EmptyRow, EmptyState, PageHeader, TableSkeleton,
  inputClass, useToast, errorMessage,
} from '../../components/ui'
import { formatCurrency } from '../../lib/format'
import type { Product } from '../../types'

const TAX_LABEL: Record<Product['taxType'], string> = {
  TAX_5: '含稅 5%',
  TAX_10: '含稅 10%',
  TAX_FREE: '免稅',
}

function ProductsPage() {
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  // undefined = Modal 關閉；null = 新增模式；Product = 編輯模式（一個狀態表達三種情況）
  const [editing, setEditing] = useState<Product | null | undefined>(undefined)

  const { data: products = [], isLoading } = useProducts()
  const { data: categories = [] } = useProductCategories()
  const { mutate: deleteProduct } = useDeleteProduct()
  const toast = useToast()

  // 分類 id → 名稱的查找表，表格每列都要用，先建好避免重複 find
  const categoryMap = useMemo(() => new Map(categories.map(c => [c.id, c.name])), [categories])

  const filtered = useMemo(() => {
    const keyword = search.trim()
    return products.filter(p =>
      p.name.includes(keyword) && (filterCategory === '' || p.categoryId === filterCategory))
  }, [products, search, filterCategory])

  function handleDelete(product: Product) {
    if (!window.confirm(`確定刪除「${product.name}」？此操作無法復原。`)) return
    deleteProduct(product.id, {
      onSuccess: () => toast.success(`已刪除「${product.name}」`),
      onError: err => toast.error(errorMessage(err, '刪除失敗，請稍後再試')),
    })
  }

  if (isLoading) return <TableSkeleton />

  const addButton = (
    <Button icon={<Plus size={16} aria-hidden="true" />} onClick={() => setEditing(null)}>新增商品</Button>
  )

  return (
    <div className="mx-auto max-w-[1400px]">
      <PageHeader title="商品列表" description={`共 ${filtered.length} 筆商品`} action={addButton} />

      {products.length === 0 ? (
        // 完全沒有商品：引導建立第一筆，而不是顯示空表格
        <EmptyState
          className="bg-white"
          icon={<UtensilsCrossed size={20} />}
          title="還沒有任何商品"
          description="建立菜單商品後，就能設定配方、建立銷售訂單並自動扣庫存。"
          action={addButton}
        />
      ) : (
        <>
          {/* 搜尋與篩選 */}
          <div className="mb-4 flex flex-col gap-3 sm:flex-row">
            <label className="relative flex-1">
              <span className="sr-only">搜尋商品名稱</span>
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" aria-hidden="true" />
              <input
                type="search"
                placeholder="搜尋商品名稱…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className={`${inputClass()} pl-9`}
              />
            </label>
            <label className="sm:w-44">
              <span className="sr-only">依分類篩選</span>
              <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className={inputClass()}>
                <option value="">全部分類</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
          </div>

          <DataTable headers={['商品名稱', '分類', '售價', '稅別', '狀態', '操作']}>
            {filtered.length === 0 ? (
              <EmptyRow colSpan={6}>沒有符合條件的商品</EmptyRow>
            ) : (
              filtered.map(product => (
                <tr key={product.id} className="hover:bg-canvas/60">
                  <td className="px-4 py-3.5 font-medium text-ink">{product.name}</td>
                  <td className="px-4 py-3.5 text-ink-2">{categoryMap.get(product.categoryId) ?? '—'}</td>
                  <td className="tabular px-4 py-3.5 text-ink-2">{formatCurrency(product.price)}</td>
                  <td className="px-4 py-3.5 text-[13px] text-ink-3">{TAX_LABEL[product.taxType] ?? product.taxType}</td>
                  <td className="px-4 py-3.5">
                    <Badge tone={product.isActive ? 'success' : 'neutral'}>{product.isActive ? '販售中' : '已下架'}</Badge>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex gap-2">
                      <Button variant="secondary" size="sm" icon={<Pencil size={13} aria-hidden="true" />}
                        onClick={() => setEditing(product)} aria-label={`編輯 ${product.name}`}>
                        編輯
                      </Button>
                      <Button variant="danger" size="sm" icon={<Trash2 size={13} aria-hidden="true" />}
                        onClick={() => handleDelete(product)} aria-label={`刪除 ${product.name}`}>
                        刪除
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </DataTable>
        </>
      )}

      {editing !== undefined && (
        <ProductFormModal product={editing} onClose={() => setEditing(undefined)} />
      )}
    </div>
  )
}

export default ProductsPage
