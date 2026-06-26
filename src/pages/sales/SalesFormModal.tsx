import { useForm, useFieldArray, useWatch } from 'react-hook-form'
// useForm：管理表單狀態
// useFieldArray：動態訂單明細列（同 PurchaseFormModal 設計）
// useWatch：監聽 items 即時計算金額

import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

import { useCreateSalesOrder, calcTax, calcTotal } from '../../hooks/useSalesOrders'
// 關聯：src/hooks/useSalesOrders.ts
// calcTax：Math.floor(subtotal * 5 / 100)，無條件捨去至整數
// calcTotal：Math.round(subtotal + taxAmount - discount)，四捨五入至整數

import { useProducts } from '../../hooks/useProducts'
// 關聯：src/hooks/useProducts.ts
// GET /api/products（商品下拉選單，帶入售價）

// ── Zod Schema ────────────────────────────────────────────
const salesItemSchema = z.object({
  productId: z.string().min(1, '請選擇商品'),
  quantity:  z.number().min(1, '數量至少 1'),
  unitPrice: z.number().min(0, '單價不可為負數'),
  // unitPrice：從商品售價帶入，但允許修改（特殊優惠）
})

const salesSchema = z.object({
  channel: z.enum(['DINE_IN', 'TAKEOUT', 'DELIVERY']),
  // 銷售渠道：內用 / 外帶 / 外送
  items: z.array(salesItemSchema).min(1, '至少需要一筆訂單明細'),
  discount: z.number().min(0, '折扣不可為負數'),
  // 折扣金額：選填，預設 0
  note: z.string().max(200, '備註最多 200 字'),
})

type SalesFormData = z.infer<typeof salesSchema>

interface Props {
  onClose: () => void
}

