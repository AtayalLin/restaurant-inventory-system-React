// 總部叫貨流程：明日預估一鍵叫貨 → 最低訂購量阻擋 → 建立 → 列印採購單
import { test, expect } from '@playwright/test'
import { freshDemo, loginAs } from './helpers'

test.beforeEach(async ({ page }) => freshDemo(page))

test('從明日預估產生採購單，低於最低訂購量會被擋下', async ({ page }) => {
  await loginAs(page, '總部')
  await page.getByRole('button', { name: /向台灣生鮮肉品行叫貨/ }).click()

  const dialog = page.getByRole('dialog', { name: '建立採購單' })
  await expect(dialog.getByLabel(/^供應商/)).toHaveValue('s001') // 草稿已帶入供應商
  await expect(dialog.getByText('最低 1,000 g')).toBeVisible()

  await dialog.getByLabel('第 1 列數量').fill('100')
  await dialog.getByRole('button', { name: '建立採購單' }).click()
  await expect(dialog.getByText('低於最低訂購量 1,000 g')).toBeVisible()

  await dialog.getByLabel('第 1 列數量').fill('1000')
  await dialog.getByRole('button', { name: '建立採購單' }).click()
  await expect(page.getByRole('status').filter({ hasText: '採購單已建立' })).toBeVisible()
})

test('採購單可以開啟列印版面', async ({ page }) => {
  await loginAs(page, '總部')
  await page.goto('purchase')
  await page.getByRole('button', { name: '列印' }).first().click()
  await expect(page).toHaveURL(/\/purchase\/.+\/print$/)
  await expect(page.getByRole('heading', { name: '採購單' })).toBeVisible()
  await expect(page.getByText('驗收人')).toBeVisible()
})
