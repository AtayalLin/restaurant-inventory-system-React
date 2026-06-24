// ============================================================
// 共用輔助型別
// ============================================================

export type ID = string

// ============================================================
// 模組一：商品（Product）
// ============================================================

export type TaxType = 'TAX_5' | 'TAX_10' | 'TAX_FREE'

export interface RecipeItem {
  ingredientId: ID
  quantity: number
}

export interface Product {
  id: ID
  name: string
  categoryId: ID
  price: number
  taxType: TaxType
  description: string
  imageUrl: string | null
  recipe: RecipeItem[]
  isActive: boolean
  createdAt: string
}

export interface ProductCategory {
  id: ID
  name: string
}

// ============================================================
// 模組二：食材（Ingredient）
// ============================================================

export interface Ingredient {
  id: ID
  name: string
  unit: string
  category: string
  supplierId: ID | null
  currentStock: number
  safetyStock: number
  expiryDays: number | null
  costPerUnit: number
  createdAt: string
}

export interface StockLog {
  id: ID
  ingredientId: ID
  type: 'IN' | 'OUT' | 'ADJUST' | 'WASTE'
  quantity: number
  note: string
  createdAt: string
}

// ============================================================
// 模組三：供應商（Supplier）
// ============================================================

export interface Supplier {
  id: ID
  name: string
  contact: string
  phone: string
  paymentTerm: string
  createdAt: string
}

// ============================================================
// 模組四：採購單（PurchaseOrder）
// ============================================================

export type PurchaseStatus = 'PENDING' | 'ORDERED' | 'RECEIVED' | 'CANCELLED'

export interface PurchaseItem {
  ingredientId: ID
  quantity: number
  unitPrice: number
}

export interface PurchaseOrder {
  id: ID
  supplierId: ID
  status: PurchaseStatus
  items: PurchaseItem[]
  totalAmount: number
  expectedDate: string | null
  receivedDate: string | null
  note: string
  createdAt: string
}

// ============================================================
// 模組五：銷貨單（SalesOrder）
// ============================================================

export type SalesStatus = 'PENDING' | 'PREPARING' | 'COMPLETED' | 'REFUNDED'
export type SalesChannel = 'DINE_IN' | 'TAKEOUT' | 'DELIVERY'

export interface SalesItem {
  productId: ID
  quantity: number
  unitPrice: number
}

export interface SalesOrder {
  id: ID
  status: SalesStatus
  items: SalesItem[]
  subtotal: number
  taxAmount: number
  discount: number
  total: number
  channel: SalesChannel
  note: string
  createdAt: string
}

// ============================================================
// 模組六：系統設定（Settings）
// ============================================================

export type CurrencyCode = 'NTD' | 'JPY' | 'KRW'
export type UserRole = 'OWNER' | 'MANAGER' | 'STAFF'

export interface SystemSettings {
  taxRate: number
  currency: CurrencyCode
  lowStockThreshold: number
  expiryWarningDays: number
}

export interface User {
  id: ID
  name: string
  role: UserRole
}