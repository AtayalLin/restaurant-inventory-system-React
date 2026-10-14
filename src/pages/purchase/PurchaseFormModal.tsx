// 建立採購單的對話框
// 採購明細用 useFieldArray 動態增減列；總金額即時計算，送出時一併存入
import { useForm, useFieldArray, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AlertTriangle, Plus, X } from 'lucide-react'
import { useCreatePurchaseOrder } from '../../hooks/usePurchaseOrders'
import { useSuppliers, useIngredients } from '../../hooks/useIngredients'
import { Button, Field, Modal, inputClass, useToast, errorMessage } from '../../components/ui'
import { formatCurrency } from '../../lib/format'
import { checkPurchaseLines, orderDayNotice, type PurchaseDraft } from '../../lib/orderRules'

const purchaseItemSchema = z.object({
  ingredientId: z.string().min(1, '請選擇食材'),
  quantity: z.number({ error: '請輸入數量' }).min(0.01, '數量必須大於 0'),
  unitPrice: z.number({ error: '請輸入單價' }).min(0, '單價不可為負數'),
})
const purchaseSchema = z.object({
  supplierId: z.string().min(1, '請選擇供應商'),
  items: z.array(purchaseItemSchema).min(1, '至少需要一筆採購明細'),
  expectedDate: z.string(),
  note: z.string().max(200, '備註最多 200 字'),
})
type PurchaseFormData = z.infer<typeof purchaseSchema>

const EMPTY_ITEM = { ingredientId: '', quantity: 1, unitPrice: 0 }
const today = () => new Date().toISOString().slice(0, 10) // 預計到貨日不能選過去

interface Props {
  onClose: () => void
  /** 預先填好的草稿（例如從儀表板「明日預估」一鍵叫貨） */
  draft?: PurchaseDraft
}

