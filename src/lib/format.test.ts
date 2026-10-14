import { describe, expect, it } from 'vitest'
import { formatCurrency, percentChange } from './format'
import { calcTax, calcTotal } from '../hooks/useSalesOrders'

describe('formatCurrency', () => {
  it('加上 NT$ 與千分位，並四捨五入到整數', () => {
    expect(formatCurrency(1234.5)).toBe('NT$ 1,235')
    expect(formatCurrency(0)).toBe('NT$ 0')
  })
})

describe('percentChange', () => {
  it('計算成長與衰退百分比，取到小數一位', () => {
    expect(percentChange(120, 100)).toBe(20)
    expect(percentChange(80, 100)).toBe(-20)
    expect(percentChange(1, 3)).toBe(-66.7)
  })

  it('上期為 0 時回傳 null，避免畫面出現 Infinity%', () => {
    expect(percentChange(500, 0)).toBeNull()
  })
})

describe('calcTax／calcTotal（銷售金額）', () => {
  it('營業稅 5% 無條件捨去', () => {
    expect(calcTax(180)).toBe(9)
    expect(calcTax(199)).toBe(9) // 9.95 → 9
    expect(calcTax(1000, 10)).toBe(100)
  })

  it('總計 = 小計 + 稅 - 折扣', () => {
    expect(calcTotal(180, 9, 10)).toBe(179)
    expect(calcTotal(180, 9)).toBe(189)
  })
})
