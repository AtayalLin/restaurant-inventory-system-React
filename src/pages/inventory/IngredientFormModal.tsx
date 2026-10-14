// 新增／編輯食材的對話框
// ingredient = null 為新增模式；傳入 Ingredient 為編輯模式
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useCreateIngredient, useUpdateIngredient, useSuppliers } from '../../hooks/useIngredients'
import { Button, Field, Modal, inputClass, useToast, errorMessage } from '../../components/ui'
import type { Ingredient } from '../../types'

// 數字欄位清空時會得到 NaN，統一給中文訊息
const num = (label: string) => z.number({ error: `請輸入${label}` }).min(0, `${label}不可為負數`)

const ingredientSchema = z.object({
  name: z.string().trim().min(1, '食材名稱為必填').max(50, '食材名稱最多 50 個字'),
  unit: z.string().trim().min(1, '單位為必填').max(10, '單位最多 10 個字'),
  category: z.string().trim().min(1, '分類為必填'),
  supplierId: z.string(),
  currentStock: num('現有庫存'),
  safetyStock: num('安全庫存'),
  // 效期允許留空（= 不會過期），所以用字串接收；有填時必須是正整數
  expiryDays: z.string().refine(v => v === '' || (Number.isInteger(Number(v)) && Number(v) >= 1), '請輸入 1 以上的整數天數，或留空'),
  costPerUnit: num('單位成本'),
})
type IngredientFormData = z.infer<typeof ingredientSchema>

interface Props {
  ingredient: Ingredient | null
  onClose: () => void
}

function IngredientFormModal({ ingredient, onClose }: Props) {
  const isEditMode = ingredient !== null
  const toast = useToast()
  const { data: suppliers = [] } = useSuppliers()
  const { mutate: createIngredient, isPending: isCreating } = useCreateIngredient()
  const { mutate: updateIngredient, isPending: isUpdating } = useUpdateIngredient()
  const isPending = isCreating || isUpdating

  // Modal 每次開啟都重新掛載，defaultValues 即為初始值
  const { register, handleSubmit, formState: { errors } } = useForm<IngredientFormData>({
    resolver: zodResolver(ingredientSchema),
    defaultValues: {
      name: ingredient?.name ?? '',
      unit: ingredient?.unit ?? 'g',
      category: ingredient?.category ?? '',
      supplierId: ingredient?.supplierId ?? '',
      currentStock: ingredient?.currentStock ?? 0,
      safetyStock: ingredient?.safetyStock ?? 0,
      expiryDays: ingredient?.expiryDays?.toString() ?? '',
      costPerUnit: ingredient?.costPerUnit ?? 0,
    },
  })

  function onSubmit(data: IngredientFormData) {
    // 表單的空字串轉回資料庫格式的 null
    const payload = {
      ...data,
      supplierId: data.supplierId === '' ? null : data.supplierId,
      expiryDays: data.expiryDays === '' ? null : Number(data.expiryDays),
    }
    const callbacks = {
      onSuccess: () => {
        toast.success(isEditMode ? `已更新「${data.name}」` : `已新增「${data.name}」`)
        onClose()
      },
      onError: (err: unknown) => toast.error(errorMessage(err, '儲存失敗，請稍後再試')),
    }
    if (isEditMode) updateIngredient({ id: ingredient.id, data: payload }, callbacks)
    else createIngredient(payload, callbacks)
  }

  const numberInput = (key: 'currentStock' | 'safetyStock' | 'costPerUnit', step: string) => (
    <input {...register(key, { valueAsNumber: true })} type="number" min={0} step={step}
      inputMode="decimal" className={`${inputClass(!!errors[key])} tabular`} />
  )

  return (
    <Modal
      title={isEditMode ? '編輯食材' : '新增食材'}
      onClose={onClose}
      busy={isPending}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isPending}>取消</Button>
          <Button type="submit" form="ingredient-form" loading={isPending}>
            {isEditMode ? '儲存變更' : '新增食材'}
          </Button>
        </>
      }
    >
      <form id="ingredient-form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="grid gap-x-4 sm:grid-cols-[2fr_1fr]">
          <Field label="食材名稱" required error={errors.name?.message}>
            <input {...register('name')} placeholder="例：牛腱肉" autoFocus className={inputClass(!!errors.name)} />
          </Field>
          <Field label="單位" required error={errors.unit?.message}>
            <input {...register('unit')} placeholder="例：g、顆" className={inputClass(!!errors.unit)} />
          </Field>
        </div>

        <div className="grid gap-x-4 sm:grid-cols-2">
          <Field label="分類" required error={errors.category?.message}>
            <input {...register('category')} placeholder="例：肉類、乾貨" className={inputClass(!!errors.category)} />
          </Field>
          <Field label="主要供應商">
            <select {...register('supplierId')} className={inputClass()}>
              <option value="">無指定供應商</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Field>
        </div>

        <div className="grid gap-x-4 sm:grid-cols-2">
          <Field label="現有庫存" required error={errors.currentStock?.message}>{numberInput('currentStock', '0.01')}</Field>
          <Field label="安全庫存" required error={errors.safetyStock?.message} hint="低於此數量會出現低庫存警示">
            {numberInput('safetyStock', '0.01')}
          </Field>
        </div>

        <div className="grid gap-x-4 sm:grid-cols-2">
          <Field label="保存效期（天）" error={errors.expiryDays?.message} hint="留空表示不會過期">
            <input {...register('expiryDays')} type="number" min={1} inputMode="numeric" className={inputClass(!!errors.expiryDays)} />
          </Field>
          <Field label="單位成本（元）" error={errors.costPerUnit?.message} hint="用於計算商品毛利率">
            {numberInput('costPerUnit', '0.001')}
          </Field>
        </div>
      </form>
    </Modal>
  )
}

export default IngredientFormModal
