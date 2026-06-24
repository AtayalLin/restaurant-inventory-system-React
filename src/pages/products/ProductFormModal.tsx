import { useEffect } from 'react'
// useEffect：當 product prop 變動時（從新增切到編輯），重設表單內容
// 為什麼需要：useForm 的 defaultValues 只在元件初始化時讀取一次，
//             後續 prop 變動不會自動更新，需要手動呼叫 reset()

import { useForm } from 'react-hook-form'
// useForm：管理表單狀態（欄位值、錯誤、送出狀態）
// 為什麼用 react-hook-form 不用 useState：
//   純 useState 每個欄位都要一個 state，10 個欄位就要 10 個 useState
//   react-hook-form 用 ref 追蹤欄位值，re-render 次數少很多，效能更好

import { zodResolver } from '@hookform/resolvers/zod'
// zodResolver：把 zod schema 接到 react-hook-form 的驗證系統
// 關聯：@hookform/resolvers v5 + zod v4（已確認相容）

import { z } from 'zod'
// z：zod 的核心物件，用來定義資料驗證規則（schema）
// 為什麼用 zod：schema 可同時當作「驗證規則」和「TypeScript 型別推導來源」，一份定義兩用

import { useCreateProduct, useUpdateProduct } from '../../hooks/useProducts'
// 關聯：src/hooks/useProducts.ts
// useCreateProduct：POST /api/products（新增模式）
// useUpdateProduct：PATCH /api/products/:id（編輯模式）

import type { Product } from '../../types'
// 關聯：src/types/index.ts
// Product 型別：{ id, name, categoryId, price, taxType, description, imageUrl, recipe, isActive, createdAt }

import { useProductCategories } from '../../hooks/useProducts'
// 取得分類列表，給表單的「分類」下拉選單使用

// ── Zod Schema 定義 ────────────────────────────────────────
// 為什麼獨立定義在元件外：schema 是純資料定義，不需要每次 render 重新建立
// z.coerce.number()：HTML input 回傳的值永遠是 string，coerce 會自動轉成 number
//                    例如 input value "180" → number 180
const productSchema = z.object({
  name: z.string()
    .min(1, '商品名稱為必填')
    .max(50, '商品名稱最多 50 個字'),
  // name：string，最少 1 字（必填），最多 50 字

  categoryId: z.string()
    .min(1, '請選擇商品分類'),
  // categoryId：string（分類的 UUID），不可為空

  price: z.number()
    .min(1, '售價必須大於 0')
    .max(99999, '售價不可超過 99,999'),
  // price：從 string 強制轉 number，範圍 1–99999

  taxType: z.enum(['TAX_5', 'TAX_10', 'TAX_FREE']),
  // taxType：只能是這三個值之一，對應 types/index.ts 的 TaxType

  description: z.string().max(200, '描述最多 200 個字'),
  // description：選填，但不可超過 200 字

  isActive: z.boolean(),
  // isActive：checkbox 的 true/false，決定商品是否在售
})

// 從 schema 自動推導 TypeScript 型別
// 為什麼這樣做：不用手動寫 interface，schema 和型別永遠同步
type ProductFormData = z.infer<typeof productSchema>
// ProductFormData = {
//   name: string
//   categoryId: string
//   price: number
//   taxType: 'TAX_5' | 'TAX_10' | 'TAX_FREE'
//   description: string
//   isActive: boolean
// }

// ── Props 定義 ─────────────────────────────────────────────
interface Props {
  product: Product | null
  // product = null  → 新增模式（表單空白）
  // product = {...} → 編輯模式（表單帶入現有資料）
  onClose: () => void
  // onClose：關閉 Modal 的回呼，由 ProductsPage 傳入
  // 關聯：ProductsPage 的 handleModalClose()
}

