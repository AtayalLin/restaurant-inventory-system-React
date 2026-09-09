# 🍜 智慧餐飲進銷存管理系統

一套為餐飲業打造的進銷存管理系統，整合 AI 自動化功能，協助店家掌握庫存、銷售與營運狀況。本專案為求職作品集，展示前端工程能力與 AI 自動化整合經驗。

---

## 📌 專案簡介

傳統餐飲業進銷存管理仰賴人工記帳與經驗判斷，容易發生庫存短缺、食材過期、營運數據不透明等問題。本系統透過網頁介面數位化管理商品、食材、採購與銷售流程，並串接 AI 服務，提供補貨建議與自然語言查詢功能，讓店家用口語問題就能快速掌握營運狀況。

**GitHub**：[AtayalLin/restaurant-inventory-system-React](https://github.com/AtayalLin/restaurant-inventory-system-React)

---

## 🛠 技術棧

| 分類 | 技術 |
|------|------|
| 前端框架 | React 19 + TypeScript + Vite |
| 資料狀態管理 | TanStack Query v5 |
| 樣式 | Tailwind CSS v4 |
| Mock 後端 | json-server |
| AI 自動化 | n8n（Docker 自架）+ NVIDIA NIM |
| 圖表 | Recharts |

---

## ✨ 核心功能

### 進銷存管理（CRUD）
- 商品管理、食材庫存管理、採購進貨、銷售管理四大模組
- Zod 表單驗證、Mock/真實 API 雙模式切換

### 儀表板
- 今日／本週／本月營收統計、平均客單價
- 低庫存清單、即期食材警告
- 商品毛利率排行、近 7 天銷售趨勢圖
- 30 秒自動輪詢更新

### AI 商品文案生成
- 串接 NVIDIA NIM，依商品資訊自動生成行銷描述文案（Streaming API）

### AI 補貨建議（Agent A）
- 依低庫存食材清單，透過 n8n workflow 呼叫 AI 生成補貨建議
- 架構：`Webhook → Code(組 prompt) → HTTP Request(呼叫 NVIDIA NIM) → Respond to Webhook`

### 智慧查詢助理（Agent B）
- 使用者可用自然語言提問（例如「本週營收多少」），系統回傳 AI 組織好的口語化回答
- **架構決策**：後端為 json-server（非 SQL），不適合走業界常見的 NL2SQL 路線，改採「意圖分類 + 語意層」架構（概念類似 Snowflake Cortex Analyst）——AI 只負責「判斷問題屬於哪種預定義意圖」與「將運算結果組織成自然語言」，實際數字運算交由寫死的 Code 節點邏輯處理，避免 AI 算錯數字
- 目前支援意圖：
  - `REVENUE_COMPARISON`：本週／本月營收，與上期比較（含成長率計算）
  - `TOP_SELLING_PRODUCTS`：銷售排行榜（規劃中）
  - `GENERAL_INVENTORY_QA`：其他進銷存相關問答（規劃中）
  - `UNKNOWN`：無法歸類的問題，回覆固定引導文字
- n8n workflow 節點：`Webhook → Code(意圖判斷prompt) → HTTP Request(AI判斷意圖) → Code(解析意圖+撈資料運算+組回答prompt) → HTTP Request(AI生成回答) → Respond to Webhook`

**關鍵技術決策**：n8n 節點間傳遞資料時，複雜的內嵌 `{{ }}` 表達式容易解析失敗（Fixed/Expression 模式切換不穩定），改用獨立 Code 節點先組好純文字 prompt，再由 HTTP Request 節點以 `{{ JSON.stringify({...}) }}` 整包表達式送出，大幅提升穩定性。

---

## 🚀 本機啟動方式

需要同時開啟三個終端機：

```bash
# 終端機 1：前端開發伺服器
npm run dev          # http://localhost:5173

# 終端機 2：json-server mock 後端
npm run server        # http://localhost:3001

# 終端機 3：n8n 自動化服務（Docker Desktop 需先手動開啟）
docker start n8n       # http://localhost:5678
```

**環境注意事項**：
- n8n 容器內部呼叫宿主機 json-server，必須使用 `http://host.docker.internal:3001`，不能用 `localhost:3001`（容器內部的 localhost 指向自己）
- n8n 容器為永久容器（未加 `--rm`），workflow JSON 備份存放於 git 專案目錄外的 `React-Frontendproject/n8n-workflows/`，避免明文金鑰被 commit

---
## 開發規劃樹狀圖

> 圖例：✅ 已完成　🔄 開發中／待驗證　🔲 待辦

```text
智慧餐飲進銷存管理系統
│
├── 核心進銷存模組 ✅
│   ├── 商品管理
│   ├── 食材庫存
│   ├── 採購進貨
│   └── 銷售管理  
│
├── Dashboard 儀表板 ✅
│   ├── 營收統計 / 近7天趨勢
│   ├── 低庫存清單
│   ├── 即期食材警告
│   └── 商品毛利率排行
│
├── AI 自動化功能（n8n + NVIDIA NIM）
│   ├── Agent A：AI 補貨建議 ✅
│   │
│   └── Agent B：智慧查詢助理
│       ├── 架構：Tool-Calling 語意層
│       │   （AI 選工具 → 固定邏輯運算 → AI 組回答）
│       │
│       ├── REVENUE_COMPARISON ✅
│       ├── TOP_SELLING_PRODUCTS 🔄（驗證中）
│       ├── UNKNOWN ✅
│       ├── GENERAL_INVENTORY_QA 🔲
│       │   ├── getInventoryStatus 🔲
│       │   └── getProductSales 🔲
│       │
│       ├── 進階 KPI 工具（業界標準指標）
│       │   ├── getFoodCostPercentage 🔲
│       │   ├── getABCAnalysis 🔲
│       │   └── getInventoryTurnover 🔲（待 stockLogs 資料累積）
│       │
│       └── Tool-Calling 架構遷移 🔲
│           （由 Intent 分類 + if/else 改為治理過的工具選擇）
│
└── 資料完整性 🔲
    └── stockLogs 寫入邏輯
        ├── 銷售完成 → 依 recipe 扣減 ingredient.currentStock
        └── 採購到貨 → 加回 ingredient.currentStock
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

## n8n Webhook 測試方式

這個 workflow 有兩種測試模式，網址不同、使用方式也不同，**不要混用**。

### 模式一：測試模式（Test Mode）— 用於單步除錯

適合情境：想在 n8n 編輯器裡即時看到每個節點的輸入/輸出資料，方便除錯。

**步驟：**
1. 開啟 workflow，點擊 **Webhook** 節點
2. 點擊橘色按鈕 **「Listen for test event」**
3. 畫面會顯示：Listening for test event
              Make a POST request to:
              http://localhost:5678/webhook-test/query-assistant
4. 在終端機執行（注意路徑是 `webhook-test`）：
```bash
   curl -X POST http://localhost:5678/webhook-test/query-assistant \
     -H "Content-Type: application/json; charset=utf-8" \
     --data-binary @payload.json
```
5. 送出後，編輯器會自動跳轉並顯示執行結果，可以逐一點開每個節點查看資料流

**注意事項：**
- 測試模式**用一次就會失效**，每次測試前都要重新點「Listen for test event」
- 只適合開發階段除錯用，不適合長時間對外提供服務

---

### 模式二：正式模式（Production Mode）— 用於實際呼叫

適合情境：workflow 已經開發完成，要讓外部系統（例如前端）呼叫。

**步驟：**
1. 開啟 workflow，右上角點擊 **「Publish」** 讓 workflow 進入 Published 狀態
2. 不需要點開任何節點、不需要等待監聽畫面
3. 直接在終端機執行（注意路徑是 `webhook`，沒有 `-test`）：
```bash
   curl -X POST http://localhost:5678/webhook/query-assistant \
     -H "Content-Type: application/json; charset=utf-8" \
     --data-binary @payload.json
```
4. 這條路徑會**持續監聽**，可以無限次呼叫，不需要每次重新啟動

**注意事項：**
- 修改任何節點內容後，**必須重新按一次 Publish**，正式路徑才會套用新版本
- 忘記重新 Publish 的話，`webhook` 路徑跑的還是修改前的舊邏輯

---

### 常見錯誤對照

| 症狀 | 原因 |
|---|---|
| 節點卡在「Executing previous nodes...」轉圈不動 | 打了正式網址（`webhook`），但編輯器還停在「Listening for test event」等測試事件；或反過來打了測試網址但沒點「Listen for test event」 |
| `Received request for unknown webhook` | 呼叫的路徑跟目前監聽的模式（test / production）對不上 |
| 改了程式碼但結果沒變 | 忘記重新 Publish |

---

## 📝 開發紀錄

### 已解決的技術問題

| 問題 | 原因 | 解法 |
|------|------|------|
| API 回傳 304 + 空 body | 瀏覽器快取標頭 `If-None-Match` | 加入 `Cache-Control: no-cache` |
| TanStack Query 無限重試 | `res.json()` 解析空 body 拋出錯誤 | 統一使用 `fetchJSON` helper |
| Zod v4 + `z.coerce.number()` 型別錯誤 | v4 型別推導改變 | 改用 `z.number()` + `valueAsNumber` |
| NVIDIA API Key 洩漏風險 | `.env` / workflow 備份檔可能被 commit | `.gitignore` 排除、workflow 備份存放於 git 專案目錄外 |
| Vite Proxy 未生效 | 設定後未重啟 Vite | 修改 `vite.config.ts` 後需重啟 |
| json-server 併發寫入崩潰 | `Promise.all` 平行寫入衝突 | 改用 `for...of` 序列寫入 |
| n8n HTTP Request Header 錯誤 | Name/Value 欄位對調 | 確認 `Authorization` / `Content-Type` 各自獨立填入正確欄位 |
| n8n 表達式 `{{ }}` 未被解析，AI 收到字面文字 | 複雜運算式塞在 Fixed 模式 JSON 字串中不穩定 | 新增 Code 節點預先組好 prompt，HTTP Request 改用 Expression 模式 `{{ JSON.stringify({...}) }}` |
| Docker 容器重啟後 n8n 工作流程消失 | Windows + Git Bash 下 `~/.n8n` volume 路徑未正確持久化 | 不使用 `--rm`、養成手動 Export workflow JSON 備份至 git 專案目錄外的習慣 |
| n8n 容器連 json-server 連線被拒 | 容器內 `localhost` 指向容器自身，非宿主機 | 改用 `host.docker.internal:3001` |
| NVIDIA NIM 70b 模型頻繁 504 逾時 | 免費層級對大模型限制較嚴格 | 改用 `meta/llama-3.1-8b-instruct`，穩定性明顯提升 |
| 前端瀏覽器分頁與 n8n 失去即時連線，節點執行卡住無回應 | WebSocket 連線在容器重啟後未正確恢復 | 關閉分頁重新連線，嚴重時重啟整個瀏覽器；同時為 n8n 的 HTTP Request 節點加上 `timeout` 設定，避免卡住無限等待 |
| 小型 AI 模型在 UNKNOWN 分類下偶爾不遵循固定回覆指令 | llama-3.1-8b 對簡短指令的遵循度較低 | 明確要求「請用繁體中文回覆」並提供具體範例句子，降低模型自由發揮的機率 |

---

## 📍 開發進度快照（供接續開發參考）

> 最後更新：2026-07-13

**已完成並驗證**：
- 進銷存 CRUD 四大模組
- AI 商品文案生成
- Dashboard 儀表板（含 isError 處理、效能優化）
- Agent A：AI 補貨建議（已上線）
- Agent B：REVENUE_COMPARISON 意圖，六節點完整串接（Webhook → 意圖分類 → AI判斷 → 資料運算 → AI生成回答 → 回傳），已整合進 `Dashboard.tsx` 前端 UI 並測試成功

**下次接續開發的下一步**：
1. 新增 `GENERAL_INVENTORY_QA` 意圖的資料撈取 Code 節點（撈取 products + ingredients 摘要，作為 AI 回答的上下文依據）
2. 實作 `TOP_SELLING_PRODUCTS` 意圖（統計 salesOrders 中各商品銷售數量並排序）
3. 將查詢助理 UI 從 Dashboard 內嵌小卡片，視時間評估是否獨立成專屬頁面／聊天框元件
4. 技術債：API 端點目前寫死在各 hook 檔案，應改用 `.env` 環境變數管理

---

## 👨‍💻 開發者

**林家齊 Ataya Lin**

---

## 📄 授權

MIT License