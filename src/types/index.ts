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
  version: number // 【新增】樂觀鎖版本號，初始為 0，每次更新 +1
}

export interface StockLog {
  id: string
  ingredientId: string
  changeType: 'SALE_DEDUCT' | 'PURCHASE_RECEIVE'
  quantityChange: number      // 正數＝增加，負數＝減少
  resultingStock: number      // 異動後的庫存數量
  referenceType: 'SALES_ORDER' | 'PURCHASE_ORDER'
  referenceId: string
  createdAt: string
  testBatchId: string | null // 【新增】併發測試批號，非測試資料為 null
}

// 【新增】單一食材在這次測試中的快照
export interface TestRunIngredientSnapshot {
  ingredientId: string
  ingredientName: string
  originalStock: number   // 測試前的真實庫存，用於還原
  originalVersion: number
  testStock: number       // 依 capacity × recipe 用量算出的測試用庫存
}

// 【新增】一次併發測試的完整紀錄
export interface TestRun {
  id: string
  productId: string
  productName: string
  ingredientSnapshots: TestRunIngredientSnapshot[]
  testCapacity: number          // 預期可承受的訂單數（例如 5）
  concurrentRequests: number    // 併發請求數（例如 100）
  status: 'PREPARED' | 'RUNNING' | 'COMPLETED' | 'CLEANED'
  successCount: number
  failCount: number
  finalStockSnapshots: { ingredientId: string; finalStock: number }[]
  isOverSold: boolean            // finalStock < 0 → true，正常情況必須是 false
  createdAt: string
  completedAt: string | null
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

// 【修改】SalesOrder、StockLog 都加上可選的 testBatchId，用來標記併發測試產生的資料
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
  testBatchId: string | null // 【新增】併發測試批號，非測試資料為 null
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