'use client'

import { Avatar, AvatarFallback } from "../ui/avatar"

interface TopTeacher {
  username: string
  email: string
  totalActiveTime: number
  totalActiveTimeHours: number
  totalSessions: number
  avgActiveTime: number
}

interface RecentSalesListProps {
  teachers: TopTeacher[]
}

export function RecentSalesList({ teachers }: RecentSalesListProps) {
  const getInitials = (username: string) => {
    return username
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <div className="space-y-8">
      {teachers.length === 0 ? (
        <div className="text-sm text-muted-foreground">No teacher data available</div>
      ) : (
        teachers.map((teacher, index) => (
          <div key={teacher.username} className="flex items-center gap-4">
            <Avatar className="h-9 w-9">
              <AvatarFallback>{getInitials(teacher.username)}</AvatarFallback>
            </Avatar>
            <div className="flex flex-1 flex-wrap items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium leading-none">{teacher.username}</p>
                <p className="text-sm text-muted-foreground">
                  {teacher.email}
                </p>
              </div>
              <div className="text-right space-y-1">
                <div className="font-medium">
                  {teacher.totalActiveTimeHours.toFixed(1)}h
                </div>
                <div className="text-xs text-muted-foreground">
                  {teacher.totalSessions} sessions
                </div>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  )
}
