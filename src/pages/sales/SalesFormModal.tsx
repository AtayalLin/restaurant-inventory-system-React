// 新增銷售訂單的對話框
// 選商品自動帶入售價；小計、5% 營業稅、折扣、總計即時計算（稅額算法與後端共用 calcTax）
import { useForm, useFieldArray, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, X } from 'lucide-react'
import { useCreateSalesOrder, calcTax, calcTotal } from '../../hooks/useSalesOrders'
import { useProducts } from '../../hooks/useProducts'
import { Button, Field, Modal, inputClass, useToast, errorMessage } from '../../components/ui'
import { formatCurrency } from '../../lib/format'
import type { SalesChannel } from '../../types'

const salesItemSchema = z.object({
  productId: z.string().min(1, '請選擇商品'),
  quantity: z.number({ error: '請輸入數量' }).int('數量須為整數').min(1, '數量至少 1'),
  unitPrice: z.number({ error: '請輸入單價' }).min(0, '單價不可為負數'),
})
const salesSchema = z.object({
  channel: z.enum(['DINE_IN', 'TAKEOUT', 'DELIVERY']),
  items: z.array(salesItemSchema).min(1, '至少需要一筆訂單明細'),
  discount: z.number({ error: '請輸入折扣，沒有請填 0' }).min(0, '折扣不可為負數'),
  note: z.string().max(200, '備註最多 200 字'),
}).superRefine((data, ctx) => {
  // 折扣不能超過應付金額，否則總計會變成負數
  const subtotal = data.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0)
  if (data.discount > subtotal + calcTax(subtotal)) {
    ctx.addIssue({ code: 'custom', path: ['discount'], message: '折扣不可超過小計加稅' })
  }
})
type SalesFormData = z.infer<typeof salesSchema>

const CHANNELS: { value: SalesChannel; label: string }[] = [
  { value: 'DINE_IN', label: '內用' },
  { value: 'TAKEOUT', label: '外帶' },
  { value: 'DELIVERY', label: '外送' },
]
const EMPTY_ITEM = { productId: '', quantity: 1, unitPrice: 0 }

