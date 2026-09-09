import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchJSON } from '../lib/fetchJSON'
import { completeSalesOrderCore } from '../lib/salesOperations'
import { calcTax, calcTotal } from './useSalesOrders'
import type { Product, Ingredient, SalesOrder, StockLog, TestRun, TestRunIngredientSnapshot } from '../types'

const BASE = '/api'

// 取得所有測試紀錄（測試頁面歷史列表用）
export function useTestRuns() {
  return useQuery<TestRun[]>({
    queryKey: ['testRuns'],
    queryFn: () => fetchJSON<TestRun[]>(`${BASE}/testRuns`),
  })
}

// ── 準備測試環境（數值調動）───────────────────────────────
// 對應需求：「每次要進行測試之前，要優先做數值調動...確保完美的測試空間」
export function usePrepareTestRun() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      productId,
      testCapacity,
      concurrentRequests,
    }: { productId: string; testCapacity: number; concurrentRequests: number }) => {
      const product = await fetchJSON<Product>(`${BASE}/products/${productId}`)
      if (!product.recipe || product.recipe.length === 0) {
        throw new Error('此商品沒有設定食譜（recipe），無法進行併發測試')
      }
      if (testCapacity < 1 || concurrentRequests < testCapacity) {
        throw new Error('併發請求數必須大於可承受訂單數，測試才有意義')
      }

      // 第一步：讀取每個食材原始庫存，算出這次測試要設定的庫存值
      const snapshots: TestRunIngredientSnapshot[] = []
      for (const recipeItem of product.recipe) {
        const ingredient = await fetchJSON<Ingredient>(`${BASE}/ingredients/${recipeItem.ingredientId}`)
        snapshots.push({
          ingredientId: ingredient.id,
          ingredientName: ingredient.name,
          originalStock: ingredient.currentStock,
          originalVersion: ingredient.version ?? 0,
          testStock: recipeItem.quantity * testCapacity,
          // 為什麼所有食材都設成「剛好夠 capacity 份」：
          // 這樣不管哪個食材先被耗盡，成功筆數的理論上限都收斂在 testCapacity，
          // 測試結果才有明確、可驗證的預期值，不會因為「哪個食材是瓶頸」而模糊掉
        })
      }

      // 第二步：依序寫入測試庫存（數值調動），沿用序列寫入避免併發衝突
      for (const snap of snapshots) {
        await fetchJSON(`${BASE}/ingredients/${snap.ingredientId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ currentStock: snap.testStock, version: snap.originalVersion + 1 }),
        })
      }

      // 第三步：驗證 — 重新讀取，確認每個食材的庫存都精準等於預期值
      // 對應需求：「確保完美的測試空間、數據資料無任何BUG後，才能亮起測試按鈕」
      for (const snap of snapshots) {
        const check = await fetchJSON<Ingredient>(`${BASE}/ingredients/${snap.ingredientId}`)
        if (check.currentStock !== snap.testStock) {
          throw new Error(`測試環境準備失敗：${snap.ingredientName} 庫存設定值與實際不符，請重試`)
        }
      }

      const testRun: TestRun = {
        id: crypto.randomUUID(),
        productId: product.id,
        productName: product.name,
        ingredientSnapshots: snapshots,
        testCapacity,
        concurrentRequests,
        status: 'PREPARED',
        successCount: 0,
        failCount: 0,
        finalStockSnapshots: [],
        isOverSold: false,
        createdAt: new Date().toISOString(),
        completedAt: null,
      }

      return fetchJSON<TestRun>(`${BASE}/testRuns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testRun),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['testRuns'] })
      queryClient.invalidateQueries({ queryKey: ['ingredients'] })
    },
  })
}

interface ProgressUpdate {
  completed: number
  total: number
  success: number
  fail: number
  index: number
  result: 'success' | 'fail'
  reason?: string
}

