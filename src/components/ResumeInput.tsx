import { useRef, useState } from 'react'
import mammoth from 'mammoth'
import { extractResumeText } from '../hooks/useExtractResume'

interface Props {
  value: string
  onChange: (value: string) => void
  onPdfUpload?: (file: File) => void
}

const ACCEPTED_TYPES = '.pdf,.docx'

export default function ResumeInput({ value, onChange, onPdfUpload }: Props) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // .docx 解析（不需要 AI，mammoth 直接處理）
  const parseDocx = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer()
    const result = await mammoth.extractRawText({ arrayBuffer })
    return result.value.trim()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsLoading(true)
    setError(null)

    try {
      let text = ''

      if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        const apiKey = import.meta.env.VITE_NVIDIA_API_KEY
        if (!apiKey) throw new Error('找不到 API Key，請確認 .env 設定')

        // 顯示 AI 辨識中的狀態
        setFileName(`${file.name}（AI 辨識中...）`)
        text = await extractResumeText(file, apiKey)

      } else if (file.name.endsWith('.docx')) {
        text = await parseDocx(file)
      } else {
        throw new Error('不支援此檔案格式，請上傳 PDF 或 .docx')
      }

      if (text.length < 20) {
        throw new Error('無法讀取檔案內容，請改用文字複製貼上')
      }

      onChange(text)
      setFileName(file.name)
      if (onPdfUpload) onPdfUpload(file)

    } catch (err) {
      setError(err instanceof Error ? err.message : '檔案解析失敗，請重試')
    } finally {
      setIsLoading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <label className="text-gray-300 text-sm">履歷內容</label>
        <span className="text-gray-600 text-xs">{value.length} 字</span>
      </div>

      <div className="flex gap-2 items-center">
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_TYPES}
          onChange={handleFileChange}
          className="hidden"
        />

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading}
          className="px-4 py-2 text-sm border border-gray-700 text-gray-300
                     rounded-lg hover:border-gray-500 transition-colors
                     disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isLoading ? (
            <span className="w-4 h-4 border-2 border-gray-500 border-t-white
                           rounded-full animate-spin inline-block" />
          ) : (
            <span>📄</span>
          )}
          {isLoading ? 'AI 辨識中...' : '上傳 PDF / DOCX'}
        </button>

        {fileName && !isLoading && (
          <span className="text-gray-500 text-xs truncate max-w-[200px]">
            ✓ {fileName}
          </span>
        )}
      </div>

      {error && (
        <p className="text-red-400 text-xs bg-red-950/30 px-3 py-2 rounded-lg">
          ⚠️ {error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-gray-800" />
        <span className="text-gray-600 text-xs">或直接貼上文字</span>
        <div className="flex-1 h-px bg-gray-800" />
      </div>

      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="將履歷文字貼在這裡..."
        rows={8}
        className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3
                   text-gray-200 text-sm placeholder-gray-600
                   focus:outline-none focus:border-blue-500 resize-none
                   transition-colors"
      />
    </div>
  )
}