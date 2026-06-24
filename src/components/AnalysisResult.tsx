import ReactMarkdown from 'react-markdown'
// react-markdown：把 Markdown 字串渲染成 HTML 元素
// ### 變 h3，** 變 bold，* 變 li 等

interface Props {
  result: string
  isLoading: boolean
  error: string | null
}

export default function AnalysisResult({ result, isLoading, error }: Props) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-gray-400">
        <div className="w-8 h-8 border-2 border-gray-600 border-t-blue-500
                       rounded-full animate-spin" />
        <p className="text-sm">AI 正在分析你的履歷...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-950/30 border border-red-900 rounded-xl p-4">
        <p className="text-red-400 text-sm">⚠️ {error}</p>
      </div>
    )
  }

  if (!result) return null

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-5">
      <h2 className="text-white font-medium mb-4 text-sm">✨ 分析結果</h2>
      {/* prose：Tailwind 的 typography 樣式，讓 Markdown 渲染出來的 HTML 有好看的排版 */}
      <div className="text-gray-300 text-sm leading-7
                      [&_h3]:text-white [&_h3]:font-semibold [&_h3]:mt-4 [&_h3]:mb-2
                      [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1
                      [&_li]:text-gray-300
                      [&_strong]:text-white [&_strong]:font-medium
                      [&_p]:mb-2">
        <ReactMarkdown>
          {result}
        </ReactMarkdown>
      </div>
    </div>
  )
}