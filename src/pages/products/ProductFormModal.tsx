// 新增／編輯商品的對話框
// product = null 為新增模式；傳入 Product 為編輯模式（同一份表單共用）
// 驗證：react-hook-form + Zod；AI 文案：串流逐字填入描述欄
import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Sparkles } from 'lucide-react'
import { generateProductDescription } from '../../hooks/useAI'
import { useCreateProduct, useUpdateProduct, useProductCategories } from '../../hooks/useProducts'
import { Button, Field, Modal, inputClass, useToast, errorMessage } from '../../components/ui'
import type { Product } from '../../types'

// 表單驗證規則：錯誤訊息直接顯示在欄位下方
const productSchema = z.object({
  name: z.string().trim().min(1, '商品名稱為必填').max(50, '商品名稱最多 50 個字'),
  categoryId: z.string().min(1, '請選擇商品分類'),
  // 數字欄位清空時 valueAsNumber 會得到 NaN，用自訂訊息取代 Zod 預設的英文
  price: z.number({ error: '請輸入售價' }).min(1, '售價必須大於 0').max(99999, '售價不可超過 99,999'),
  taxType: z.enum(['TAX_5', 'TAX_10', 'TAX_FREE']),
  description: z.string().max(200, '描述最多 200 個字'),
  isActive: z.boolean(),
})
type ProductFormData = z.infer<typeof productSchema>

interface Props {
  product: Product | null
  onClose: () => void
}

function ProductFormModal({ product, onClose }: Props) {
  const isEditMode = product !== null
  const toast = useToast()
  const [isAIGenerating, setIsAIGenerating] = useState(false)

  const { data: categories = [] } = useProductCategories()
  const { mutate: createProduct, isPending: isCreating } = useCreateProduct()
  const { mutate: updateProduct, isPending: isUpdating } = useUpdateProduct()
  const isPending = isCreating || isUpdating

  // Modal 每次開啟都會重新掛載，defaultValues 就是當次的初始值，不需要另外 reset
  const { register, handleSubmit, setValue, getValues, control, formState: { errors } } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: product?.name ?? '',
      categoryId: product?.categoryId ?? '',
      price: product?.price ?? 0,
      taxType: product?.taxType ?? 'TAX_5',
      description: product?.description ?? '',
      isActive: product?.isActive ?? true,
    },
  })

  // 監聽名稱與分類：兩者都有值才能使用 AI 生成
  const [name, categoryId, price] = useWatch({ control, name: ['name', 'categoryId', 'price'] })
  const canGenerate = Boolean(name?.trim() && categoryId) && !isAIGenerating

  async function handleAIGenerate() {
    const categoryName = categories.find(c => c.id === categoryId)?.name ?? ''
    setIsAIGenerating(true)
    setValue('description', '')
    try {
      // 串流：每收到一段文字就接到描述欄後面，使用者看得到逐字生成
      for await (const chunk of generateProductDescription(name, categoryName, Number(price) || 0)) {
        setValue('description', getValues('description') + chunk, { shouldValidate: true })
      }
    } catch (err) {
      toast.error(errorMessage(err, 'AI 生成失敗，請稍後再試'))
    } finally {
      setIsAIGenerating(false)
    }
  }

  function onSubmit(data: ProductFormData) {
    const callbacks = {
      onSuccess: () => {
        toast.success(isEditMode ? `已更新「${data.name}」` : `已新增「${data.name}」`)
        onClose()
      },
      onError: (err: unknown) => toast.error(errorMessage(err, '儲存失敗，請稍後再試')),
    }
    if (isEditMode) updateProduct({ id: product.id, data }, callbacks)
    else createProduct({ ...data, imageUrl: null, recipe: [] }, callbacks) // 配方之後在商品詳情設定
  }

  return (
    <Modal
      title={isEditMode ? '編輯商品' : '新增商品'}
      onClose={onClose}
      busy={isPending}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isPending}>取消</Button>
          {/* form 屬性：按鈕在 <form> 外面（Modal 底部），仍能送出這張表單 */}
          <Button type="submit" form="product-form" loading={isPending}>
            {isEditMode ? '儲存變更' : '新增商品'}
          </Button>
        </>
      }
    >
      <form id="product-form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <Field label="商品名稱" required error={errors.name?.message}>
          <input {...register('name')} placeholder="例：招牌牛肉麵" autoFocus className={inputClass(!!errors.name)} />
        </Field>

        <div className="grid gap-x-4 sm:grid-cols-2">
          <Field label="商品分類" required error={errors.categoryId?.message}>
            <select {...register('categoryId')} className={inputClass(!!errors.categoryId)}>
              <option value="">請選擇分類</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="稅別">
            <select {...register('taxType')} className={inputClass()}>
              <option value="TAX_5">含稅 5%</option>
              <option value="TAX_10">含稅 10%</option>
              <option value="TAX_FREE">免稅</option>
            </select>
          </Field>
        </div>

        <Field label="售價（未稅，NT$）" required error={errors.price?.message}>
          <input
            {...register('price', { valueAsNumber: true })}
            type="number"
            inputMode="numeric"
            min={1}
            className={`${inputClass(!!errors.price)} tabular`}
          />
        </Field>

        <Field
          label="商品描述"
          error={errors.description?.message}
          hint="選填，最多 200 字"
          aside={
            <Button variant="ghost" size="sm" onClick={handleAIGenerate} disabled={!canGenerate}
              loading={isAIGenerating} icon={<Sparkles size={14} aria-hidden="true" />}
              className="text-ai-600 hover:bg-ai-50 hover:text-ai-700"
              title={canGenerate ? undefined : '請先填寫商品名稱與分類'}>
              {isAIGenerating ? '生成中…' : 'AI 生成描述'}
            </Button>
          }
        >
          <textarea {...register('description')} rows={3} placeholder="可點擊「AI 生成描述」自動產生"
            className={`${inputClass(!!errors.description)} resize-y`} />
        </Field>

        <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-2">
          <input {...register('isActive')} type="checkbox" className="size-4 accent-brand-700" />
          上架販售中
        </label>
      </form>
    </Modal>
  )
}

export default ProductFormModal