function PurchaseFormModal({ onClose, draft }: Props) {
  const toast = useToast()
  const { data: suppliers = [] } = useSuppliers()
  const { data: ingredients = [] } = useIngredients()
  const { mutate: createOrder, isPending } = useCreatePurchaseOrder()

  const { register, control, handleSubmit, setValue, setError, formState: { errors } } = useForm<PurchaseFormData>({
    resolver: zodResolver(purchaseSchema),
    defaultValues: draft
      ? { supplierId: draft.supplierId, items: draft.items, expectedDate: '', note: '依明日預估自動產生' }
      : { supplierId: '', items: [EMPTY_ITEM], expectedDate: '', note: '' },
  })
  const { fields, append, remove } = useFieldArray({ control, name: 'items' })

  // 監聽明細，即時計算每列小計與總金額
  const watchedItems = useWatch({ control, name: 'items' }) ?? []
  const lineTotal = (i: number) => (Number(watchedItems[i]?.quantity) || 0) * (Number(watchedItems[i]?.unitPrice) || 0)
  const totalAmount = watchedItems.reduce((sum, _, i) => sum + lineTotal(i), 0)

  // 只列出這家供應商的食材（以及沒有指定供應商的食材），從源頭避免叫錯
  const supplierId = useWatch({ control, name: 'supplierId' })
  const supplier = suppliers.find(s => s.id === supplierId)
  const ingredientOptions = ingredients.filter(i => !supplierId || !i.supplierId || i.supplierId === supplierId)
  const dayNotice = orderDayNotice(supplier)
  const minHint = (index: number) => {
    const ing = ingredients.find(i => i.id === watchedItems[index]?.ingredientId)
    return ing?.minOrderQty ? `最低 ${ing.minOrderQty.toLocaleString('zh-TW')} ${ing.unit}` : null
  }

  // 選了食材就自動帶入該食材的單位成本當單價，少打一次字（仍可手動修改）
  function handleIngredientChange(index: number, ingredientId: string) {
    const ing = ingredients.find(i => i.id === ingredientId)
    if (ing) setValue(`items.${index}.unitPrice`, ing.costPerUnit, { shouldValidate: true })
  }

  function onSubmit(data: PurchaseFormData) {
    // 叫貨規則：最低訂購量、供應商不符、重複食材 → 標在對應欄位並阻擋送出
    const issues = checkPurchaseLines(data.items, ingredients, data.supplierId)
    if (issues.length > 0) {
      issues.forEach(i => setError(`items.${i.index}.${i.field}`, { message: i.message }))
      return
    }
    createOrder(
      {
        supplierId: data.supplierId,
        status: 'PENDING',
        items: data.items,
        totalAmount,
        expectedDate: data.expectedDate || null,
        receivedDate: null,
        note: data.note,
      },
      {
        onSuccess: () => { toast.success('採購單已建立'); onClose() },
        onError: err => toast.error(errorMessage(err, '建立失敗，請稍後再試')),
      },
    )
  }

  return (
    <Modal
      title="建立採購單"
      wide
      onClose={onClose}
      busy={isPending}
      footer={<>
        <Button variant="secondary" onClick={onClose} disabled={isPending}>取消</Button>
        <Button type="submit" form="purchase-form" loading={isPending}>建立採購單</Button>
      </>}
    >
      <form id="purchase-form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="grid gap-x-4 sm:grid-cols-2">
          <Field label="供應商" required error={errors.supplierId?.message}>
            <select {...register('supplierId')} className={inputClass(!!errors.supplierId)}>
              <option value="">請選擇供應商</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Field>
          <Field label="預計到貨日">
            <input {...register('expectedDate')} type="date" min={today()} className={inputClass()} />
          </Field>
        </div>

        {/* 非叫貨日提醒：不阻擋，臨時叫貨在實務上很常見 */}
        {dayNotice && (
          <p role="status" className="mb-4 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-[13px] text-amber-800">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
            {dayNotice}
          </p>
        )}

        {/* 採購明細：fieldset + legend 讓整組欄位有共同名稱 */}
        <fieldset className="mb-4">
          <div className="mb-2 flex items-center justify-between">
            <legend className="text-[13px] font-medium text-ink-2">採購明細<span className="ml-0.5 text-rose-600" aria-hidden="true">*</span></legend>
            <Button variant="ghost" size="sm" icon={<Plus size={14} aria-hidden="true" />} onClick={() => append(EMPTY_ITEM)}>
              新增食材
            </Button>
          </div>

          <div className="hidden grid-cols-[2fr_1fr_1fr_96px_32px] gap-2 px-1 pb-1 text-xs text-ink-3 sm:grid" aria-hidden="true">
            <span>食材</span><span>數量</span><span>單價（元）</span><span className="text-right">小計</span><span />
          </div>

          <div className="space-y-2">
            {fields.map((field, index) => {
              const e = errors.items?.[index]
              const ingField = register(`items.${index}.ingredientId`)
              return (
                <div key={field.id} className="grid grid-cols-2 items-start gap-2 rounded-lg bg-canvas p-2 sm:grid-cols-[2fr_1fr_1fr_96px_32px] sm:bg-transparent sm:p-0">
                  <div className="col-span-2 sm:col-span-1">
                    <select
                      {...ingField}
                      onChange={ev => { ingField.onChange(ev); handleIngredientChange(index, ev.target.value) }}
                      aria-label={`第 ${index + 1} 列食材`}
                      className={inputClass(!!e?.ingredientId)}
                    >
                      <option value="">選擇食材</option>
                      {ingredientOptions.map(i => <option key={i.id} value={i.id}>{i.name}（{i.unit}）</option>)}
                    </select>
                    {e?.ingredientId && <p className="mt-1 text-xs text-rose-600">{e.ingredientId.message}</p>}
                  </div>
                  <div>
                    {/* 手機版沒有表頭，在欄位上方顯示小標 */}
                    <span className="mb-1 block text-xs text-ink-3 sm:hidden" aria-hidden="true">數量</span>
                    <input {...register(`items.${index}.quantity`, { valueAsNumber: true })} type="number" min={0.01} step={0.01}
                      aria-label={`第 ${index + 1} 列數量`} className={`${inputClass(!!e?.quantity)} tabular`} />
                    {e?.quantity
                      ? <p className="mt-1 text-xs text-rose-600">{e.quantity.message}</p>
                      : minHint(index) && <p className="mt-1 text-xs text-ink-3">{minHint(index)}</p>}
                  </div>
                  <div>
                    {/* 手機版沒有表頭，在欄位上方顯示小標 */}
                    <span className="mb-1 block text-xs text-ink-3 sm:hidden" aria-hidden="true">單價（元）</span>
                    <input {...register(`items.${index}.unitPrice`, { valueAsNumber: true })} type="number" min={0} step={0.001}
                      aria-label={`第 ${index + 1} 列單價`} className={`${inputClass(!!e?.unitPrice)} tabular`} />
                    {e?.unitPrice && <p className="mt-1 text-xs text-rose-600">{e.unitPrice.message}</p>}
                  </div>
                  <div className="tabular self-center text-sm font-medium text-ink-2 sm:text-right">{formatCurrency(lineTotal(index))}</div>
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    disabled={fields.length === 1} // 至少保留一列
                    aria-label={`刪除第 ${index + 1} 列`}
                    className="justify-self-end self-center rounded-lg p-1.5 text-ink-3 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-30 disabled:hover:bg-transparent"
                  >
                    <X size={16} />
                  </button>
                </div>
              )
            })}
          </div>
          {errors.items?.root && <p className="mt-1 text-xs text-rose-600">{errors.items.root.message}</p>}
        </fieldset>

        <div className="mb-4 flex items-center justify-between rounded-lg bg-brand-50 px-4 py-3">
          <span className="text-sm text-ink-2">採購總金額</span>
          <span className="tabular text-xl font-bold text-brand-800">{formatCurrency(totalAmount)}</span>
        </div>

        <Field label="備註" error={errors.note?.message}>
          <textarea {...register('note')} rows={2} placeholder="選填，例：急件、需冷藏配送" className={`${inputClass(!!errors.note)} resize-y`} />
        </Field>
      </form>
    </Modal>
  )
}

export default PurchaseFormModal
