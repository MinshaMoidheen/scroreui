'use client'

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Overview } from "@/components/dashboard/overview"
import { RecentSales } from "@/components/dashboard/recent-sales"
import { Header } from "@/components/layout/header"
import { TopNav } from "@/components/layout/top-nav"
import { ProfileDropdown } from "@/components/profile-dropdown"
import { Search } from "@/components/search"
import { ThemeSwitch } from "@/components/theme-switch"
import { Main } from '@/components/ui/main'
import { HeaderContainer } from "@/components/ui/header-container"
import { useGetDashboardStatsQuery } from "@/store/api/dashboardApi"
import { Users, BookOpen, GraduationCap, Folder } from "lucide-react"

const topNav = [
  {
    title: 'Overview',
    href: 'dashboard/overview',
    isActive: true,
    disabled: false,
  },
  // {
  //   title: 'Customers',
  //   href: 'dashboard/customers',
  //   isActive: false,
  //   disabled: true,
  // },
  // {
  //   title: 'Products',
  //   href: 'dashboard/products',
  //   isActive: false,
  //   disabled: true,
  // },
  // {
  //   title: 'Settings',
  //   href: 'dashboard/settings',
  //   isActive: false,
  //   disabled: true,
  // },
]

export default function DashboardPage() {
  const { data: dashboardData, isLoading } = useGetDashboardStatsQuery()

  const stats = dashboardData?.stats || {
    totalTeachers: 0,
    totalCourseClasses: 0,
    totalSubjects: 0,
    totalParentFolders: 0,
  }

  return (
    <>
      <Header fixed>
        <TopNav links={topNav} />
        <div className='ml-auto flex items-center space-x-4'>
          <Search />
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main fixed>
        <HeaderContainer>
          <>
            <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
            {/* <div className="flex items-center space-x-2">
              <Button>Download</Button>
            </div> */}
          </>
        </HeaderContainer>

        <Tabs defaultValue="overview" className="space-y-4">
          {/* <div className="w-full overflow-x-auto pb-2">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="analytics" disabled>Analytics</TabsTrigger>
              <TabsTrigger value="reports" disabled>Reports</TabsTrigger>
              <TabsTrigger value="notifications" disabled>Notifications</TabsTrigger>
            </TabsList>
          </div> */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Teachers</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {isLoading ? '...' : stats.totalTeachers}
                  </div>
                  <p className="text-xs text-muted-foreground">Active teachers</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Course Classes</CardTitle>
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {isLoading ? '...' : stats.totalCourseClasses}
                  </div>
                  <p className="text-xs text-muted-foreground">Total course classes</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Subjects</CardTitle>
                  <GraduationCap className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {isLoading ? '...' : stats.totalSubjects}
                  </div>
                  <p className="text-xs text-muted-foreground">Total subjects</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Parent Folders</CardTitle>
                  <Folder className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {isLoading ? '...' : stats.totalParentFolders}
                  </div>
                  <p className="text-xs text-muted-foreground">Root folders</p>
                </CardContent>
              </Card>
            </div>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-7">
              <Card className="col-span-1 lg:col-span-4">
                <CardHeader>
                  <CardTitle>Teacher Duration</CardTitle>
                  <CardDescription>Active time duration for teachers this month</CardDescription>
                </CardHeader>
                <CardContent className="pl-2">
                  <Overview />
                </CardContent>
              </Card>
              <Card className="col-span-1 lg:col-span-3">
                <CardHeader>
                  <CardTitle>Top 5 Teachers</CardTitle>
                  <CardDescription>Highest performing teachers this month</CardDescription>
                </CardHeader>
                <CardContent>
                  <RecentSales />
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </Main>
    </>
  )
}
