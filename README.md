**關鍵技術決策**：n8n 節點間傳遞資料時，複雜的內嵌 `{{ }}` 表達式容易解析失敗（Fixed/Expression 模式切換不穩定），改用獨立 Code 節點先組好純文字 prompt，再由 HTTP Request 節點以 `{{ JSON.stringify({...}) }}` 整包表達式送出，大幅提升穩定性。

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
| NVIDIA API Key 洩漏風險 | `.env` / workflow 備份檔可能被 commit | `.gitignore` 排除、workflow 備份存放於 git 專案目錄外 |
| Vite Proxy 未生效 | 設定後未重啟 Vite | 修改 `vite.config.ts` 後需重啟 |
| json-server 併發寫入崩潰 | `Promise.all` 平行寫入衝突 | 改用 `for...of` 序列寫入 |
| n8n HTTP Request Header 錯誤 | Name/Value 欄位對調 | 確認 `Authorization` / `Content-Type` 各自獨立填入正確欄位 |
| n8n 表達式 `{{ }}` 未被解析，AI 收到字面文字 | 複雜運算式塞在 Fixed 模式 JSON 字串中不穩定 | 新增 Code 節點預先組好 prompt，HTTP Request 改用 Expression 模式 `{{ JSON.stringify({...}) }}` |
| Docker 容器重啟後 n8n 工作流程消失 | Windows + Git Bash 下 `~/.n8n` volume 路徑未正確持久化 | 不使用 `--rm`、養成手動 Export workflow JSON 備份至 git 專案目錄外的習慣 |

---

## 👨‍💻 開發者

**林家齊 Ataya Lin**

---

## 📄 授權

MIT License