/** storeId：訂單所屬門市，由銷售頁傳入目前選擇的門市 */
function SalesFormModal({ storeId, onClose }: { storeId: string; onClose: () => void }) {
  const toast = useToast()
  const { data: products = [] } = useProducts()
  const activeProducts = products.filter(p => p.isActive) // 已下架的商品不能點
  const { mutate: createOrder, isPending } = useCreateSalesOrder()

  const { register, control, handleSubmit, setValue, formState: { errors } } = useForm<SalesFormData>({
    resolver: zodResolver(salesSchema),
    defaultValues: { channel: 'DINE_IN', items: [EMPTY_ITEM], discount: 0, note: '' },
  })
  const { fields, append, remove } = useFieldArray({ control, name: 'items' })

  // 即時金額：明細或折扣一變動就重算
  const watchedItems = useWatch({ control, name: 'items' }) ?? []
  const discount = Number(useWatch({ control, name: 'discount' })) || 0
  const lineTotal = (i: number) => (Number(watchedItems[i]?.quantity) || 0) * (Number(watchedItems[i]?.unitPrice) || 0)
  const subtotal = watchedItems.reduce((sum, _, i) => sum + lineTotal(i), 0)
  const taxAmount = calcTax(subtotal)
  const total = calcTotal(subtotal, taxAmount, discount)

  function handleProductChange(index: number, productId: string) {
    const product = products.find(p => p.id === productId)
    if (product) setValue(`items.${index}.unitPrice`, product.price, { shouldValidate: true })
  }

  function onSubmit(data: SalesFormData) {
    createOrder(
      { status: 'PENDING', items: data.items, subtotal, taxAmount, discount: data.discount, total, channel: data.channel, note: data.note, testBatchId: null, storeId },
      {
        onSuccess: () => { toast.success(`訂單已建立，金額 ${formatCurrency(total)}`); onClose() },
        onError: err => toast.error(errorMessage(err, '建立失敗，請稍後再試')),
      },
    )
  }

  return (
    <Modal
      title="新增訂單"
      wide
      onClose={onClose}
      busy={isPending}
      footer={<>
        <Button variant="secondary" onClick={onClose} disabled={isPending}>取消</Button>
        <Button type="submit" form="sales-form" loading={isPending}>建立訂單</Button>
      </>}
    >
      <form id="sales-form" onSubmit={handleSubmit(onSubmit)} noValidate>
        {/* 用餐方式：radio 包在 label 裡，整塊都可以點 */}
        <fieldset className="mb-4">
          <legend className="mb-1.5 text-[13px] font-medium text-ink-2">用餐方式</legend>
          <div className="flex gap-2">
            {CHANNELS.map(ch => (
              <label key={ch.value}
                className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border border-line px-3 py-2 text-sm text-ink-2 has-[:checked]:border-brand-700 has-[:checked]:bg-brand-50 has-[:checked]:font-semibold has-[:checked]:text-brand-700">
                <input {...register('channel')} type="radio" value={ch.value} className="accent-brand-700" />
                {ch.label}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="mb-4">
          <div className="mb-2 flex items-center justify-between">
            <legend className="text-[13px] font-medium text-ink-2">訂單明細<span className="ml-0.5 text-rose-600" aria-hidden="true">*</span></legend>
            <Button variant="ghost" size="sm" icon={<Plus size={14} aria-hidden="true" />} onClick={() => append(EMPTY_ITEM)}>
              新增品項
            </Button>
          </div>

          <div className="hidden grid-cols-[2fr_80px_1fr_96px_32px] gap-2 px-1 pb-1 text-xs text-ink-3 sm:grid" aria-hidden="true">
            <span>商品</span><span>數量</span><span>單價</span><span className="text-right">小計</span><span />
          </div>

          <div className="space-y-2">
            {fields.map((field, index) => {
              const e = errors.items?.[index]
              const productField = register(`items.${index}.productId`)
              return (
                <div key={field.id} className="grid grid-cols-2 items-start gap-2 rounded-lg bg-canvas p-2 sm:grid-cols-[2fr_80px_1fr_96px_32px] sm:bg-transparent sm:p-0">
                  <div className="col-span-2 sm:col-span-1">
                    <select
                      {...productField}
                      onChange={ev => { productField.onChange(ev); handleProductChange(index, ev.target.value) }}
                      aria-label={`第 ${index + 1} 列商品`}
                      className={inputClass(!!e?.productId)}
                    >
                      <option value="">選擇商品</option>
                      {activeProducts.map(p => <option key={p.id} value={p.id}>{p.name}（NT$ {p.price}）</option>)}
                    </select>
                    {e?.productId && <p className="mt-1 text-xs text-rose-600">{e.productId.message}</p>}
                  </div>
                  <div>
                    {/* 手機版沒有表頭，在欄位上方顯示小標 */}
                    <span className="mb-1 block text-xs text-ink-3 sm:hidden" aria-hidden="true">數量</span>
                    <input {...register(`items.${index}.quantity`, { valueAsNumber: true })} type="number" min={1} step={1}
                      aria-label={`第 ${index + 1} 列數量`} className={`${inputClass(!!e?.quantity)} tabular`} />
                    {e?.quantity && <p className="mt-1 text-xs text-rose-600">{e.quantity.message}</p>}
                  </div>
                  <div>
                    {/* 手機版沒有表頭，在欄位上方顯示小標 */}
                    <span className="mb-1 block text-xs text-ink-3 sm:hidden" aria-hidden="true">單價</span>
                    <input {...register(`items.${index}.unitPrice`, { valueAsNumber: true })} type="number" min={0}
                      aria-label={`第 ${index + 1} 列單價`} className={`${inputClass(!!e?.unitPrice)} tabular`} />
                    {e?.unitPrice && <p className="mt-1 text-xs text-rose-600">{e.unitPrice.message}</p>}
                  </div>
                  <div className="tabular self-center text-sm font-medium text-ink-2 sm:text-right">{formatCurrency(lineTotal(index))}</div>
                  <button type="button" onClick={() => remove(index)} disabled={fields.length === 1}
                    aria-label={`刪除第 ${index + 1} 列`}
                    className="justify-self-end self-center rounded-lg p-1.5 text-ink-3 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-30 disabled:hover:bg-transparent">
                    <X size={16} />
                  </button>
                </div>
              )
            })}
          </div>
          {errors.items?.root && <p className="mt-1 text-xs text-rose-600">{errors.items.root.message}</p>}
        </fieldset>

        <div className="grid gap-x-4 sm:grid-cols-2">
          <Field label="折扣（元）" error={errors.discount?.message}>
            <input {...register('discount', { valueAsNumber: true })} type="number" min={0} className={`${inputClass(!!errors.discount)} tabular`} />
          </Field>
          <Field label="備註" error={errors.note?.message}>
            <input {...register('note')} placeholder="選填，例：不加辣" className={inputClass(!!errors.note)} />
          </Field>
        </div>

        {/* 金額明細 */}
        <dl className="tabular space-y-1.5 rounded-lg bg-brand-50 px-4 py-3 text-sm">
          <div className="flex justify-between text-ink-2"><dt>小計</dt><dd>{formatCurrency(subtotal)}</dd></div>
          <div className="flex justify-between text-ink-2"><dt>營業稅（5%，無條件捨去）</dt><dd>{formatCurrency(taxAmount)}</dd></div>
          {discount > 0 && <div className="flex justify-between text-rose-600"><dt>折扣</dt><dd>－ {formatCurrency(discount)}</dd></div>}
          <div className="flex justify-between border-t border-brand-200 pt-1.5 text-base font-bold text-brand-800"><dt>總計</dt><dd>{formatCurrency(total)}</dd></div>
        </dl>
      </form>
    </Modal>
  )
}

export default SalesFormModal
