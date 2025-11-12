'use client'

import { Suspense } from 'react'
import { RecentSalesList } from './recent-sales-list'
import { useGetDashboardStatsQuery } from '@/store/api/dashboardApi'

export function RecentSales() {
  const { data: dashboardData, isLoading } = useGetDashboardStatsQuery()

  const topTeachers = dashboardData?.topTeachers || []

  return (
    <div className="space-y-4">
      <Suspense fallback={<div className="h-[400px] flex items-center justify-center">Loading...</div>}>
        {isLoading ? (
          <div className="h-[400px] flex items-center justify-center">Loading teacher data...</div>
        ) : (
          <RecentSalesList teachers={topTeachers} />
        )}
      </Suspense>
    </div>
  )
}
