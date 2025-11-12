'use client'

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts'

interface OverviewChartProps {
  data: Array<{
    teacherName: string
    duration: number // Duration in hours
  }>
}

export function OverviewChart({ data }: OverviewChartProps) {
  // Ensure data is an array and has items
  if (!data || data.length === 0) {
    return (
      <div className="h-[350px] flex items-center justify-center">
        <div className="text-sm text-muted-foreground">No data available</div>
      </div>
    )
  }

  // Custom tooltip to show duration in hours
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border bg-background p-2 shadow-sm">
          <div className="grid gap-2">
            <div className="flex flex-col">
              <span className="text-[0.70rem] uppercase text-muted-foreground">
                {payload[0].payload.teacherName}
              </span>
              <span className="font-bold text-muted-foreground">
                {payload[0].value?.toFixed(2)} hours
              </span>
            </div>
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
        <XAxis
          dataKey="teacherName"
          stroke="#888888"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          angle={-45}
          textAnchor="end"
          height={80}
        />
        <YAxis
          stroke="#888888"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          label={{ value: 'Duration (hrs)', angle: -90, position: 'insideLeft' }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar
          dataKey="duration"
          fill="#3b82f6"
          radius={[4, 4, 0, 0]}
          name="Duration"
        />
      </BarChart>
    </ResponsiveContainer>
  )
}
