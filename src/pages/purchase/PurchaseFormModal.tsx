// useEffect 預留供未來編輯模式擴充，目前不需要
// import { useEffect } from 'react'

import { useForm, useFieldArray, useWatch } from 'react-hook-form'
// useForm：管理整個表單狀態
// useFieldArray：專門處理動態陣列欄位（採購明細列）
//   為什麼用 useFieldArray 不用普通 useState：
//   useFieldArray 整合在 react-hook-form 內，
//   陣列的新增/刪除/驗證都自動管理，不需要手動維護 index
// useWatch：監聽指定欄位的即時值
//   為什麼用 useWatch 不用 watch()：
//   useWatch 只在監聽的欄位變動時 re-render，效能更好

import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
// 關聯：zod v4 + @hookform/resolvers v5

import { useCreatePurchaseOrder } from '../../hooks/usePurchaseOrders'
// 關聯：src/hooks/usePurchaseOrders.ts
// POST /api/purchaseOrders

import { useSuppliers } from '../../hooks/useIngredients'
// 關聯：src/hooks/useIngredients.ts
// GET /api/suppliers（供應商下拉選單）

import { useIngredients } from '../../hooks/useIngredients'
// GET /api/ingredients（食材下拉選單）

// ── Zod Schema ────────────────────────────────────────────
const purchaseItemSchema = z.object({
  ingredientId: z.string().min(1, '請選擇食材'),
  // ingredientId：必須選擇一個食材

  quantity: z.number()
    .min(0.01, '數量必須大於 0'),
  // 為什麼 min 0.01 不是 1：食材數量可以是小數（例如 0.5 kg）

  unitPrice: z.number()
    .min(0, '單價不可為負數'),
  // unitPrice：每單位的採購價格
})

const purchaseSchema = z.object({
  supplierId: z.string().min(1, '請選擇供應商'),
  // supplierId：必填，對應 Supplier.id

  items: z.array(purchaseItemSchema).min(1, '至少需要一筆採購明細'),
  // items：最少一列，每列都要通過 purchaseItemSchema 驗證

  expectedDate: z.string(),
  // 預計到貨日，選填，空字串代表未指定
  // 為什麼用 string 不用 z.date()：HTML date input 回傳 string

  note: z.string().max(200, '備註最多 200 字'),
  // 備註選填
})

type PurchaseFormData = z.infer<typeof purchaseSchema>
// PurchaseFormData = {
//   supplierId: string
//   items: { ingredientId: string, quantity: number, unitPrice: number }[]
//   expectedDate: string
//   note: string
// }

// ── Props ─────────────────────────────────────────────────
interface Props {
  onClose: () => void
  // 關聯：PurchasePage 的 setModalOpen(false)
}

