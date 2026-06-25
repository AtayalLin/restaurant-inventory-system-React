# 🍴 智慧餐飲進銷存管理系統

> React + TypeScript + AI 驅動的現代化餐飲進銷存解決方案

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite)](https://vite.dev)
[![TanStack Query](https://img.shields.io/badge/TanStack_Query-5-FF4154?logo=reactquery)](https://tanstack.com/query)

---

## 📋 專案簡介

專為中小型餐飲業打造的全端進銷存管理系統，整合 AI 自動生成商品文案、n8n 自動化工作流與 NVIDIA NIM 大型語言模型，協助餐廳老闆有效管理菜單商品、食材庫存、採購進貨與銷售紀錄。

---

## 🚀 技術棧

### 前端
| 技術 | 版本 | 用途 |
|------|------|------|
| React | 19 | UI 框架 |
| TypeScript | 5 | 靜態型別 |
| Vite | 6 | 開發伺服器 / 打包工具 |
| React Router | 6 | 前端路由 |
| TanStack Query | 5 | API 狀態管理、快取 |
| React Hook Form | 7 | 表單管理 |
| Zod | 4 | Schema 驗證 |
| Tailwind CSS | 4 | 樣式系統 |

### 後端 / 工具
| 技術 | 用途 |
|------|------|
| json-server 1.x | 開發用 REST API 模擬伺服器 |
| NVIDIA NIM | AI 大型語言模型 API（商品文案生成）|
| n8n | 自動化工作流（庫存預警通知、自動採購建議）|

---

## 📁 專案結構

```
resume-ai-analyzer/          ← 專案根目錄
├── db/
│   └── db.json              ← json-server 假資料庫
├── public/
├── src/
│   ├── assets/
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Layout.tsx   ← 主框架（Sidebar + Header + Outlet）
│   │   │   ├── Sidebar.tsx  ← 左側導覽列
│   │   │   └── Header.tsx   ← 頂部標題列
│   │   └── ui/              ← 共用 UI 元件（預留）
│   ├── hooks/               ← TanStack Query API hooks
│   │   ├── useProducts.ts
│   │   ├── useIngredients.ts
│   │   └── usePurchaseOrders.ts
│   ├── pages/               ← 各模組頁面
│   │   ├── Dashboard.tsx
│   │   ├── SettingsPage.tsx
│   │   ├── products/
│   │   │   ├── ProductsPage.tsx
│   │   │   └── ProductFormModal.tsx
│   │   ├── inventory/
│   │   │   ├── InventoryPage.tsx
│   │   │   └── IngredientFormModal.tsx
│   │   ├── purchase/
│   │   │   └── PurchasePage.tsx     ← 建置中
│   │   └── sales/
│   │       └── SalesPage.tsx        ← 建置中
│   ├── stores/              ← Zustand 全域狀態（預留）
│   ├── types/
│   │   └── index.ts         ← 六大核心 Entity TypeScript 型別
│   ├── App.tsx              ← React Router 路由設定
│   └── main.tsx             ← 入口點、QueryClient Provider
├── .env                     ← 環境變數（不進版控）
├── .env.example             ← 環境變數範本
├── vite.config.ts           ← Vite + Proxy 設定
└── package.json
```

---

## ⚙️ 環境設定

### 1. 安裝依賴

```bash
cd resume-ai-analyzer
npm install
```

### 2. 設定環境變數

複製範本並填入你的 API Key：

```bash
cp .env.example .env
```

`.env` 內容：

```env
# NVIDIA NIM API Key
# 取得方式：https://build.nvidia.com/settings/api-keys
VITE_NVIDIA_API_KEY=nvapi-your-key-here

# n8n Webhook URL（Week 4 加入後填寫）
# VITE_N8N_WEBHOOK_URL=http://localhost:5678/webhook/your-id
```

### 3. 啟動開發環境

需要同時開兩個終端機：

```bash
# 終端機 1：前端開發伺服器（port 5173）
npm run dev

# 終端機 2：json-server 假資料 API（port 3001）
npm run server
```

或使用一個指令同時啟動（需先安裝 concurrently）：

```bash
npm run dev:all
```

瀏覽器開啟：http://localhost:5173

---

## 📊 目前開發進度

### ✅ 已完成

#### Week 1：基礎架構（Day 1–5）
- [x] 專案初始化，清除舊程式碼
- [x] `src/types/index.ts` — 六大核心 Entity 型別定義
  - Product、ProductCategory、Ingredient、Supplier
  - PurchaseOrder、SalesOrder、StockLog、SystemSettings、User
- [x] React Router v6 路由設定（6 個模組路由）
- [x] Layout 系統（Sidebar + Header，主色 #1E3A5F）
- [x] TanStack Query v5 Provider 設定
- [x] json-server + db.json 初始假資料
- [x] Vite Proxy 設定（/api → localhost:3001）
- [x] **商品模組（Products）**
  - [x] 商品列表（搜尋、分類篩選、狀態 Badge）
  - [x] 新增商品（Modal + React Hook Form + Zod 驗證）
  - [x] 編輯商品
  - [x] 刪除商品

#### Week 2：核心業務模組（進行中）
- [x] **食材庫存模組（Inventory）**
  - [x] 食材列表（搜尋、分類篩選、庫存狀態篩選）
  - [x] 庫存不足預警（橙色 Badge + 頁首警示）
  - [x] 效期預警（3 天極短效期、7 天短效期）
  - [x] 新增食材（含供應商下拉、效期、單位成本）
  - [x] 編輯食材
  - [x] 刪除食材
- [ ] **採購進貨模組（Purchase）** ← 進行中
  - [ ] 採購單列表（狀態流程顯示）
  - [ ] 新增採購單（動態明細列）
  - [ ] 狀態流程：PENDING → ORDERED → RECEIVED → CANCELLED
  - [ ] 確認收貨自動更新食材庫存
- [ ] **銷售管理模組（Sales）**

### 🔜 規劃中

#### Week 3：AI 功能整合
- [ ] **NVIDIA NIM AI 商品文案生成**
  - [ ] 商品表單加入「AI 生成描述」按鈕
  - [ ] 串接 NVIDIA NIM llama-3.1-nemotron-ultra 模型
  - [ ] Streaming 回應顯示
- [ ] **AI 庫存分析建議**
  - [ ] 根據目前庫存狀態，AI 分析並建議補貨項目
  - [ ] 一鍵從 AI 建議產生採購單草稿

#### Week 4：n8n 自動化工作流
- [ ] **安裝設定 n8n**（Docker 或本機）
- [ ] **庫存預警自動通知**
  - [ ] 觸發條件：食材庫存低於安全庫存
  - [ ] 動作：發送 Line Notify / Email 通知老闆
- [ ] **自動採購建議單**
  - [ ] 每日定時檢查庫存
  - [ ] 自動建立採購草稿單（status: PENDING）
- [ ] **銷售日報自動匯出**
  - [ ] 每日 23:59 匯總當日銷售
  - [ ] 自動發送 PDF 日報至指定信箱

#### Week 5：儀表板 & 報表
- [ ] Dashboard KPI 卡片（今日營收、低庫存數量、待處理採購單）
- [ ] 銷售趨勢圖（Recharts）
- [ ] 庫存消耗分析圖
- [ ] 採購金額統計

#### Week 6：系統優化
- [ ] 系統設定頁（稅率、幣別、預警閾值）
- [ ] 響應式設計（手機版）
- [ ] 深色模式
- [ ] 部署至 Vercel / Railway

---

## 🗄️ 資料模型

### 六大核心 Entity

```typescript
// 商品
interface Product {
  id: string
  name: string
  categoryId: string
  price: number
  taxType: 'TAX_5' | 'TAX_10' | 'TAX_FREE'
  recipe: RecipeItem[]   // 食材用料
  isActive: boolean
}

// 食材
interface Ingredient {
  id: string
  name: string
  unit: string           // g、kg、個、包
  currentStock: number
  safetyStock: number    // 低於此值顯示預警
  expiryDays: number | null
  costPerUnit: number
}

// 採購單
interface PurchaseOrder {
  id: string
  supplierId: string
  status: 'PENDING' | 'ORDERED' | 'RECEIVED' | 'CANCELLED'
  items: PurchaseItem[]
  totalAmount: number
}

// 銷貨單
interface SalesOrder {
  id: string
  status: 'PENDING' | 'PREPARING' | 'COMPLETED' | 'REFUNDED'
  items: SalesItem[]
  total: number
  channel: 'DINE_IN' | 'TAKEOUT' | 'DELIVERY'
}
```

---

## 🤖 AI 功能規劃（Week 3）

### NVIDIA NIM 串接架構

```
使用者點擊「AI 生成文案」
  → 前端組合 Prompt（商品名稱 + 分類 + 價格）
  → fetch('/nvidia-api/v1/chat/completions')
  → Vite Proxy 轉發到 NVIDIA NIM
  → Streaming 回應逐字顯示在表單
```

### 使用模型
- **文案生成**：`meta/llama-3.1-nemotron-ultra-253b-v1`
- **庫存分析**：`meta/llama-3.3-70b-instruct`

---

## ⚡ n8n 自動化規劃（Week 4）

### 工作流一：庫存預警通知

```
每小時觸發
  → GET /api/ingredients
  → 篩選 currentStock < safetyStock 的食材
  → 若有 → POST Line Notify API
          → 發送「⚠️ 以下食材庫存不足：[清單]」
```

### 工作流二：自動採購建議

```
每日 09:00 觸發
  → GET /api/ingredients（取得低庫存食材）
  → AI 分析建議採購數量
  → POST /api/purchaseOrders（建立草稿採購單）
  → 通知老闆確認
```

### 工作流三：銷售日報

```
每日 23:59 觸發
  → GET /api/salesOrders?date=today
  → 計算當日營收、熱銷商品
  → 生成 PDF 日報
  → 發送至指定 Email
```

---

## 🎨 設計系統

| 色彩 | Hex | 用途 |
|------|-----|------|
| 主色（深藍）| `#1E3A5F` | Sidebar、標題 |
| 強調色 | `#1E40AF` | 主要按鈕、連結 |
| 成功色 | `#16A34A` | 庫存正常 Badge |
| 警告色 | `#D97706` | 庫存不足 Badge |
| 危險色 | `#DC2626` | 刪除按鈕、錯誤訊息 |
| 背景色 | `#F8FAFC` | 頁面背景 |

---

## 📝 開發紀錄

### 已解決的技術問題

| 問題 | 原因 | 解法 |
|------|------|------|
| API 回傳 304 + 空 body | 瀏覽器快取標頭 `If-None-Match` | 加入 `Cache-Control: no-cache` |
| TanStack Query 無限重試 | `res.json()` 解析空 body 拋出錯誤 | 統一使用 `fetchJSON` helper |
| Zod v4 + `z.coerce.number()` 型別錯誤 | v4 型別推導改變 | 改用 `z.number()` + `valueAsNumber` |
| NVIDIA API Key 洩漏 | `.env` 被 commit 進 git | `git filter-branch` 清除歷史 + 撤銷舊 Key |
| Vite Proxy 未生效 | 設定後未重啟 Vite | 修改 `vite.config.ts` 後需重啟 |

---

## 👨‍💻 開發者

**林家齊 Ataya Lin**

---

## 📄 授權

MIT License