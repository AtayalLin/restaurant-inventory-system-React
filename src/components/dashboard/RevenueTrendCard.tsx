import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { LineChart as LineChartIcon, Receipt } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card, CardHeader, EmptyState, Button } from '../ui'
import { formatCurrency } from '../../lib/format'
import type { DailyTrend } from '../../hooks/useDashboard'

export function RevenueTrendCard({ data }: { data: DailyTrend[] }) {
  const total = data.reduce((sum, d) => sum + d.revenue, 0)
  const isEmpty = total === 0

  return (
    <Card className="flex h-full flex-col">
      <CardHeader
        icon={<LineChartIcon size={18} className="text-brand-600" aria-hidden="true" />}
        title="近 7 天銷售趨勢"
        description={isEmpty ? undefined : `7 天合計 ${formatCurrency(total)}`}
      />
      <div className="flex-1 px-3 pb-4 pt-3">
        {isEmpty ? (
          <EmptyState
            className="mx-2 h-full min-h-[240px]"
            icon={<Receipt size={20} />}
            title="近 7 天沒有已完成的銷售紀錄"
            description="完成一筆銷售訂單後，這裡就會畫出每日營收趨勢。"
            action={
              <Link to="/sales">
                <Button variant="secondary" size="sm">前往銷售管理</Button>
              </Link>
            }
          />
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={data} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
              <defs>
                <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3B6BA5" stopOpacity={0.28} />
                  <stop offset="100%" stopColor="#3B6BA5" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="#E4E8EE" />
              <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fill: '#6B7480', fontSize: 12 }} />
              <YAxis
                width={64}
                tickLine={false}
                axisLine={false}
                tick={{ fill: '#6B7480', fontSize: 12 }}
                tickFormatter={(v: number) => (v >= 1000 ? `${v / 1000}k` : `${v}`)}
              />
              <Tooltip
                cursor={{ stroke: '#B4C8E2' }}
                contentStyle={{ borderRadius: 10, border: '1px solid #E4E8EE', fontSize: 13 }}
                formatter={(value) => [formatCurrency(Number(value)), '營收']}
              />
              <Area type="monotone" dataKey="revenue" stroke="#2B5287" strokeWidth={2.5} fill="url(#revenueFill)"
                activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  )
}