function PurchaseFormModal({ onClose }: Props) {
  // ── 資料取得 ─────────────────────────────────────────────
  const { data: suppliers = [] } = useSuppliers()
  const { data: ingredients = [] } = useIngredients()

  const { mutate: createOrder, isPending } = useCreatePurchaseOrder()
  // 關聯：usePurchaseOrders.ts 的 useCreatePurchaseOrder

  // ── 表單初始化 ─────────────────────────────────────────
  const {
    register,
    control,
    // control：useFieldArray 和 useWatch 需要用 control 連接到 useForm
    // 為什麼需要 control：它是 react-hook-form 的內部狀態物件，
    //   讓 useFieldArray 知道要管理哪個 form 的哪個陣列欄位
    handleSubmit,
    formState: { errors },
  } = useForm<PurchaseFormData>({
    resolver: zodResolver(purchaseSchema),
    defaultValues: {
      supplierId: '',
      items: [
        { ingredientId: '', quantity: 1, unitPrice: 0 }
        // 預設一列空白明細，讓使用者直接開始填寫
      ],
      expectedDate: '',
      note: '',
    },
  })

  // ── 動態明細列管理 ─────────────────────────────────────
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
    // name 必須對應 schema 的陣列欄位名稱 'items'
  })
  // fields：目前的明細列陣列，每個 field 有自動產生的 id（供 React key 使用）
  // append：新增一列到陣列末尾
  // remove：刪除指定 index 的列

  // ── 即時計算總金額 ─────────────────────────────────────
  const watchedItems = useWatch({ control, name: 'items' })
  // useWatch 監聽 items 欄位的即時值
  // 每次使用者修改數量或單價，watchedItems 自動更新

  const totalAmount = (watchedItems ?? []).reduce((sum, item) => {
    const qty   = Number(item?.quantity)  || 0
    const price = Number(item?.unitPrice) || 0
    return sum + qty * price
    // 每列小計 = 數量 × 單價，全部加總
    // Number() + || 0：防止 NaN（空白欄位時）加入計算
  }, 0)

  // ── 表單送出 ──────────────────────────────────────────
  function onSubmit(data: PurchaseFormData) {
    createOrder(
      {
        supplierId:   data.supplierId,
        status:       'PENDING',
        // 新建採購單永遠從 PENDING 開始
        items:        data.items,
        totalAmount,
        // totalAmount 從 useWatch 即時計算，不讓使用者手動輸入（避免錯誤）
        expectedDate: data.expectedDate === '' ? null : data.expectedDate,
        // 空字串 → null：未指定到貨日
        receivedDate: null,
        // 新建時尚未收貨，receivedDate 永遠是 null
        note:         data.note,
      },
      { onSuccess: onClose }
    )
  }

  // ── 畫面渲染 ──────────────────────────────────────────
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff',
          borderRadius: '12px',
          padding: '32px',
          width: '600px',
          maxWidth: '90vw',
          maxHeight: '85vh',
          overflowY: 'auto',
          boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
        }}
      >
        {/* 標題列 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h3 style={{ margin: 0, fontSize: '18px', color: '#1E3A5F' }}>建立採購單</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#6B7280' }}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>

          {/* 供應商 */}
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>供應商 <span style={{ color: '#DC2626' }}>*</span></label>
            <select {...register('supplierId')} style={inputStyle(!!errors.supplierId)}>
              <option value="">請選擇供應商</option>
              {suppliers.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            {errors.supplierId && <p style={errorStyle}>{errors.supplierId.message}</p>}
          </div>

          {/* 預計到貨日 */}
          <div style={{ marginBottom: '20px' }}>
            <label style={labelStyle}>預計到貨日</label>
            <input
              {...register('expectedDate')}
              type="date"
                min={new Date().toISOString().split('T')[0]}
  // min：限制只能選今天以後的日期
  // new Date().toISOString() → '2026-06-25T...'
  // .split('T')[0] → '2026-06-25'（HTML date input 需要 YYYY-MM-DD 格式）
              style={inputStyle(false)}
            />
          </div>

          {/* 採購明細 */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label style={labelStyle}>採購明細 <span style={{ color: '#DC2626' }}>*</span></label>
              <button
                type="button"
                onClick={() => append({ ingredientId: '', quantity: 1, unitPrice: 0 })}
                // append：在陣列末尾新增一列空白明細
                style={{
                  padding: '4px 12px',
                  fontSize: '13px',
                  border: '1px solid #1E40AF',
                  borderRadius: '4px',
                  background: '#EFF6FF',
                  color: '#1E40AF',
                  cursor: 'pointer',
                }}
              >
                ＋ 新增食材
              </button>
            </div>

            {/* 表頭 */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1fr 1fr 1fr auto',
              gap: '8px',
              padding: '8px 0',
              borderBottom: '1px solid #E5E7EB',
              fontSize: '12px',
              color: '#6B7280',
              fontWeight: 500,
            }}>
              <span>食材</span>
              <span>數量</span>
              <span>單價（元）</span>
              <span>小計</span>
              <span></span>
            </div>

            {/* 明細列 */}
            {fields.map((field, index) => {
              const qty   = Number(watchedItems?.[index]?.quantity)  || 0
              const price = Number(watchedItems?.[index]?.unitPrice) || 0
              const subtotal = qty * price
              // 每列的小計即時顯示，讓使用者確認金額

              return (
                <div
                  key={field.id}
                  // field.id：useFieldArray 自動產生的唯一 id，用於 React key
                  // 為什麼不用 index 當 key：陣列順序變動時 index 會錯位
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '2fr 1fr 1fr 1fr auto',
                    gap: '8px',
                    padding: '8px 0',
                    borderBottom: '1px solid #F3F4F6',
                    alignItems: 'start',
                  }}
                >
                  {/* 食材選擇 */}
                  <div>
                    <select
                      {...register(`items.${index}.ingredientId`)}
                      // register 的路徑語法：'items.0.ingredientId'、'items.1.ingredientId'...
                      style={inputStyle(!!errors.items?.[index]?.ingredientId)}
                    >
                      <option value="">選擇食材</option>
                      {ingredients.map(i => (
                        <option key={i.id} value={i.id}>
                          {i.name}（{i.unit}）
                        </option>
                      ))}
                    </select>
                    {errors.items?.[index]?.ingredientId && (
                      <p style={errorStyle}>{errors.items[index].ingredientId.message}</p>
                    )}
                  </div>

                  {/* 數量 */}
                  <div>
                    <input
                      {...register(`items.${index}.quantity`, { valueAsNumber: true })}
                      type="number"
                      min={0.01}
                      step={0.01}
                      style={inputStyle(!!errors.items?.[index]?.quantity)}
                    />
                    {errors.items?.[index]?.quantity && (
                      <p style={errorStyle}>{errors.items[index].quantity.message}</p>
                    )}
                  </div>

                  {/* 單價 */}
                  <div>
                    <input
                      {...register(`items.${index}.unitPrice`, { valueAsNumber: true })}
                      type="number"
                      min={0}
                      step={0.01}
                      style={inputStyle(!!errors.items?.[index]?.unitPrice)}
                    />
                    {errors.items?.[index]?.unitPrice && (
                      <p style={errorStyle}>{errors.items[index].unitPrice.message}</p>
                    )}
                  </div>

                  {/* 小計 */}
                  <div style={{ padding: '8px 0', fontSize: '14px', color: '#374151', fontWeight: 500 }}>
                    NT$ {subtotal.toLocaleString()}
                  </div>

                  {/* 刪除按鈕 */}
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    disabled={fields.length === 1}
                    // 只剩一列時 disable，確保至少有一筆明細
                    style={{
                      padding: '6px',
                      border: 'none',
                      background: 'none',
                      color: fields.length === 1 ? '#D1D5DB' : '#DC2626',
                      cursor: fields.length === 1 ? 'not-allowed' : 'pointer',
                      fontSize: '16px',
                    }}
                  >
                    ✕
                  </button>
                </div>
              )
            })}

            {errors.items?.root && (
              <p style={errorStyle}>{errors.items.root.message}</p>
            )}
          </div>

          {/* 總金額顯示 */}
          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 0',
            borderTop: '2px solid #E5E7EB',
            marginBottom: '16px',
          }}>
            <span style={{ fontSize: '14px', color: '#6B7280' }}>採購總金額</span>
            <span style={{ fontSize: '20px', fontWeight: 700, color: '#1E3A5F' }}>
              NT$ {totalAmount.toLocaleString()}
            </span>
          </div>

          {/* 備註 */}
          <div style={{ marginBottom: '24px' }}>
            <label style={labelStyle}>備註</label>
            <textarea
              {...register('note')}
              placeholder="選填，例：急件、需冷藏配送"
              rows={2}
              style={{ ...inputStyle(false), resize: 'vertical' }}
            />
          </div>

          {/* 按鈕列 */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              style={{
                padding: '10px 20px',
                border: '1px solid #E5E7EB',
                borderRadius: '6px',
                background: '#fff',
                fontSize: '14px',
                cursor: 'pointer',
                color: '#374151',
              }}
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isPending}
              style={{
                padding: '10px 20px',
                border: 'none',
                borderRadius: '6px',
                background: isPending ? '#93C5FD' : '#1E40AF',
                fontSize: '14px',
                cursor: isPending ? 'not-allowed' : 'pointer',
                color: '#fff',
              }}
            >
              {isPending ? '建立中...' : '建立採購單'}
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
    width: '100%',
    padding: '7px 10px',
    border: `1px solid ${hasError ? '#DC2626' : '#E5E7EB'}`,
    borderRadius: '6px',
    fontSize: '13px',
    outline: 'none',
    boxSizing: 'border-box',
  }
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: '6px',
  fontSize: '13px',
  fontWeight: 500,
  color: '#374151',
}

const errorStyle: React.CSSProperties = {
  margin: '4px 0 0',
  fontSize: '12px',
  color: '#DC2626',
}

export default PurchaseFormModal