function ProductFormModal({ product, onClose }: Props) {
  const isEditMode = product !== null
  // isEditMode：用來決定標題文字、按鈕文字、呼叫哪個 API
  // 為什麼用衍生變數而不是 prop：減少父元件需要傳入的資訊，邏輯內聚

  // ── 取得分類資料（給下拉選單） ──────────────────────────
  const { data: categories = [] } = useProductCategories()
  // 關聯：useProductCategories() 打 GET /api/productCategories
  // 為什麼在 Modal 裡再次呼叫：TanStack Query 會快取，不會重複發 request

  // ── Mutation Hooks ─────────────────────────────────────
  const { mutate: createProduct, isPending: isCreating } = useCreateProduct()
  // isPending：mutation 執行中為 true，用來 disable 按鈕防止重複送出
  // 關聯：useCreateProduct() 在 src/hooks/useProducts.ts

  const { mutate: updateProduct, isPending: isUpdating } = useUpdateProduct()
  // 關聯：useUpdateProduct() 在 src/hooks/useProducts.ts

  const isPending = isCreating || isUpdating
  // 任一 mutation 執行中，都 disable 送出按鈕

  // ── 表單初始化 ─────────────────────────────────────────
  const {
    register,
    // register：把 input/select 元素註冊到 react-hook-form，讓它追蹤欄位值
    handleSubmit,
    // handleSubmit：包裝 onSubmit，先執行 zod 驗證，通過才呼叫我們的函式
    reset,
    // reset：重設表單內容，編輯模式切換時用來帶入新資料
    formState: { errors },
    // errors：zod 驗證失敗的錯誤訊息，{ name: { message: '...' }, ... }
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    // resolver：把 zod schema 接到 react-hook-form，讓 handleSubmit 自動驗證
    defaultValues: {
      name:        product?.name        ?? '',
      categoryId:  product?.categoryId  ?? '',
      price:       product?.price       ?? 0,
      taxType:     product?.taxType     ?? 'TAX_5',
      description: product?.description ?? '',
      isActive:    product?.isActive    ?? true,
      // ??（nullish coalescing）：只有 null/undefined 才用預設值
      // 編輯模式：帶入 product 現有值
      // 新增模式：product 為 null，帶入空值/預設值
    },
  })

  // ── 切換編輯目標時重設表單 ────────────────────────────
  // 為什麼需要 useEffect + reset：
  //   useForm 的 defaultValues 只在元件「第一次 render」時讀取
  //   如果從編輯 A 商品直接切到編輯 B 商品（Modal 不關閉），
  //   表單不會自動更新，需要手動呼叫 reset() 帶入新資料
  useEffect(() => {
    reset({
      name:        product?.name        ?? '',
      categoryId:  product?.categoryId  ?? '',
      price:       product?.price       ?? 0,
      taxType:     product?.taxType     ?? 'TAX_5',
      description: product?.description ?? '',
      isActive:    product?.isActive    ?? true,
    })
  }, [product, reset])
  // 依賴陣列 [product, reset]：product 變動時才執行，reset 是穩定引用不會觸發

  // ── 表單送出 ──────────────────────────────────────────
  // handleSubmit 會先執行 zod 驗證，通過才呼叫 onSubmit
  // onSubmit 接到的 data 已是 ProductFormData 型別（number 已轉好）
  function onSubmit(data: ProductFormData) {
    if (isEditMode) {
      // 編輯模式：PATCH /api/products/:id，只傳有變動的欄位
      updateProduct(
        { id: product.id, data },
        {
          onSuccess: () => {
            // 更新成功後關閉 Modal
            // onSuccess 在這裡定義而不在 hook 裡，是因為「關閉 Modal」是 UI 邏輯
            // API 成功的快取刷新邏輯則在 hook 的 onSuccess 處理（關注點分離）
            onClose()
          },
        }
      )
    } else {
      // 新增模式：POST /api/products，id 和 createdAt 由 useCreateProduct 補上
      createProduct(
        {
          ...data,
          imageUrl: null,   // 圖片上傳功能 Week 3 再加
          recipe:   [],     // 食譜用料設定 Week 3 再加
        },
        {
          onSuccess: () => {
            onClose()
          },
        }
      )
    }
  }

  // ── 畫面渲染 ──────────────────────────────────────────
  return (
    // 全畫面遮罩：fixed 固定定位，蓋住整個視窗
    <div
      onClick={onClose}
      // 點擊遮罩關閉 Modal（點到 Modal 本體不會關閉，因為下面有 stopPropagation）
      style={{
        position: 'fixed',
        inset: 0,                          // top/right/bottom/left 全部 0
        background: 'rgba(0,0,0,0.5)',     // 半透明黑色遮罩
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,                      // 蓋住所有內容
      }}
    >
      {/* Modal 本體 */}
      <div
        onClick={e => e.stopPropagation()}
        // stopPropagation：阻止點擊事件冒泡到遮罩，避免點 Modal 內容時關閉
        style={{
          background: '#fff',
          borderRadius: '12px',
          padding: '32px',
          width: '480px',
          maxWidth: '90vw',               // 手機版不超出螢幕
          maxHeight: '85vh',              // 超出螢幕高度時可捲動
          overflowY: 'auto',
          boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
        }}
      >
        {/* 標題列 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h3 style={{ margin: 0, fontSize: '18px', color: '#1E3A5F' }}>
            {isEditMode ? '編輯商品' : '新增商品'}
          </h3>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#6B7280' }}
          >
            ✕
          </button>
        </div>

        {/* 表單 */}
        <form onSubmit={handleSubmit(onSubmit)}>

          {/* 商品名稱 */}
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>
              商品名稱 <span style={{ color: '#DC2626' }}>*</span>
            </label>
            <input
              {...register('name')}
              // register('name')：把這個 input 交給 react-hook-form 管理
              // 展開後等同於 { name, ref, onChange, onBlur }
              placeholder="例：招牌牛肉麵"
              style={inputStyle(!!errors.name)}
              // !!errors.name：有錯誤時邊框變紅
            />
            {errors.name && <p style={errorStyle}>{errors.name.message}</p>}
            {/* errors.name.message 來自 zod schema 定義的錯誤訊息 */}
          </div>

          {/* 商品分類 */}
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>
              商品分類 <span style={{ color: '#DC2626' }}>*</span>
            </label>
            <select
              {...register('categoryId')}
              style={inputStyle(!!errors.categoryId)}
            >
              <option value="">請選擇分類</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            {errors.categoryId && <p style={errorStyle}>{errors.categoryId.message}</p>}
          </div>

{/* 售價 */}
<div style={{ marginBottom: '16px' }}>
  <label style={labelStyle}>
    售價（未稅）<span style={{ color: '#DC2626' }}>*</span>
  </label>
  {/* 為什麼用 wrapper div：input type="number" 不支援前綴文字，
      用相對定位的容器把 NT$ 疊在 input 左側 */}
  <div style={{ position: 'relative' }}>
    <span style={{
      position: 'absolute',
      left: '12px',
      top: '50%',
      transform: 'translateY(-50%)',
      fontSize: '14px',
      color: '#6B7280',
      pointerEvents: 'none',  // 點擊穿透，不擋 input 操作
    }}>
      NT$
    </span>
    <input
      {...register('price', { valueAsNumber: true })}
      type="number"
      min={1}
      placeholder="0"
      style={{
        ...inputStyle(!!errors.price),
        paddingLeft: '44px',  // 留空間給 NT$ 前綴
      }}
    />
  </div>
  {errors.price && <p style={errorStyle}>{errors.price.message}</p>}
</div>

          {/* 商品描述 */}
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>商品描述</label>
            <textarea
              {...register('description')}
              placeholder="選填，之後可用 AI 一鍵生成"
              rows={3}
              style={{
                ...inputStyle(!!errors.description),
                resize: 'vertical',   // 只允許垂直調整大小
              }}
            />
            {errors.description && <p style={errorStyle}>{errors.description.message}</p>}
          </div>

          {/* 販售狀態 */}
          <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              {...register('isActive')}
              type="checkbox"
              id="isActive"
              style={{ width: '16px', height: '16px', cursor: 'pointer' }}
            />
            <label htmlFor="isActive" style={{ fontSize: '14px', color: '#374151', cursor: 'pointer' }}>
              上架販售中
            </label>
          </div>

          {/* 送出按鈕列 */}
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
                cursor: isPending ? 'not-allowed' : 'pointer',
                color: '#374151',
              }}
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isPending}
              // isPending 為 true 時 disable，防止重複點擊送出多次請求
              style={{
                padding: '10px 20px',
                border: 'none',
                borderRadius: '6px',
                background: isPending ? '#93C5FD' : '#1E40AF',
                // 執行中顏色變淡，給使用者視覺回饋
                fontSize: '14px',
                cursor: isPending ? 'not-allowed' : 'pointer',
                color: '#fff',
              }}
            >
              {isPending ? '處理中...' : isEditMode ? '儲存變更' : '新增商品'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── 共用樣式函式 ──────────────────────────────────────────────
// 為什麼抽成函式而不是 inline object：
//   多個 input 共用相同基底樣式，有錯誤時才改邊框色
//   抽出來避免重複，修改時只需改一處
function inputStyle(hasError: boolean): React.CSSProperties {
  return {
    width: '100%',
    padding: '8px 12px',
    border: `1px solid ${hasError ? '#DC2626' : '#E5E7EB'}`,
    // hasError：true → 紅色邊框（危險色）；false → 灰色邊框（正常）
    borderRadius: '6px',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
    // boxSizing border-box：width 100% 包含 padding，不會超出容器
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
  color: '#DC2626',  // 危險色：對應設計系統
}

export default ProductFormModal 