'use server'

export async function getOverviewData() {
  // TODO: Implement actual API call
  return Array.from({ length: 12 }, (_, i) => ({
    name: new Date(0, i).toLocaleString('default', { month: 'short' }),
    total: Math.floor(Math.random() * 5000) + 1000,
  }))
}

export async function getRecentSales() {
  // TODO: Implement actual API call
  return [
    {
      id: '1',
      name: 'Olivia Martin',
      email: 'olivia.martin@email.com',
      amount: 1999.00,
      initials: 'OM'
    },
    {
      id: '2',
      name: 'Jackson Lee',
      email: 'jackson.lee@email.com',
      amount: 39.00,
      initials: 'JL'
    },
    {
      id: '3',
      name: 'Isabella Nguyen',
      email: 'isabella.nguyen@email.com',
      amount: 299.00,
      initials: 'IN'
    },
    {
      id: '4',
      name: 'William Kim',
      email: 'will@email.com',
      amount: 99.00,
      initials: 'WK'
    },
    {
      id: '5',
      name: 'Sofia Davis',
      email: 'sofia.davis@email.com',
      amount: 39.00,
      initials: 'SD'
    }
  ]
}