// ── 執行併發測試 ──────────────────────────────────────────
// 對應需求：「按下測試按鈕觸發測試後，顯示測試時的即時狀況」
export function useRunConcurrencyTest() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      testRun,
      onProgress,
    }: { testRun: TestRun; onProgress: (update: ProgressUpdate) => void }) => {
      await fetchJSON(`${BASE}/testRuns/${testRun.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'RUNNING' }),
      })

      const product = await fetchJSON<Product>(`${BASE}/products/${testRun.productId}`)
      let success = 0
      let fail = 0
      let completed = 0

      // 【核心】同時發出 concurrentRequests 筆真實下單請求，
      // 每筆都呼叫跟正式流程一模一樣的 completeSalesOrderCore
      const requests = Array.from({ length: testRun.concurrentRequests }, (_, i) => i)

      await Promise.allSettled(
        requests.map(async (i) => {
          const order: Omit<SalesOrder, 'id' | 'createdAt'> = {
            status: 'PENDING',
            items: [{ productId: product.id, quantity: 1, unitPrice: product.price }],
            subtotal: product.price,
            taxAmount: calcTax(product.price),
            discount: 0,
            total: calcTotal(product.price, calcTax(product.price), 0),
            channel: 'DINE_IN',
            note: `[併發測試] batch:${testRun.id} #${i + 1}`,
            testBatchId: testRun.id,
          }

          const created = await fetchJSON<SalesOrder>(`${BASE}/salesOrders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...order, id: crypto.randomUUID(), createdAt: new Date().toISOString() }),
          })

          try {
            await completeSalesOrderCore(created)
            success++
            onProgress({ completed: ++completed, total: testRun.concurrentRequests, success, fail, index: i, result: 'success' })
          } catch (err) {
            fail++
            const reason = err instanceof Error ? err.message : '未知錯誤'
            // 失敗的訂單標記回 CANCELLED，不留下「PENDING 但實際被拒絕」的孤兒訂單
            await fetchJSON(`${BASE}/salesOrders/${created.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status: 'CANCELLED', note: `${created.note}（測試拒絕：${reason.replace('INSUFFICIENT_STOCK: ', '')}）` }),
            })
            onProgress({ completed: ++completed, total: testRun.concurrentRequests, success, fail, index: i, result: 'fail', reason })
          }
        })
      )

      // 測試結束，讀取最終庫存，驗證有沒有變成負數（超賣的直接證據）
      const finalStockSnapshots = await Promise.all(
        testRun.ingredientSnapshots.map(async (snap) => {
          const ing = await fetchJSON<Ingredient>(`${BASE}/ingredients/${snap.ingredientId}`)
          return { ingredientId: snap.ingredientId, finalStock: ing.currentStock }
        })
      )
      const isOverSold = finalStockSnapshots.some(s => s.finalStock < 0)

      const updatedRun: TestRun = {
        ...testRun,
        status: 'COMPLETED',
        successCount: success,
        failCount: fail,
        finalStockSnapshots,
        isOverSold,
        completedAt: new Date().toISOString(),
      }

      await fetchJSON(`${BASE}/testRuns/${testRun.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedRun),
      })

      return updatedRun
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salesOrders'] })
      queryClient.invalidateQueries({ queryKey: ['ingredients'] })
      queryClient.invalidateQueries({ queryKey: ['stockLogs'] })
      queryClient.invalidateQueries({ queryKey: ['testRuns'] })
    },
  })
}

// ── 測試後處理：刪除測試資料 或 保留紀錄但還原庫存 ──────────
// 對應需求：「可以有按鈕來刪除測試數據並回覆正常數值，或是保留測試數據但數值必要回覆正常數值」
export function useCleanupTestRun() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ testRun, mode }: { testRun: TestRun; mode: 'delete' | 'restore-only' }) => {
      // 【修正 Bug 7】version 改成「讀取當下實際版本再 +1」，
      // 不再用寫死的 +2 用猜的——測試過程中每筆成功的併發請求都會讓 version 各自 +1，
      // 猜測值容易跟實際值對不上，改成讀取當下值再往前推一次，永遠正確
      for (const snap of testRun.ingredientSnapshots) {
        const current = await fetchJSON<Ingredient>(`${BASE}/ingredients/${snap.ingredientId}`)
        await fetchJSON(`${BASE}/ingredients/${snap.ingredientId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ currentStock: snap.originalStock, version: (current.version ?? 0) + 1 }),
        })
      }

      if (mode === 'delete') {
        const [orders, logs] = await Promise.all([
          fetchJSON<SalesOrder[]>(`${BASE}/salesOrders`),
          fetchJSON<StockLog[]>(`${BASE}/stockLogs`),
        ])
        const testOrders = orders.filter(o => o.testBatchId === testRun.id)
        const testOrderIds = new Set(testOrders.map(o => o.id))
        const testLogs = logs.filter(l => l.referenceType === 'SALES_ORDER' && testOrderIds.has(l.referenceId))

        for (const o of testOrders) {
          await fetchJSON(`${BASE}/salesOrders/${o.id}`, { method: 'DELETE' })
        }
        for (const l of testLogs) {
          await fetchJSON(`${BASE}/stockLogs/${l.id}`, { method: 'DELETE' })
        }
        await fetchJSON(`${BASE}/testRuns/${testRun.id}`, { method: 'DELETE' })
      } else {
        await fetchJSON(`${BASE}/testRuns/${testRun.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'CLEANED' }),
        })
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salesOrders'] })
      queryClient.invalidateQueries({ queryKey: ['ingredients'] })
      queryClient.invalidateQueries({ queryKey: ['stockLogs'] })
      queryClient.invalidateQueries({ queryKey: ['testRuns'] })
    },
  })
} 