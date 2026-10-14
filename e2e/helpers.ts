import { expect, type Page } from '@playwright/test'

/** 以示範帳號一鍵登入（登入頁下方的三個按鈕），並等待儀表板出現 */
export async function loginAs(page: Page, role: '總部' | '店長' | '員工') {
  await page.goto('login')
  await page.getByRole('button', { name: new RegExp(role) }).click()
  await expect(page.getByRole('heading', { name: '營運總覽' })).toBeVisible()
}

/** 第一次開 Demo 時清空瀏覽器裡的模擬資料，讓每個測試從相同的初始狀態開始 */
export async function freshDemo(page: Page) {
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('e2e-initialized')) {
      localStorage.clear()
      sessionStorage.setItem('e2e-initialized', '1')
    }
  })
}
