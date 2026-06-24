type JobType = 'frontend' | 'fullstack' | 'backend'

interface Props {
  value: JobType
  onChange: (value: JobType) => void
}

const options: { label: string; value: JobType; desc: string }[] = [
  { label: '前端工程師', value: 'frontend', desc: 'React / Vue / Angular' },
  { label: '全端工程師', value: 'fullstack', desc: 'Frontend + Spring Boot' },
  { label: '後端工程師', value: 'backend', desc: 'Java / Node.js / API' },
]

export default function JobTypeSelector({ value, onChange }: Props) {
  return (
    <div className="flex gap-3 flex-wrap">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-4 py-3 rounded-xl border text-left transition-all ${
            value === opt.value
              ? 'border-blue-500 bg-blue-500/10 text-blue-400'
              : 'border-gray-700 text-gray-400 hover:border-gray-500'
          }`}
        >
          <div className="font-medium text-sm">{opt.label}</div>
          <div className="text-xs opacity-60 mt-0.5">{opt.desc}</div>
        </button>
      ))}
    </div>
  )
}