/**
 * Demo 模式的資料儲存：記憶體＋localStorage
 *
 * 訪客在 Demo 裡新增商品、建立訂單後重新整理，資料仍然保留，體驗比較接近真的系統。
 * localStorage 只存在訪客自己的瀏覽器，不會影響其他人；也可以按「重設資料」回到初始狀態。
 * 無痕模式或瀏覽器封鎖儲存空間時 localStorage 會丟錯誤，所以讀寫都包在 try/catch，
 * 失敗時退回純記憶體，功能照常運作，只是重新整理後資料會重置。
 */
import { createSeed, type DemoDB } from './seed'

const STORAGE_KEY = 'ris-demo-db-v1'

function load(): DemoDB {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const saved = JSON.parse(raw) as DemoDB & { seededOn?: string }
      // 跨日後重新產生資料，否則「今日營收」會變成 0
      if (saved.seededOn === new Date().toDateString()) return saved
    }
  } catch {
    // 讀取失敗就使用新的種子資料
  }
  return createSeed()
}

export const db: DemoDB = load()

export function persist(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...db, seededOn: new Date().toDateString() }))
  } catch {
    // 儲存空間不可用時只保留在記憶體
  }
}

export function resetDemoData(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // 忽略
  }
}

/** 可用 /api/:collection 存取的集合名稱（settings 是單一物件，另外處理） */
export type CollectionName = Exclude<keyof DemoDB, 'settings'>

export function isCollection(name: string): name is CollectionName {
  return name !== 'settings' && name in db && Array.isArray(db[name as keyof DemoDB])
}
