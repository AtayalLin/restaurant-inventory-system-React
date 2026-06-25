import { useEffect } from 'react'
// useEffect：ingredient prop 變動時重設表單，原因同 ProductFormModal
// 關聯：src/pages/products/ProductFormModal.tsx（相同設計模式）

import { useForm } from 'react-hook-form'
// 管理表單狀態，避免每個欄位都需要 useState
// 關聯：react-hook-form v7.80.0

import { zodResolver } from '@hookform/resolvers/zod'
// 把 zod schema 接到 react-hook-form 的驗證系統
// 關聯：@hookform/resolvers v5、zod v4

import { z } from 'zod'
// 定義驗證規則，同時作為 TypeScript 型別的來源

import { useCreateIngredient, useUpdateIngredient, useSuppliers } from '../../hooks/useIngredients'
// 關聯：src/hooks/useIngredients.ts
// useCreateIngredient：POST /api/ingredients
// useUpdateIngredient：PATCH /api/ingredients/:id
// useSuppliers：GET /api/suppliers（給供應商下拉選單）

import type { Ingredient } from '../../types'
// 關聯：src/types/index.ts

// ── Zod Schema ────────────────────────────────────────────
// 為什麼定義在元件外：schema 是純資料，不需要每次 render 重新建立
const ingredientSchema = z.object({
  name: z.string()
    .min(1, '食材名稱為必填')
    .max(50, '食材名稱最多 50 個字'),

  unit: z.string()
    .min(1, '單位為必填')
    .max(10, '單位最多 10 個字'),
  // unit 範例：g、kg、ml、個、包
  // 為什麼不用 enum：單位種類多且可能隨需求增加，自由字串更彈性

  category: z.string()
    .min(1, '分類為必填'),
  // 分類是自由字串，不綁定外鍵

  supplierId: z.string(),
  // 表單層用空字串代表「無供應商」
  // 為什麼不用 z.string().nullable()：
  //   HTML select 的值永遠是 string，nullable 會導致型別不符
  //   在 onSubmit 裡手動把空字串轉成 null 再送出

  currentStock: z.number()
    .min(0, '庫存不可為負數'),
  // 新增食材時填入初始庫存量
  // min(0)：庫存可以是 0（缺貨狀態），但不可為負數

  safetyStock: z.number()
    .min(0, '安全庫存不可為負數'),
  // 低於此數量時顯示「庫存不足」警示

  expiryDays: z.string(),
  // 表單層用空字串代表「無效期限制（null）」
  // 為什麼不用 z.number().nullable()：同 supplierId 的原因
  // 在 onSubmit 裡手動轉換

  costPerUnit: z.number()
    .min(0, '成本不可為負數'),
  // 每單位成本，支援小數（例如每克 0.18 元）
})

type IngredientFormData = z.infer<typeof ingredientSchema>
// 自動推導型別，不需要手動寫 interface
// IngredientFormData = {
//   name: string, unit: string, category: string,
//   supplierId: string,    ← 空字串代表 null
//   currentStock: number, safetyStock: number,
//   expiryDays: string,   ← 空字串代表 null，有值代表數字字串
//   costPerUnit: number
// }

// ── Props ─────────────────────────────────────────────────
interface Props {
  ingredient: Ingredient | null
  // null → 新增模式；Ingredient → 編輯模式
  onClose: () => void
  // 關聯：InventoryPage 的 handleModalClose()
}

