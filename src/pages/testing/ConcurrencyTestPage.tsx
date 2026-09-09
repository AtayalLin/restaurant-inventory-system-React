import { useState } from 'react'
import { useProducts } from '../../hooks/useProducts'
import {
  usePrepareTestRun,
  useRunConcurrencyTest,
  useCleanupTestRun,
  useTestRuns,
} from '../../hooks/useConcurrencyTest'
import type { TestRun } from '../../types'

interface LiveLogEntry {
  index: number
  result: 'success' | 'fail'
  reason?: string
}

function ConcurrencyTestPage() {
  const { data: products = [] } = useProducts()
  const testableProducts = products.filter(p => p.isActive && p.recipe?.length > 0)

  const [productId, setProductId] = useState('')
  const [testCapacity, setTestCapacity] = useState(5)
  const [concurrentRequests, setConcurrentRequests] = useState(100)

  const [preparedRun, setPreparedRun] = useState<TestRun | null>(null)
  const [liveProgress, setLiveProgress] = useState({ completed: 0, total: 0, success: 0, fail: 0 })
  const [liveLog, setLiveLog] = useState<LiveLogEntry[]>([])
  const [result, setResult] = useState<TestRun | null>(null)

  const { mutate: prepare, isPending: isPreparing, error: prepareError } = usePrepareTestRun()
  const { mutate: runTest, isPending: isRunning } = useRunConcurrencyTest()
  const { mutate: cleanup, isPending: isCleaning } = useCleanupTestRun()
  const { data: history = [] } = useTestRuns()

  const canStartTest = preparedRun !== null && preparedRun.status === 'PREPARED' && !isRunning

  function handlePrepare() {
    if (!productId) return
    setResult(null)
    setLiveLog([])
    setLiveProgress({ completed: 0, total: 0, success: 0, fail: 0 })
    prepare(
      { productId, testCapacity, concurrentRequests },
      { onSuccess: (run) => setPreparedRun(run) }
    )
  }

  function handleStartTest() {
    if (!preparedRun) return
    setLiveProgress({ completed: 0, total: preparedRun.concurrentRequests, success: 0, fail: 0 })
    setLiveLog([])

    runTest(
      {
        testRun: preparedRun,
        onProgress: (update) => {
          setLiveProgress({ completed: update.completed, total: update.total, success: update.success, fail: update.fail })
          setLiveLog(prev => [{ index: update.index, result: update.result, reason: update.reason }, ...prev].slice(0, 30))
          // 只保留最新 30 筆，避免畫面卡頓
        },
      },
      {
        onSuccess: (updatedRun) => {
          setResult(updatedRun)
          setPreparedRun(updatedRun)
        },
      }
    )
  }

  function handleCleanup(mode: 'delete' | 'restore-only') {
    if (!result) return
    cleanup(
      { testRun: result, mode },
      {
        onSuccess: () => {
          setPreparedRun(null)
          setResult(null)
          setLiveLog([])
          setLiveProgress({ completed: 0, total: 0, success: 0, fail: 0 })
        },
      }
    )
  }

  return (
    <div style={{ padding: '24px', maxWidth: '900px' }}>
      <h2 style={{ color: '#1E3A5F', marginBottom: '4px' }}>併發測試：高併發庫存控管</h2>
      <p style={{ color: '#6B7280', fontSize: '13px', marginBottom: '24px' }}>
        模擬多筆請求同時搶購限量商品，驗證樂觀鎖是否能防止超賣
      </p>

      {/* 測試設定 */}
      <section style={sectionStyle}>
        <h3 style={sectionTitle}>1. 測試設定</h3>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
          <div>
            <label style={labelStyle}>測試商品</label>
            <select
              value={productId}
              onChange={e => { setProductId(e.target.value); setPreparedRun(null); setResult(null) }}
              disabled={isPreparing || isRunning}
              style={inputStyle}
            >
              <option value="">選擇要測試的商品</option>
              {testableProducts.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>可承受訂單數</label>
            <input
              type="number" min={1} value={testCapacity}
              onChange={e => setTestCapacity(Number(e.target.value))}
              disabled={isPreparing || isRunning}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>併發請求數</label>
            <input
              type="number" min={1} value={concurrentRequests}
              onChange={e => setConcurrentRequests(Number(e.target.value))}
              disabled={isPreparing || isRunning}
              style={inputStyle}
            />
          </div>
        </div>

        <button
          onClick={handlePrepare}
          disabled={!productId || isPreparing || isRunning}
          style={secondaryBtnStyle(!productId || isPreparing || isRunning)}
        >
          {isPreparing ? '準備中...' : '準備測試環境（數值調動）'}
        </button>

        {prepareError && (
          <p style={{ color: '#DC2626', fontSize: '13px', marginTop: '8px' }}>
            {(prepareError as Error).message}
          </p>
        )}

        {preparedRun && (
          <div style={{ marginTop: '16px', background: '#F8FAFC', borderRadius: '8px', padding: '12px', fontSize: '13px' }}>
            <p style={{ margin: '0 0 8px', fontWeight: 600, color: '#1E3A5F' }}>
              測試環境已就緒 ✓（{preparedRun.productName}）
            </p>
            {preparedRun.ingredientSnapshots.map(snap => (
              <div key={snap.ingredientId} style={{ color: '#6B7280', display: 'flex', justifyContent: 'space-between' }}>
                <span>{snap.ingredientName}</span>
                <span>原庫存 {snap.originalStock} → 測試庫存 {snap.testStock}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 執行測試 */}
      <section style={sectionStyle}>
        <h3 style={sectionTitle}>2. 執行測試</h3>
        <button
          onClick={handleStartTest}
          disabled={!canStartTest}
          style={primaryBtnStyle(!canStartTest)}
        >
          {isRunning ? '測試進行中...' : `開始測試（${concurrentRequests} 筆併發請求）`}
        </button>

        {(isRunning || liveProgress.completed > 0) && (
          <div style={{ marginTop: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px', color: '#374151' }}>
              <span>進度 {liveProgress.completed} / {liveProgress.total}</span>
              <span>成功 {liveProgress.success}　失敗 {liveProgress.fail}</span>
            </div>
            <div style={{ height: '8px', background: '#E5E7EB', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{
                height: '100%', background: '#1E40AF', transition: 'width 0.15s',
                width: liveProgress.total ? `${(liveProgress.completed / liveProgress.total) * 100}%` : '0%',
              }} />
            </div>

            <div style={{
              marginTop: '12px', maxHeight: '180px', overflowY: 'auto',
              background: '#111827', borderRadius: '6px', padding: '10px',
              fontFamily: 'monospace', fontSize: '12px',
            }}>
              {liveLog.map((entry, idx) => (
                <div key={idx} style={{ color: entry.result === 'success' ? '#4ADE80' : '#F87171' }}>
                  請求 #{entry.index + 1} → {entry.result === 'success' ? '成功' : `拒絕（${entry.reason?.replace('INSUFFICIENT_STOCK: ', '') ?? '未知'}）`}
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* 測試結果 */}
      {result && (
        <section style={sectionStyle}>
          <h3 style={sectionTitle}>3. 測試結果</h3>

          <div style={{
            padding: '12px 16px', borderRadius: '8px', marginBottom: '16px',
            background: result.isOverSold ? '#FEF2F2' : '#F0FDF4',
            border: `1px solid ${result.isOverSold ? '#DC2626' : '#16A34A'}`,
          }}>
            <p style={{ margin: 0, fontWeight: 700, color: result.isOverSold ? '#DC2626' : '#16A34A' }}>
              {result.isOverSold ? '❌ 測試未通過：偵測到超賣（庫存變成負數）' : '✅ 測試通過：庫存未曾變成負數'}
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '16px' }}>
            <StatCard label="總請求數" value={result.concurrentRequests} />
            <StatCard label="成功" value={result.successCount} color="#16A34A" />
            <StatCard label="失敗（被拒絕）" value={result.failCount} color="#DC2626" />
            <StatCard label="預期成功數" value={result.testCapacity} />
          </div>

          {result.finalStockSnapshots.map(snap => {
            const name = result.ingredientSnapshots.find(s => s.ingredientId === snap.ingredientId)?.ingredientName
            return (
              <div key={snap.ingredientId} style={{ fontSize: '13px', color: '#6B7280', marginBottom: '4px' }}>
                {name}　最終庫存：{snap.finalStock}
              </div>
            )
          })}

          <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
            <button
              onClick={() => handleCleanup('restore-only')}
              disabled={isCleaning}
              style={secondaryBtnStyle(isCleaning)}
            >
              保留測試紀錄，還原正常庫存
            </button>
            <button
              onClick={() => handleCleanup('delete')}
              disabled={isCleaning}
              style={{ ...secondaryBtnStyle(isCleaning), color: '#DC2626', borderColor: '#DC2626' }}
            >
              刪除測試資料並還原
            </button>
          </div>
        </section>
      )}

      {/* 歷史測試紀錄 */}
      {history.length > 0 && (
        <section style={sectionStyle}>
          <h3 style={sectionTitle}>歷史測試紀錄</h3>
          {history.map(run => (
            <div key={run.id} style={{
              display: 'flex', justifyContent: 'space-between', padding: '8px 0',
              borderBottom: '1px solid #F3F4F6', fontSize: '13px',
            }}>
              <span>{run.productName}　{new Date(run.createdAt).toLocaleString('zh-TW')}</span>
              <span style={{ color: run.status === 'COMPLETED' ? (run.isOverSold ? '#DC2626' : '#16A34A') : '#6B7280' }}>
                {run.status === 'COMPLETED' ? `成功 ${run.successCount} / 失敗 ${run.failCount}` : run.status}
              </span>
            </div>
          ))}
        </section>
      )}
    </div>
  )
}

function StatCard({ label, value, color = '#1E3A5F' }: { label: string; value: number; color?: string }) {
  return (
    <div style={{ background: '#F8FAFC', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
      <div style={{ fontSize: '20px', fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: '12px', color: '#6B7280' }}>{label}</div>
    </div>
  )
}

const sectionStyle: React.CSSProperties = {
  background: '#fff', border: '1px solid #E5E7EB', borderRadius: '10px',
  padding: '20px', marginBottom: '16px',
}
const sectionTitle: React.CSSProperties = { margin: '0 0 16px', fontSize: '15px', color: '#1E3A5F' }
const labelStyle: React.CSSProperties = { display: 'block', marginBottom: '6px', fontSize: '13px', color: '#374151' }
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 10px', border: '1px solid #E5E7EB',
  borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box',
}
function primaryBtnStyle(disabled: boolean): React.CSSProperties {
  return {
    padding: '10px 20px', border: 'none', borderRadius: '6px',
    background: disabled ? '#93C5FD' : '#1E40AF', color: '#fff',
    fontSize: '14px', cursor: disabled ? 'not-allowed' : 'pointer',
  }
}
function secondaryBtnStyle(disabled: boolean): React.CSSProperties {
  return {
    padding: '10px 20px', border: '1px solid #1E40AF', borderRadius: '6px',
    background: '#fff', color: disabled ? '#93C5FD' : '#1E40AF',
    fontSize: '14px', cursor: disabled ? 'not-allowed' : 'pointer',
  }
}

export default ConcurrencyTestPage