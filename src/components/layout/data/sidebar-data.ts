import {
  IconHome,
  
} from '@tabler/icons-react'
import { AudioWaveform, Command, GalleryVerticalEnd, BookOpen, Users, GraduationCap, UserCheck, Download, FileText, Folder, Activity, Calendar, Video } from 'lucide-react'
import { type SidebarData } from '../types'

// Function to get user data from localStorage
const getUserFromStorage = () => {
  if (typeof window === 'undefined') {
    return {
      name: 'User',
      email: 'user@example.com',
      avatar: '/avatars/default.svg',
      role: 'admin',
    }
  }

  try {
    const storedUser = localStorage.getItem('user')
    if (storedUser && storedUser !== 'null' && storedUser !== 'undefined') {
      const user = JSON.parse(storedUser)
      return {
        name: user.username || user.name || 'User',
        email: user.email || 'user@example.com',
        avatar: user.avatar || '/avatars/default.svg',
        role: user.role || 'admin',
      }
    }
  } catch (error) {
    console.error('Error parsing user data from localStorage:', error)
  }

  return {
    name: 'User',
    email: 'user@example.com',
    avatar: '/avatars/default.svg',
    role: 'admin',
  }
}

export const getSidebarData = (): SidebarData => {
  const user = getUserFromStorage()
  
  // Define all possible menu items
  const allMenuItems = [
    {
      title: 'Home',
      url: '/',
      icon: IconHome,
    },
    {
      title: 'Classes',
      url: '/course-classes',
      icon: BookOpen,
    },
    {
      title: 'Sections',
      url: '/sections',
      icon: Users,
    },
    {
      title: 'Subjects',
      url: '/subjects',
      icon: GraduationCap,
    },
    {
      title: 'Teachers',
      url: '/teachers',
      icon: UserCheck,
    },
    
    {
      title: 'Folders',
      url: '/folders',
      icon: Folder,
    },
    {
      title: 'Teacher Sessions',
      url: '/teacher-sessions',
      icon: Activity,
    },
    {
      title: 'Meetings',
      url: '/meetings',
      icon: Calendar,
    },
    {
      title: 'My Folders',
      url: '/user-folders',
      icon: Folder,
    },
    {
      title: 'My Meetings',
      url: '/my-meetings',
      icon: Calendar,
    },
    {
      title: 'Screen Recordings',
      url: '/screen-recordings',
      icon: Video,
    },
    {
      title: 'Export',
      url: '/export',
      icon: Download,
    },
    {
      title: 'Logs',
      url: '/logs',
      icon: FileText,
    },
  ]

  // Filter menu items based on user role
  const getMenuItemsForRole = (role: string) => {
    if (role === 'teacher') {
      // For teachers, show only My Folders (userFolders), My Meetings, and Screen Recordings
      return allMenuItems.filter(item => 
       item.title === 'My Folders' || item.title === 'My Meetings' || item.title === 'Screen Recordings'
      )
    } else {
      // For admin, superadmin, and other roles, show all items except My Folders and My Meetings
      return allMenuItems.filter(item => item.title !== 'My Folders' && item.title !== 'My Meetings')
    }
  }

  return {
    user,
    teams: [
      {
        name: 'Sensei',
        logo: Command,
       plan: 'Learning Platform',
      },
      // {
      //   name: 'Acme Inc',
      //   logo: GalleryVerticalEnd,
      //   plan: 'Enterprise',
      // },
      // {
      //   name: 'Acme Corp.',
      //   logo: AudioWaveform,
      //   plan: 'Startup',
      // },
    ],
    navGroups: [
      {
        title: '',
        items: getMenuItemsForRole(user.role),
      },
    ],
  }
}
