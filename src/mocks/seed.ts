/**
 * Demo 模式的種子資料
 *
 * 【為什麼不用 db/db.json】
 * db.json 是本機開發用的資料，訂單日期固定在過去，部署成線上 Demo 後
 * 儀表板的「今日營收」「近 7 天」會全部是 0，看起來像壞掉。
 * 這裡改成「以今天為基準」動態產生近 60 天的訂單，任何時候打開 Demo 都有數字。
 *
 * 【為什麼用固定種子的亂數】
 * Math.random() 每次重新整理結果都不同，截圖、說明文件會對不起來。
 * 用固定種子（mulberry32）讓同一天打開看到的資料一致，但仍然像真實營運資料。
 */
import type {
  Product, ProductCategory, Ingredient, Supplier,
  PurchaseOrder, SalesOrder, SalesChannel, StockLog, TestRun, SystemSettings,
} from '../types'

export interface DemoDB {
  products: Product[]
  productCategories: ProductCategory[]
  ingredients: Ingredient[]
  suppliers: Supplier[]
  purchaseOrders: PurchaseOrder[]
  salesOrders: SalesOrder[]
  stockLogs: StockLog[]
  testRuns: TestRun[]
  settings: SystemSettings
}

/** 固定種子的亂數產生器，回傳 0～1 */
function mulberry32(seed: number) {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const CREATED = '2026-06-01T08:00:00.000Z'

const productCategories: ProductCategory[] = [
  { id: 'cat001', name: '主食' },
  { id: 'cat002', name: '小菜' },
  { id: 'cat003', name: '飲料' },
]

const suppliers: Supplier[] = [
  { id: 's001', name: '台灣生鮮肉品行', contact: '陳老闆', phone: '0912-345-678', paymentTerm: '月結30天', createdAt: CREATED },
  { id: 's002', name: '大豐乾貨批發', contact: '林小姐', phone: '07-123-4567', paymentTerm: '貨到付款', createdAt: CREATED },
  { id: 's003', name: '南部蔬果合作社', contact: '王先生', phone: '0933-222-111', paymentTerm: '月結15天', createdAt: CREATED },
]

// currentStock 刻意讓部分食材低於安全庫存，Demo 時才看得到「低庫存警示」與「AI 補貨建議」
const ingredients: Ingredient[] = [
  { id: 'i001', name: '牛腱肉',   unit: 'g',  category: '肉類',     supplierId: 's001', currentStock: 1800,  safetyStock: 3000, expiryDays: 3,   costPerUnit: 0.32, createdAt: CREATED, version: 0 },
  { id: 'i002', name: '麵條',     unit: 'g',  category: '乾貨',     supplierId: 's002', currentStock: 1200,  safetyStock: 2000, expiryDays: 180, costPerUnit: 0.04, createdAt: CREATED, version: 0 },
  { id: 'i003', name: '豬五花肉', unit: 'g',  category: '肉類',     supplierId: 's001', currentStock: 4200,  safetyStock: 2000, expiryDays: 3,   costPerUnit: 0.22, createdAt: CREATED, version: 0 },
  { id: 'i004', name: '珍珠粉圓', unit: 'g',  category: '飲料原料', supplierId: 's002', currentStock: 2600,  safetyStock: 1000, expiryDays: 7,   costPerUnit: 0.08, createdAt: CREATED, version: 0 },
  { id: 'i005', name: '白米',     unit: 'g',  category: '乾貨',     supplierId: 's002', currentStock: 15000, safetyStock: 5000, expiryDays: 365, costPerUnit: 0.05, createdAt: CREATED, version: 0 },
  { id: 'i006', name: '青江菜',   unit: 'g',  category: '蔬菜',     supplierId: 's003', currentStock: 600,   safetyStock: 1500, expiryDays: 2,   costPerUnit: 0.06, createdAt: CREATED, version: 0 },
  { id: 'i007', name: '雞蛋',     unit: '顆', category: '蛋奶',     supplierId: 's003', currentStock: 90,    safetyStock: 60,   expiryDays: 14,  costPerUnit: 6,    createdAt: CREATED, version: 0 },
  { id: 'i008', name: '紅茶葉',   unit: 'g',  category: '飲料原料', supplierId: 's002', currentStock: 1500,  safetyStock: 500,  expiryDays: 270, costPerUnit: 0.6,  createdAt: CREATED, version: 0 },
  { id: 'i009', name: '鮮奶',     unit: 'ml', category: '蛋奶',     supplierId: 's003', currentStock: 3000,  safetyStock: 4000, expiryDays: 5,   costPerUnit: 0.09, createdAt: CREATED, version: 0 },
  { id: 'i010', name: '豆干',     unit: '片', category: '豆製品',   supplierId: 's003', currentStock: 120,   safetyStock: 50,   expiryDays: 4,   costPerUnit: 4,    createdAt: CREATED, version: 0 },
]

const products: Product[] = [
  { id: 'p001', name: '招牌牛肉麵', categoryId: 'cat001', price: 180, taxType: 'TAX_5', isActive: true, imageUrl: null, createdAt: CREATED,
    description: '牛骨湯頭熬煮八小時，搭配大塊牛腱與 Q 彈麵條，湯濃肉香。',
    recipe: [{ ingredientId: 'i001', quantity: 200 }, { ingredientId: 'i002', quantity: 150 }, { ingredientId: 'i006', quantity: 40 }] },
  { id: 'p002', name: '滷肉飯', categoryId: 'cat001', price: 45, taxType: 'TAX_5', isActive: true, imageUrl: null, createdAt: CREATED,
    description: '手切豬五花慢火滷製，肥瘦均勻，淋在熱騰騰白飯上最對味。',
    recipe: [{ ingredientId: 'i003', quantity: 60 }, { ingredientId: 'i005', quantity: 150 }] },
  { id: 'p003', name: '珍珠奶茶', categoryId: 'cat003', price: 60, taxType: 'TAX_5', isActive: true, imageUrl: null, createdAt: CREATED,
    description: '現煮黑糖珍珠配上濃郁紅茶與鮮奶，甜度剛好。',
    recipe: [{ ingredientId: 'i004', quantity: 60 }, { ingredientId: 'i008', quantity: 8 }, { ingredientId: 'i009', quantity: 150 }] },
  { id: 'p004', name: '雞腿飯', categoryId: 'cat001', price: 120, taxType: 'TAX_5', isActive: true, imageUrl: null, createdAt: CREATED,
    description: '酥炸雞腿外皮金黃，附滷蛋與時蔬。',
    recipe: [{ ingredientId: 'i005', quantity: 180 }, { ingredientId: 'i007', quantity: 1 }, { ingredientId: 'i006', quantity: 50 }] },
  { id: 'p005', name: '滷蛋', categoryId: 'cat002', price: 15, taxType: 'TAX_5', isActive: true, imageUrl: null, createdAt: CREATED,
    description: '滷汁浸泡一整晚，蛋白入味、蛋黃綿密。',
    recipe: [{ ingredientId: 'i007', quantity: 1 }] },
  { id: 'p006', name: '燙青菜', categoryId: 'cat002', price: 40, taxType: 'TAX_5', isActive: true, imageUrl: null, createdAt: CREATED,
    description: '當日新鮮青江菜，淋上油蔥與醬油膏。',
    recipe: [{ ingredientId: 'i006', quantity: 150 }] },
  { id: 'p007', name: '滷豆干', categoryId: 'cat002', price: 30, taxType: 'TAX_5', isActive: true, imageUrl: null, createdAt: CREATED,
    description: '老滷汁滷透，切片淋上蔥花與香油。',
    recipe: [{ ingredientId: 'i010', quantity: 2 }] },
  { id: 'p008', name: '鮮奶茶', categoryId: 'cat003', price: 55, taxType: 'TAX_5', isActive: false, imageUrl: null, createdAt: CREATED,
    description: '（季節性停售）錫蘭紅茶加上在地鮮奶。',
    recipe: [{ ingredientId: 'i008', quantity: 8 }, { ingredientId: 'i009', quantity: 200 }] },
]

const settings: SystemSettings = {
  taxRate: 5,
  currency: 'NTD',
  lowStockThreshold: 20,
  expiryWarningDays: 7,
}

/** 熱門度權重：牛肉麵、滷肉飯、珍奶賣最多，比較像真實餐廳 */
const PRODUCT_WEIGHTS: [string, number][] = [
  ['p001', 5], ['p002', 7], ['p003', 6], ['p004', 4], ['p005', 5], ['p006', 3], ['p007', 3],
]
const CHANNELS: SalesChannel[] = ['DINE_IN', 'DINE_IN', 'DINE_IN', 'TAKEOUT', 'TAKEOUT', 'DELIVERY']
const NOTES = ['', '', '', '', '加蔥', '不要香菜', '少冰', '半糖', '湯另外裝']

function pickWeighted(rand: () => number): string {
  const total = PRODUCT_WEIGHTS.reduce((s, [, w]) => s + w, 0)
  let r = rand() * total
  for (const [id, w] of PRODUCT_WEIGHTS) {
    r -= w
    if (r <= 0) return id
  }
  return PRODUCT_WEIGHTS[0][0]
}

function makeId(rand: () => number): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
  let s = ''
  for (let i = 0; i < 10; i++) s += chars[Math.floor(rand() * chars.length)]
  return s
}

