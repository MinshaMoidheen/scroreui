'use client'

import { usePathname } from 'next/navigation'

export function useTopNavLinks() {
  const pathname = usePathname()
  
  return [
    {
      title: 'Overview',
      href: '/',
      isActive: pathname === '/',
    },
    // {
    //   title: 'Customers',
    //   href: '/customers',
    //   isActive: pathname === '/customers',
    // },
    // {
    //   title: 'Products',
    //   href: '/products',
    //   isActive: pathname === '/products',
    // },
    // {
    //   title: 'Settings',
    //   href: '/settings',
    //   isActive: pathname === '/settings',
    // },
  ]
}