function IngredientFormModal({ ingredient, onClose }: Props) {
  const isEditMode = ingredient !== null

  // ── 供應商資料（給下拉選單） ──────────────────────────
  const { data: suppliers = [] } = useSuppliers()
  // TanStack Query 快取，不會重複發 request

  // ── Mutation Hooks ─────────────────────────────────────
  const { mutate: createIngredient, isPending: isCreating } = useCreateIngredient()
  const { mutate: updateIngredient, isPending: isUpdating } = useUpdateIngredient()
  const isPending = isCreating || isUpdating

  // ── 表單初始化 ─────────────────────────────────────────
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<IngredientFormData>({
    resolver: zodResolver(ingredientSchema),
    defaultValues: {
      name:         ingredient?.name                         ?? '',
      unit:         ingredient?.unit                         ?? 'g',
      // 預設單位 'g'：最常用的食材單位
      category:     ingredient?.category                     ?? '',
      supplierId:   ingredient?.supplierId                   ?? '',
      // supplierId 為 null 時給空字串，對應 select 的「無供應商」option
      currentStock: ingredient?.currentStock                 ?? 0,
      safetyStock:  ingredient?.safetyStock                  ?? 0,
      expiryDays:   ingredient?.expiryDays?.toString()       ?? '',
      // expiryDays 為 number 時轉成字串；為 null 時給空字串
      // 為什麼轉字串：HTML input 的值只能是 string
      costPerUnit:  ingredient?.costPerUnit                  ?? 0,
    },
  })

  // ── 切換編輯目標時重設表單 ────────────────────────────
  useEffect(() => {
    reset({
      name:         ingredient?.name                         ?? '',
      unit:         ingredient?.unit                         ?? 'g',
      category:     ingredient?.category                     ?? '',
      supplierId:   ingredient?.supplierId                   ?? '',
      currentStock: ingredient?.currentStock                 ?? 0,
      safetyStock:  ingredient?.safetyStock                  ?? 0,
      expiryDays:   ingredient?.expiryDays?.toString()       ?? '',
      costPerUnit:  ingredient?.costPerUnit                  ?? 0,
    })
  }, [ingredient, reset])

  // ── 表單送出 ──────────────────────────────────────────
  function onSubmit(data: IngredientFormData) {
    // 在這裡做字串 → null 的轉換，再送到 API
    const payload = {
      ...data,
      supplierId: data.supplierId === '' ? null : data.supplierId,
      // 空字串 → null：表示這個食材沒有指定供應商
      expiryDays: data.expiryDays === '' ? null : Number(data.expiryDays),
      // 空字串 → null：無效期限制
      // 有值 → 轉成 number：例如 '3' → 3
    }

    if (isEditMode) {
      updateIngredient(
        { id: ingredient.id, data: payload },
        { onSuccess: onClose }
        // 更新成功後關閉 Modal，快取刷新由 hook 的 onSuccess 處理
      )
    } else {
      createIngredient(
        payload,
        { onSuccess: onClose }
      )
    }
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
          width: '520px',
          maxWidth: '90vw',
          maxHeight: '85vh',
          overflowY: 'auto',
          boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
        }}
      >
        {/* 標題列 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h3 style={{ margin: 0, fontSize: '18px', color: '#1E3A5F' }}>
            {isEditMode ? '編輯食材' : '新增食材'}
          </h3>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#6B7280' }}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>

          {/* 第一列：名稱 + 單位 */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div>
              <label style={labelStyle}>食材名稱 <span style={{ color: '#DC2626' }}>*</span></label>
              <input
                {...register('name')}
                placeholder="例：牛腱肉"
                style={inputStyle(!!errors.name)}
              />
              {errors.name && <p style={errorStyle}>{errors.name.message}</p>}
            </div>
            <div>
              <label style={labelStyle}>單位 <span style={{ color: '#DC2626' }}>*</span></label>
              <input
                {...register('unit')}
                placeholder="例：g、個"
                style={inputStyle(!!errors.unit)}
              />
              {errors.unit && <p style={errorStyle}>{errors.unit.message}</p>}
            </div>
          </div>

          {/* 分類 */}
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>分類 <span style={{ color: '#DC2626' }}>*</span></label>
            <input
              {...register('category')}
              placeholder="例：肉類、乾貨、飲料原料"
              style={inputStyle(!!errors.category)}
            />
            {errors.category && <p style={errorStyle}>{errors.category.message}</p>}
          </div>

          {/* 供應商 */}
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>主要供應商</label>
            <select {...register('supplierId')} style={inputStyle(false)}>
              <option value="">— 無指定供應商 —</option>
              {suppliers.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* 第二列：現有庫存 + 安全庫存 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div>
              <label style={labelStyle}>現有庫存 <span style={{ color: '#DC2626' }}>*</span></label>
              <input
                {...register('currentStock', { valueAsNumber: true })}
                type="number"
                min={0}
                step="0.01"
                placeholder="0"
                style={inputStyle(!!errors.currentStock)}
              />
              {errors.currentStock && <p style={errorStyle}>{errors.currentStock.message}</p>}
            </div>
            <div>
              <label style={labelStyle}>安全庫存 <span style={{ color: '#DC2626' }}>*</span></label>
              <input
                {...register('safetyStock', { valueAsNumber: true })}
                type="number"
                min={0}
                step="0.01"
                placeholder="0"
                style={inputStyle(!!errors.safetyStock)}
              />
              {errors.safetyStock && <p style={errorStyle}>{errors.safetyStock.message}</p>}
            </div>
          </div>

          {/* 第三列：效期天數 + 單位成本 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
            <div>
              <label style={labelStyle}>保存效期（天）</label>
              <input
                {...register('expiryDays')}
                type="number"
                min={1}
                placeholder="留空表示無限制"
                style={inputStyle(!!errors.expiryDays)}
              />
              {/* 為什麼用 register 不加 valueAsNumber：
                  需要允許空字串（代表 null），valueAsNumber 會把空字串轉成 NaN
                  改在 onSubmit 手動轉換 */}
              {errors.expiryDays && <p style={errorStyle}>{errors.expiryDays.message}</p>}
            </div>
            <div>
              <label style={labelStyle}>單位成本（元）</label>
              <input
                {...register('costPerUnit', { valueAsNumber: true })}
                type="number"
                min={0}
                step="0.001"
                placeholder="0.000"
                style={inputStyle(!!errors.costPerUnit)}
              />
              {errors.costPerUnit && <p style={errorStyle}>{errors.costPerUnit.message}</p>}
            </div>
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
                cursor: isPending ? 'not-allowed' : 'pointer',
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
              {isPending ? '處理中...' : isEditMode ? '儲存變更' : '新增食材'}
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
    padding: '8px 12px',
    border: `1px solid ${hasError ? '#DC2626' : '#E5E7EB'}`,
    borderRadius: '6px',
    fontSize: '14px',
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

export default IngredientFormModal