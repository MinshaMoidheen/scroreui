'use client'

import { Suspense } from 'react'
import { OverviewChart } from './overview-chart'
import { useGetDashboardStatsQuery } from '@/store/api/dashboardApi'

export function Overview() {
  const { data: dashboardData, isLoading, error } = useGetDashboardStatsQuery()

  const chartData = dashboardData?.teacherDurationGraph || []

  if (isLoading) {
    return (
      <div className="h-[350px] flex items-center justify-center">
        <div className="text-sm text-muted-foreground">Loading chart data...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-[350px] flex items-center justify-center">
        <div className="text-sm text-destructive">Error loading chart data</div>
      </div>
    )
  }

  if (!chartData || chartData.length === 0) {
    return (
      <div className="h-[350px] flex items-center justify-center">
        <div className="text-sm text-muted-foreground">No teacher activity data available for this month</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Suspense fallback={<div className="h-[350px] flex items-center justify-center">Loading...</div>}>
        <OverviewChart data={chartData} />
      </Suspense>
    </div>
  )
}
