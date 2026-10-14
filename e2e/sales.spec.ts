// 門市日常流程：點餐 → 備餐 → 出餐，並確認依配方扣庫存
import { test, expect, type Page } from '@playwright/test'
import { freshDemo, loginAs } from './helpers'

test.beforeEach(async ({ page }) => freshDemo(page))

/** 讀取食材庫存頁某食材的「現有庫存」數字 */
async function stockOf(page: Page, name: string): Promise<number> {
  await page.goto('inventory')
  const cell = page.getByRole('row', { name: new RegExp(`^${name}`) }).getByRole('cell').nth(2)
  return Number((await cell.innerText()).replace(/[^\d.]/g, ''))
}

test('店長點一碗牛肉麵並出餐，牛腱肉庫存減少 200g', async ({ page }) => {
  page.on('dialog', d => d.accept()) // 出餐前的確認視窗
  await loginAs(page, '店長')
  const before = await stockOf(page, '牛腱肉')

  await page.goto('sales')
  await page.getByRole('button', { name: '新增訂單' }).click()
  const dialog = page.getByRole('dialog', { name: '新增訂單' })
  await dialog.getByLabel('第 1 列商品').selectOption({ label: '招牌牛肉麵（NT$ 180）' })
  await dialog.getByLabel('外帶').check()
  await expect(dialog.getByText('NT$ 189', { exact: true })).toBeVisible() // 180 + 5% 稅
  await dialog.getByRole('button', { name: '建立訂單' }).click()
  await expect(page.getByRole('status').filter({ hasText: '訂單已建立' })).toBeVisible()

  // 只操作這張新訂單（排在最上面）：避免畫面還沒更新時點到其他「準備中」的舊訂單
  const card = page.locator('article').first()
  await expect(card).toContainText('招牌牛肉麵')
  await expect(card).toContainText('外帶')
  await card.getByRole('button', { name: '開始備餐' }).click()
  await expect(card).toContainText('準備中')
  await card.getByRole('button', { name: '出餐完成' }).click()
  await expect(page.getByRole('status').filter({ hasText: '出餐完成' })).toBeVisible()

  expect(await stockOf(page, '牛腱肉')).toBe(before - 200)
})

test('折扣超過應付金額時無法建立訂單', async ({ page }) => {
  await loginAs(page, '店長')
  await page.goto('sales')
  await page.getByRole('button', { name: '新增訂單' }).click()
  const dialog = page.getByRole('dialog', { name: '新增訂單' })
  await dialog.getByLabel('第 1 列商品').selectOption({ label: '滷肉飯（NT$ 45）' })
  await dialog.getByLabel('折扣（元）').fill('999')
  await dialog.getByRole('button', { name: '建立訂單' }).click()
  await expect(dialog.getByText('折扣不可超過小計加稅')).toBeVisible()
})