/** 產生近 60 天的銷售訂單，日期以 now 為基準 */
function generateSalesOrders(now: Date, rand: () => number): SalesOrder[] {
  const priceOf = new Map(products.map(p => [p.id, p.price]))
  const orders: SalesOrder[] = []

  for (let daysAgo = 59; daysAgo >= 0; daysAgo--) {
    const day = new Date(now)
    day.setDate(now.getDate() - daysAgo)
    const weekday = day.getDay()
    const isWeekend = weekday === 0 || weekday === 6
    // 週末客人多一點，並加上緩慢成長的趨勢，讓「比上期」有正有負但整體向上
    const base = (isWeekend ? 16 : 11) + Math.floor((59 - daysAgo) / 15)
    const count = base + Math.floor(rand() * 6) - 2

    for (let n = 0; n < count; n++) {
      let created: Date
      if (daysAgo === 0) {
        // 今天：訂單分散在「過去 8 小時」內，不論訪客幾點打開 Demo，今日營收都不會是 0
        created = new Date(now.getTime() - rand() * 8 * 3600_000)
        if (n >= Math.ceil(count * 0.6)) break // 今天還沒過完，只產生約六成的訂單量
      } else {
        // 其他日子：營業時間 11:00～20:59
        created = new Date(day)
        created.setHours(11 + Math.floor(rand() * 10), Math.floor(rand() * 60), Math.floor(rand() * 60), 0)
      }

      const lines = new Map<string, number>()
      const itemCount = 1 + Math.floor(rand() * 3)
      for (let k = 0; k < itemCount; k++) {
        const pid = pickWeighted(rand)
        lines.set(pid, (lines.get(pid) ?? 0) + 1 + (rand() < 0.2 ? 1 : 0))
      }
      const items = [...lines].map(([productId, quantity]) => ({
        productId, quantity, unitPrice: priceOf.get(productId) ?? 0,
      }))
      const subtotal = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0)
      const taxAmount = Math.round(subtotal * 0.05)
      const discount = rand() < 0.1 ? 20 : 0

      // 大多已完成，偶爾有退款；最新幾筆的「待出餐／準備中」在迴圈結束後再指定
      const status: SalesOrder['status'] = rand() < 0.02 ? 'REFUNDED' : 'COMPLETED'

      orders.push({
        id: makeId(rand),
        status,
        items,
        subtotal,
        taxAmount,
        discount,
        total: subtotal + taxAmount - discount,
        channel: CHANNELS[Math.floor(rand() * CHANNELS.length)],
        note: NOTES[Math.floor(rand() * NOTES.length)],
        createdAt: created.toISOString(),
        testBatchId: null,
      })
    }
  }

  // 最新的 3 筆訂單設成還在處理中，Demo 時才看得到「接單 → 出餐 → 扣庫存」的流程按鈕
  const latest = orders.toSorted((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 3)
  latest.forEach((o, i) => { o.status = i < 2 ? 'PENDING' : 'PREPARING' })
  return orders
}

