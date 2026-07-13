import { useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { useDashboard } from '../hooks/useDashboard'
import { useRestockSuggestion } from '../hooks/useRestockSuggestion'
import { useQueryAssistant } from '../hooks/useQueryAssistant' // 新增：Agent B 自然語言查詢助理
// 儀表板頁面 - 對應路由 /dashboard

function Dashboard() {
  const {
    isLoading,
    isError, // 新增：判斷資料來源是否有任一個 API 失敗
    lowStockItems,
    expiryWarnings,
    productMargins,
    revenueStats,
    dailyTrend,
  } = useDashboard()

  // ✅ Hook 必須在所有條件式之前呼叫（React Hooks 規則）
  const restockMutation = useRestockSuggestion()

  // Agent B：自然語言查詢助理
  const queryAssistant = useQueryAssistant()
  const [question, setQuestion] = useState('') // 使用者輸入的問題

  const handleAskQuestion = () => {
    if (!question.trim()) return // 避免送出空白問題
    queryAssistant.mutate(question)
  }

  const handleRestockSuggestion = () => {
    restockMutation.mutate({
      ingredients: lowStockItems.map(item => ({
        name: item.name,
        currentStock: item.currentStock,
        safetyStock: item.safetyStock,
        unit: item.unit,
        shortage: item.shortage,
      })),
    })
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <p className="text-gray-500">資料載入中...</p>
      </div>
    )
  }

  // 新增：資料來源異常時，明確告知使用者，而不是安靜地顯示看起來正常但其實是空的數字
  if (isError) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          資料載入失敗，請確認伺服器（json-server）是否正常運作，或重新整理頁面再試一次
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold">儀表板</h2>

      {/* 營收統計卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="今日營收" value={`NT$ ${revenueStats.todayRevenue.toLocaleString()}`} />
        <StatCard label="本週營收" value={`NT$ ${revenueStats.weekRevenue.toLocaleString()}`} />
        <StatCard label="本月營收" value={`NT$ ${revenueStats.monthRevenue.toLocaleString()}`} />
        <StatCard label="平均客單價" value={`NT$ ${revenueStats.avgOrderValue.toLocaleString()}`} />
      </div>

      {/* 近 7 天銷售趨勢 */}
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="font-semibold mb-3">近 7 天銷售趨勢</h3>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={dailyTrend}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip formatter={(value) => [`NT$ ${Number(value).toLocaleString()}`, '營收']} />
            <Line type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Agent B：自然語言查詢助理 */}
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="font-semibold mb-3">💬 智慧查詢助理</h3>
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAskQuestion()}
            placeholder="試試問我：本週營收多少？"
            className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
          />
          <button
            onClick={handleAskQuestion}
            disabled={queryAssistant.isPending || !question.trim()}
            className="text-sm bg-orange-50 text-orange-600 border border-orange-200 rounded-md px-4 py-2 hover:bg-orange-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {queryAssistant.isPending ? '思考中...' : '送出'}
          </button>
        </div>

        {queryAssistant.isError && (
          <p className="text-xs text-red-500">
            查詢服務暫時無法使用，請稍後再試
          </p>
        )}

        {queryAssistant.isSuccess && (
          <div className="bg-orange-50 border border-orange-200 rounded-md p-3 text-sm text-gray-700 whitespace-pre-line">
            {queryAssistant.data.answer}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 低庫存警示 */}
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            🔴 低庫存警示
            {lowStockItems.length > 0 && (
              <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
                {lowStockItems.length}
              </span>
            )}
          </h3>
          {lowStockItems.length === 0 ? (
            <p className="text-sm text-gray-400">目前庫存皆充足</p>
          ) : (
            <>
              <ul className="space-y-2 mb-3">
                {lowStockItems.map(item => (
                  <li key={item.id} className="flex justify-between text-sm border-b pb-1">
                    <span>{item.name}</span>
                    <span className="text-red-600">
                      {item.currentStock}{item.unit} / 安全 {item.safetyStock}{item.unit}
                      （缺 {item.shortage}{item.unit}）
                    </span>
                  </li>
                ))}
              </ul>

              {/* AI 補貨建議按鈕 */}
              <button
                onClick={handleRestockSuggestion}
                disabled={restockMutation.isPending}
                className="w-full text-sm bg-orange-50 text-orange-600 border border-orange-200 rounded-md py-2 hover:bg-orange-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {restockMutation.isPending ? '🤖 AI 分析中...' : '🤖 AI 補貨建議'}
              </button>

              {restockMutation.isError && (
                <p className="text-xs text-red-500 mt-2">
                  AI 建議服務暫時無法使用，請稍後再試
                </p>
              )}

              {restockMutation.isSuccess && (
                <div className="mt-3 bg-orange-50 border border-orange-200 rounded-md p-3 text-sm text-gray-700 whitespace-pre-line">
                  {restockMutation.data.suggestion}
                </div>
              )}
            </>
          )}
        </div>

        {/* 到期警告 */}
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            ⏰ 即期食材
            {expiryWarnings.length > 0 && (
              <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
                {expiryWarnings.length}
              </span>
            )}
          </h3>
          {expiryWarnings.length === 0 ? (
            <p className="text-sm text-gray-400">無即期食材</p>
          ) : (
            <ul className="space-y-2">
              {expiryWarnings.map(item => (
                <li key={item.id} className="flex justify-between text-sm border-b pb-1">
                  <span>{item.name}</span>
                  <span className="text-yellow-700">保存期限 {item.expiryDays} 天</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* 商品毛利率排行 */}
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="font-semibold mb-3">商品毛利率排行</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b">
              <th className="py-2">商品</th>
              <th className="py-2 text-right">售價</th>
              <th className="py-2 text-right">食材成本</th>
              <th className="py-2 text-right">毛利率</th>
            </tr>
          </thead>
          <tbody>
            {productMargins.map(p => (
              <tr key={p.id} className="border-b last:border-0">
                <td className="py-2">{p.name}</td>
                <td className="py-2 text-right">NT$ {p.price}</td>
                <td className="py-2 text-right text-gray-500">NT$ {p.cost}</td>
                <td className={`py-2 text-right font-medium ${
                  p.margin >= 50 ? 'text-green-600' : p.margin >= 20 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {p.margin}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-xl font-bold mt-1">{value}</p>
    </div>
  )
}

export default Dashboard