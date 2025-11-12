'use client'

import { useState, useEffect } from 'react'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from '../ui/sidebar'
import { NavGroup } from './nav-group'
import { NavUser } from './nav-user'
import { TeamSwitcher } from './team-switcher'
import { getSidebarData } from './data/sidebar-data'
import { type SidebarData } from './types'

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const [sidebarData, setSidebarData] = useState<SidebarData | null>(null)

  useEffect(() => {
    // Get initial data
    setSidebarData(getSidebarData())
    
    // Listen for storage changes to update user data
    const handleStorageChange = () => {
      setSidebarData(getSidebarData())
    }

    window.addEventListener('storage', handleStorageChange)
    
    // Also listen for custom events (for same-tab updates)
    window.addEventListener('userDataChanged', handleStorageChange)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('userDataChanged', handleStorageChange)
    }
  }, [])

  if (!sidebarData) {
    return null // or a loading spinner
  }

  return (
    <Sidebar collapsible='icon' variant='floating' {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={sidebarData.teams} />
      </SidebarHeader>
      <SidebarContent>
        {sidebarData.navGroups.map((props) => (
          <NavGroup key={props.title} {...props} />
        ))}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={sidebarData.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
