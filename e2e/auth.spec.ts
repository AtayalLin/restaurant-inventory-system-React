// 登入與角色權限：未登入導向、錯誤密碼、員工看不到也進不去採購頁、登出
import { test, expect } from '@playwright/test'
import { freshDemo, loginAs } from './helpers'

test.beforeEach(async ({ page }) => freshDemo(page))

test('未登入時導向登入頁，錯誤密碼顯示提示', async ({ page }) => {
  await page.goto('dashboard')
  await expect(page).toHaveURL(/\/login$/)

  await page.getByLabel(/^帳號/).fill('owner')
  await page.getByLabel(/^密碼/).fill('wrong-password')
  await page.getByRole('button', { name: '登入', exact: true }).click()
  await expect(page.getByRole('alert')).toHaveText('帳號或密碼錯誤')
})

test('員工看不到採購選項，直接輸入網址也會被擋下', async ({ page }) => {
  await loginAs(page, '員工')
  const nav = page.getByRole('navigation', { name: '主要功能' })
  await expect(nav).not.toContainText('採購進貨')

  await page.goto('purchase')
  await expect(page.getByRole('alert')).toContainText('沒有權限查看這個頁面')
})

test('總部可以切換門市與看到跨店比較，登出後回到登入頁', async ({ page }) => {
  await loginAs(page, '總部')
  await expect(page.getByRole('heading', { name: '門市營收比較' })).toBeVisible()

  await page.getByLabel('目前門市').selectOption({ label: '鳳山店' })
  await expect(page.getByText('鳳山店・今天的營收')).toBeVisible()
  await expect(page.getByRole('heading', { name: '門市營收比較' })).toHaveCount(0)

  await page.getByRole('button', { name: '登出' }).click()
  await expect(page).toHaveURL(/\/login$/)
})