function generatePurchaseOrders(now: Date): PurchaseOrder[] {
  const daysAgo = (d: number, hour = 9) => {
    const t = new Date(now)
    t.setDate(now.getDate() - d)
    t.setHours(hour, 0, 0, 0)
    return t
  }
  const dateOnly = (d: Date) => d.toISOString().slice(0, 10)

  return [
    { id: 'po-0001', supplierId: 's001', status: 'RECEIVED',
      items: [{ ingredientId: 'i001', quantity: 5000, unitPrice: 0.32 }, { ingredientId: 'i003', quantity: 4000, unitPrice: 0.22 }],
      totalAmount: 2480, expectedDate: dateOnly(daysAgo(12)), receivedDate: daysAgo(12, 10).toISOString(), note: '冷藏配送', createdAt: daysAgo(14).toISOString() },
    { id: 'po-0002', supplierId: 's002', status: 'RECEIVED',
      items: [{ ingredientId: 'i002', quantity: 10000, unitPrice: 0.04 }, { ingredientId: 'i005', quantity: 20000, unitPrice: 0.05 }],
      totalAmount: 1400, expectedDate: dateOnly(daysAgo(8)), receivedDate: daysAgo(8, 14).toISOString(), note: '', createdAt: daysAgo(10).toISOString() },
    { id: 'po-0003', supplierId: 's003', status: 'ORDERED',
      items: [{ ingredientId: 'i006', quantity: 3000, unitPrice: 0.06 }, { ingredientId: 'i009', quantity: 6000, unitPrice: 0.09 }],
      totalAmount: 720, expectedDate: dateOnly(daysAgo(-1)), receivedDate: null, note: '早上 9 點前送達', createdAt: daysAgo(1).toISOString() },
    { id: 'po-0004', supplierId: 's001', status: 'PENDING',
      items: [{ ingredientId: 'i001', quantity: 3000, unitPrice: 0.32 }],
      totalAmount: 960, expectedDate: dateOnly(daysAgo(-2)), receivedDate: null, note: '', createdAt: daysAgo(0, 8).toISOString() },
    { id: 'po-0005', supplierId: 's002', status: 'CANCELLED',
      items: [{ ingredientId: 'i004', quantity: 2000, unitPrice: 0.08 }],
      totalAmount: 160, expectedDate: dateOnly(daysAgo(20)), receivedDate: null, note: '供應商缺貨', createdAt: daysAgo(22).toISOString() },
  ]
}

/** 建立一份全新的 Demo 資料庫 */
export function createSeed(now = new Date()): DemoDB {
  // 種子用「今天的日期」：同一天重新整理資料一致，隔天會產生新的一批
  const daySeed = Number(now.toISOString().slice(0, 10).replaceAll('-', ''))
  const rand = mulberry32(daySeed)

  return {
    products: structuredClone(products),
    productCategories: structuredClone(productCategories),
    ingredients: structuredClone(ingredients),
    suppliers: structuredClone(suppliers),
    purchaseOrders: generatePurchaseOrders(now),
    salesOrders: generateSalesOrders(now, rand),
    stockLogs: [],
    testRuns: [],
    settings: structuredClone(settings),
  }
}
