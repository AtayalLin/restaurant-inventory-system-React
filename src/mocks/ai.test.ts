// Demo 版 AI 回應：確認意圖判斷正確，且數字由程式從資料計算
import { describe, expect, it } from 'vitest'
import { answerQuestion, restockSuggestion } from './ai'

describe('answerQuestion（查詢助理）', () => {
  it('依關鍵字判斷意圖', () => {
    expect(answerQuestion('本週營收多少？').intent).toBe('REVENUE_COMPARISON')
    expect(answerQuestion('最近哪個商品賣最好').intent).toBe('TOP_SELLING_PRODUCTS')
    expect(answerQuestion('今天天氣如何').intent).toBe('UNKNOWN')
  })

  it('問「月」時改用本月與上月同期比較', () => {
    expect(answerQuestion('這個月營收跟上個月比如何').data?.period).toBe('month')
  })

  it('排行榜依銷量由高到低，最多 3 名', () => {
    const ranking = answerQuestion('銷售排行').data?.ranking as { qty: number }[]
    expect(ranking.length).toBeLessThanOrEqual(3)
    expect(ranking.map(r => r.qty)).toEqual([...ranking.map(r => r.qty)].sort((a, b) => b - a))
  })
})

describe('restockSuggestion（補貨建議）', () => {
  it('補到安全庫存的 1.5 倍，g／ml 以 500 為單位進位', () => {
    const { suggestion } = restockSuggestion({
      ingredients: [{ name: '牛腱肉', currentStock: 1800, safetyStock: 3000, unit: 'g', shortage: 1200 }],
    })
    // 3000 × 1.5 − 1800 = 2700 → 進位到 3000
    expect(suggestion).toContain('牛腱肉：建議補貨 3,000 g')
  })

  it('沒有低庫存食材時回覆不需補貨', () => {
    expect(restockSuggestion({ ingredients: [] }).suggestion).toContain('沒有低於安全庫存')
  })
})
