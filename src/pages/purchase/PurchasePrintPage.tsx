// 採購單列印頁 - 對應路由 /purchase/:id/print
// 版面以 A4 直式為準，列印時隱藏操作按鈕；可以直接列印給供應商或存成 PDF
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Printer } from 'lucide-react'
import { usePurchaseOrders } from '../../hooks/usePurchaseOrders'
import { useIngredients, useSuppliers } from '../../hooks/useIngredients'
import { Button, TableSkeleton } from '../../components/ui'
import { formatCurrency } from '../../lib/format'

const STATUS_LABEL = { PENDING: '待確認', ORDERED: '已下單', RECEIVED: '已收貨', CANCELLED: '已取消' } as const
const date = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('zh-TW') : '—')

function PurchasePrintPage() {
  const { id } = useParams()
  const { data: orders = [], isLoading } = usePurchaseOrders()
  const { data: suppliers = [] } = useSuppliers()
  const { data: ingredients = [] } = useIngredients()

  if (isLoading) return <TableSkeleton />
  const order = orders.find(o => o.id === id)
  if (!order) return <p className="p-10 text-center text-ink-3">找不到這張採購單</p>
  const supplier = suppliers.find(s => s.id === order.supplierId)

  return (
    <div className="mx-auto max-w-[800px]">
      {/* 操作列：列印時隱藏 */}
      <div className="mb-4 flex justify-between print:hidden">
        <Link to="/purchase" className="inline-flex items-center gap-1 text-sm text-ink-2 hover:text-ink">
          <ArrowLeft size={16} aria-hidden="true" />回採購進貨
        </Link>
        <Button icon={<Printer size={16} aria-hidden="true" />} onClick={() => window.print()}>列印／存成 PDF</Button>
      </div>

      <article className="rounded-[var(--radius-card)] border border-line bg-white p-8 text-sm text-ink print:border-0 print:p-0 print:shadow-none">
        <header className="mb-6 flex items-start justify-between border-b-2 border-ink pb-4">
          <div>
            <h1 className="text-2xl font-bold tracking-wide">採購單</h1>
            <p className="mt-1 text-xs text-ink-3">智慧餐飲進銷存管理系統</p>
          </div>
          <dl className="grid grid-cols-[auto_auto] gap-x-3 gap-y-1 text-right text-xs">
            <dt className="text-ink-3">單號</dt><dd className="font-mono">{order.id}</dd>
            <dt className="text-ink-3">狀態</dt><dd>{STATUS_LABEL[order.status]}</dd>
            <dt className="text-ink-3">建立日期</dt><dd>{date(order.createdAt)}</dd>
            <dt className="text-ink-3">預計到貨</dt><dd>{date(order.expectedDate)}</dd>
          </dl>
        </header>

        <section className="mb-6">
          <h2 className="mb-2 text-xs font-semibold text-ink-3">供應商</h2>
          <p className="text-base font-semibold">{supplier?.name ?? order.supplierId}</p>
          {supplier && (
            <p className="mt-1 text-ink-2">聯絡人 {supplier.contact}・電話 {supplier.phone}・付款條件 {supplier.paymentTerm}</p>
          )}
        </section>

        <table className="mb-4 w-full border-collapse">
          <thead>
            <tr className="border-b border-ink text-left text-xs text-ink-3">
              <th scope="col" className="py-2">#</th>
              <th scope="col" className="py-2">品項</th>
              <th scope="col" className="py-2 text-right">數量</th>
              <th scope="col" className="py-2 text-right">單價</th>
              <th scope="col" className="py-2 text-right">小計</th>
            </tr>
          </thead>
          <tbody className="tabular">
            {order.items.map((item, idx) => {
              const ing = ingredients.find(i => i.id === item.ingredientId)
              return (
                <tr key={`${item.ingredientId}-${idx}`} className="border-b border-line">
                  <td className="py-2 text-ink-3">{idx + 1}</td>
                  <td className="py-2">{ing?.name ?? item.ingredientId}</td>
                  <td className="py-2 text-right">{item.quantity.toLocaleString('zh-TW')} {ing?.unit}</td>
                  <td className="py-2 text-right">NT$ {item.unitPrice}</td>
                  <td className="py-2 text-right">{formatCurrency(item.quantity * item.unitPrice)}</td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={4} className="pt-3 text-right font-semibold">合計</td>
              <td className="tabular pt-3 text-right text-base font-bold">{formatCurrency(order.totalAmount)}</td>
            </tr>
          </tfoot>
        </table>

        {order.note && <p className="mb-8 text-ink-2">備註：{order.note}</p>}

        {/* 簽核欄：紙本流程需要採購與驗收雙方簽名 */}
        <footer className="mt-12 grid grid-cols-3 gap-8 text-center text-xs text-ink-3">
          {['採購人', '核准', '驗收人'].map(label => (
            <div key={label}><div className="mb-1 h-10 border-b border-ink-3" />{label}</div>
          ))}
        </footer>
      </article>
    </div>
  )
}

export default PurchasePrintPage
