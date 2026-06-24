import { useState } from 'react'
import JobTypeSelector from './components/JobTypeSelector'
import ResumeInput from './components/ResumeInput'
import AnalysisResult from './components/AnalysisResult'
import { useAnalyzeResume } from './hooks/useAnalyzeResume'

type JobType = 'frontend' | 'fullstack' | 'backend'

function App() {
  const [jobType, setJobType] = useState<JobType>('frontend')
  const [resumeText, setResumeText] = useState('')
  // pdfFile 儲存使用者上傳的 File 物件，null 代表還沒上傳
  const [pdfFile, setPdfFile] = useState<File | null>(null)

  // 從 custom hook 解構出分析函式和三個狀態
  const { analyze, isLoading, result, error } = useAnalyzeResume()

  // 有 PDF 或文字超過 50 字才能按分析
  const canAnalyze = pdfFile !== null || resumeText.trim().length > 50

  const handleAnalyze = () => {
    if (pdfFile) {
      // 優先用 PDF（圖片辨識模式）
      analyze({ type: 'pdf', file: pdfFile }, jobType)
    } else {
      // 沒有 PDF 就用文字模式
      analyze({ type: 'text', content: resumeText }, jobType)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-2">智慧履歷分析助手</h1>
        <p className="text-gray-400 mb-8">AI-powered Resume Analyzer</p>

        <div className="flex flex-col gap-6">
          <div>
            <p className="text-gray-300 text-sm mb-3">目標職位</p>
            <JobTypeSelector value={jobType} onChange={setJobType} />
          </div>

          {/* onPdfUpload：PDF 上傳成功時把 File 物件傳給 App */}
          <ResumeInput
            value={resumeText}
            onChange={setResumeText}
            onPdfUpload={setPdfFile}
          />

          <button
            disabled={!canAnalyze || isLoading}
            onClick={handleAnalyze}
            className={`w-full py-3 rounded-xl font-medium transition-all ${
              canAnalyze && !isLoading
                ? 'bg-blue-600 hover:bg-blue-500 text-white cursor-pointer'
                : 'bg-gray-800 text-gray-600 cursor-not-allowed'
            }`}
          >
            {isLoading
              ? '分析中...'
              : canAnalyze
                ? '開始分析履歷'
                : '請輸入履歷內容或上傳 PDF / DOCX'}
          </button>

          {/* 分析結果，三種狀態都在這個元件裡處理 */}
          <AnalysisResult result={result} isLoading={isLoading} error={error} />
        </div>
      </div>
    </div>
  )
}

export default App