function SalesFormModal({ onClose }: Props) {
  const { data: products = [] } = useProducts()
  // 商品列表，用於下拉選單和帶入售價

  const activeProducts = products.filter(p => p.isActive)
  // 只顯示上架中的商品，下架商品不應出現在點餐選單

  const { mutate: createOrder, isPending } = useCreateSalesOrder()

  const {
    register,
    control,
    handleSubmit,
    setValue,
    // setValue：選擇商品後自動帶入 unitPrice
    formState: { errors },
  } = useForm<SalesFormData>({
    resolver: zodResolver(salesSchema),
    defaultValues: {
      channel:  'DINE_IN',
      items:    [{ productId: '', quantity: 1, unitPrice: 0 }],
      discount: 0,
      note:     '',
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'items' })

  const watchedItems    = useWatch({ control, name: 'items' })
  const watchedDiscount = useWatch({ control, name: 'discount' })
  // 監聽折扣欄位，即時更新總計

  // ── 即時金額計算 ──────────────────────────────────────
  const subtotal = (watchedItems ?? []).reduce((sum, item) => {
    return sum + (Number(item?.quantity) || 0) * (Number(item?.unitPrice) || 0)
  }, 0)
  // subtotal：所有明細的 數量 × 單價 加總，不含稅

  const taxAmount = calcTax(subtotal)
  // taxAmount：Math.floor(subtotal * 5 / 100)，無條件捨去
  // 範例：subtotal=245 → taxAmount=Math.floor(12.25)=12

  const discount = Number(watchedDiscount) || 0
  const total    = calcTotal(subtotal, taxAmount, discount)
  // total：Math.round(subtotal + taxAmount - discount)，四捨五入至整數

  // ── 選擇商品時自動帶入售價 ────────────────────────────
  function handleProductChange(index: number, productId: string) {
    const product = products.find(p => p.id === productId)
    if (product) {
      setValue(`items.${index}.unitPrice`, product.price)
      // setValue：直接更新 react-hook-form 的欄位值
      // 為什麼用 setValue 不用 onChange：
      //   select 的 onChange 只能拿到 event.target.value（string）
      //   需要額外查詢商品售價，只能透過 setValue 更新另一個欄位
    }
  }

  // ── 表單送出 ──────────────────────────────────────────
  function onSubmit(data: SalesFormData) {
    createOrder(
      {
        status:    'PENDING',
        // 新建訂單從 PENDING 開始
        items:     data.items,
        subtotal,
        taxAmount,
        // taxAmount：已在前端計算好，直接存入
        discount:  data.discount,
        total,
        channel:   data.channel,
        note:      data.note,
      },
      { onSuccess: onClose }
    )
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: '12px', padding: '32px',
          width: '580px', maxWidth: '90vw', maxHeight: '85vh',
          overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
        }}
      >
        {/* 標題列 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h3 style={{ margin: 0, fontSize: '18px', color: '#1E3A5F' }}>新增訂單</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#6B7280' }}>✕</button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>

          {/* 銷售渠道 */}
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>銷售渠道</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {(['DINE_IN', 'TAKEOUT', 'DELIVERY'] as const).map(ch => (
                <label
                  key={ch}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '8px 16px', border: '1px solid #E5E7EB',
                    borderRadius: '6px', cursor: 'pointer', fontSize: '14px',
                  }}
                >
                  <input {...register('channel')} type="radio" value={ch} />
                  {ch === 'DINE_IN' ? '🍽️ 內用' : ch === 'TAKEOUT' ? '🥡 外帶' : '🛵 外送'}
                </label>
              ))}
            </div>
          </div>

          {/* 訂單明細 */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label style={labelStyle}>訂單明細 <span style={{ color: '#DC2626' }}>*</span></label>
              <button
                type="button"
                onClick={() => append({ productId: '', quantity: 1, unitPrice: 0 })}
                style={{
                  padding: '4px 12px', fontSize: '13px',
                  border: '1px solid #1E40AF', borderRadius: '4px',
                  background: '#EFF6FF', color: '#1E40AF', cursor: 'pointer',
                }}
              >
                ＋ 新增品項
              </button>
            </div>

            {/* 表頭 */}
            <div style={{
              display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto',
              gap: '8px', padding: '8px 0', borderBottom: '1px solid #E5E7EB',
              fontSize: '12px', color: '#6B7280', fontWeight: 500,
            }}>
              <span>商品</span><span>數量</span><span>單價</span><span>小計</span><span></span>
            </div>

            {/* 明細列 */}
            {fields.map((field, index) => {
              const qty   = Number(watchedItems?.[index]?.quantity)  || 0
              const price = Number(watchedItems?.[index]?.unitPrice) || 0

              return (
                <div key={field.id} style={{
                  display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto',
                  gap: '8px', padding: '8px 0', borderBottom: '1px solid #F3F4F6', alignItems: 'start',
                }}>
                  {/* 商品選擇 */}
                  <div>
                    <select
                      {...register(`items.${index}.productId`)}
                      onChange={e => {
                        register(`items.${index}.productId`).onChange(e)
                        handleProductChange(index, e.target.value)
                        // 先執行 react-hook-form 的 onChange，再帶入售價
                      }}
                      style={inputStyle(!!errors.items?.[index]?.productId)}
                    >
                      <option value="">選擇商品</option>
                      {activeProducts.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name}（NT$ {p.price}）
                        </option>
                      ))}
                    </select>
                    {errors.items?.[index]?.productId && (
                      <p style={errorStyle}>{errors.items[index].productId.message}</p>
                    )}
                  </div>

                  {/* 數量 */}
                  <div>
                    <input
                      {...register(`items.${index}.quantity`, { valueAsNumber: true })}
                      type="number" min={1} style={inputStyle(!!errors.items?.[index]?.quantity)}
                    />
                  </div>

                  {/* 單價（可修改） */}
                  <div>
                    <input
                      {...register(`items.${index}.unitPrice`, { valueAsNumber: true })}
                      type="number" min={0} style={inputStyle(!!errors.items?.[index]?.unitPrice)}
                    />
                  </div>

                  {/* 小計 */}
                  <div style={{ padding: '8px 0', fontSize: '14px', color: '#374151', fontWeight: 500 }}>
                    NT$ {(qty * price).toLocaleString()}
                  </div>

                  {/* 刪除 */}
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    disabled={fields.length === 1}
                    style={{
                      padding: '6px', border: 'none', background: 'none',
                      color: fields.length === 1 ? '#D1D5DB' : '#DC2626',
                      cursor: fields.length === 1 ? 'not-allowed' : 'pointer', fontSize: '16px',
                    }}
                  >✕</button>
                </div>
              )
            })}
          </div>

          {/* 折扣 */}
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>折扣金額（元）</label>
            <input
              {...register('discount', { valueAsNumber: true })}
              type="number" min={0} placeholder="0"
              style={inputStyle(false)}
            />
          </div>

          {/* 金額明細 */}
          <div style={{
            background: '#F8FAFC', borderRadius: '8px', padding: '16px',
            marginBottom: '16px', fontSize: '14px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', color: '#6B7280' }}>
              <span>小計</span>
              <span>NT$ {subtotal.toLocaleString()}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', color: '#6B7280' }}>
              <span>營業稅（5%，無條件捨去）</span>
              <span>NT$ {taxAmount.toLocaleString()}</span>
            </div>
            {discount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', color: '#DC2626' }}>
                <span>折扣</span>
                <span>－ NT$ {discount.toLocaleString()}</span>
              </div>
            )}
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              paddingTop: '8px', borderTop: '1px solid #E5E7EB',
              fontWeight: 700, fontSize: '16px', color: '#1E3A5F',
            }}>
              <span>總計</span>
              <span>NT$ {total.toLocaleString()}</span>
            </div>
          </div>

          {/* 備註 */}
          <div style={{ marginBottom: '24px' }}>
            <label style={labelStyle}>備註</label>
            <textarea
              {...register('note')} rows={2} placeholder="選填，例：不加辣、外帶袋 ×2"
              style={{ ...inputStyle(false), resize: 'vertical' }}
            />
          </div>

          {/* 按鈕列 */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button
              type="button" onClick={onClose} disabled={isPending}
              style={{
                padding: '10px 20px', border: '1px solid #E5E7EB', borderRadius: '6px',
                background: '#fff', fontSize: '14px', cursor: 'pointer', color: '#374151',
              }}
            >取消</button>
            <button
              type="submit" disabled={isPending}
              style={{
                padding: '10px 20px', border: 'none', borderRadius: '6px',
                background: isPending ? '#93C5FD' : '#1E40AF',
                fontSize: '14px', cursor: isPending ? 'not-allowed' : 'pointer', color: '#fff',
              }}
            >
              {isPending ? '建立中...' : '建立訂單'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── 共用樣式 ──────────────────────────────────────────────────
function inputStyle(hasError: boolean): React.CSSProperties {
  return {
    width: '100%', padding: '7px 10px',
    border: `1px solid ${hasError ? '#DC2626' : '#E5E7EB'}`,
    borderRadius: '6px', fontSize: '13px', outline: 'none', boxSizing: 'border-box',
  }
}

const labelStyle: React.CSSProperties = {
  display: 'block', marginBottom: '6px',
  fontSize: '13px', fontWeight: 500, color: '#374151',
}

const errorStyle: React.CSSProperties = {
  margin: '4px 0 0', fontSize: '12px', color: '#DC2626',
}

export default SalesFormModal