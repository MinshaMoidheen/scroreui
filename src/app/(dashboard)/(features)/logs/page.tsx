'use client'

import { useState, useMemo, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { 
  Search, 
  Filter, 
  Download, 
  RefreshCw, 
  AlertTriangle, 
  Info, 
  CheckCircle, 
  XCircle,
  User,
  Database,
  FileText,
  Clock,
  Eye,
  Trash2
} from 'lucide-react'
import { useGetLogsQuery } from '@/store/api/logsApi'
import { LogEntry } from '@/store/api/logsApi'

// Dummy logs removed - now using API

const actionOptions = [
  { value: 'all', label: 'All Actions' },
  { value: 'CREATE', label: 'Create' },
  { value: 'UPDATE', label: 'Update' },
  { value: 'DELETE', label: 'Delete' },
  { value: 'GET', label: 'Get/Read' },
  { value: 'LOGIN', label: 'Login' },
  { value: 'LOGOUT', label: 'Logout' },
  { value: 'EXPORT', label: 'Export' },
  { value: 'ERROR', label: 'Error' },
  { value: 'LOG', label: 'Log' }
]

const moduleOptions = [
  { value: 'all', label: 'All Modules' },
  { value: 'AUTH', label: 'Authentication' },
  { value: 'DATABASE', label: 'Database' },
  { value: 'FILE', label: 'File' },
  { value: 'FOLDER', label: 'Folder' },
  { value: 'USER', label: 'User' },
  { value: 'TEACHER_SESSION', label: 'Teacher Session' },
  { value: 'SYSTEM', label: 'System' },
  { value: 'LOG', label: 'Log' }
]

export default function LogsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedAction, setSelectedAction] = useState('all')
  const [selectedModule, setSelectedModule] = useState('all')
  const [selectedTimeRange, setSelectedTimeRange] = useState('all')
  const [page, setPage] = useState(1)
  const [limit] = useState(50)

  // Calculate date range for API
  const getDateRange = () => {
    if (selectedTimeRange === 'all') return { startDate: undefined, endDate: undefined }
    
    const now = new Date()
    let startDate: Date
    
    switch (selectedTimeRange) {
      case '1h':
        startDate = new Date(now.getTime() - 60 * 60 * 1000)
        break
      case '24h':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)
        break
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      default:
        return { startDate: undefined, endDate: undefined }
    }
    
    return {
      startDate: startDate.toISOString(),
      endDate: now.toISOString()
    }
  }

  // Get filters for API
  const dateRange = getDateRange()
  const moduleFilter = selectedModule === 'all' ? undefined : selectedModule
  const actionFilter = selectedAction === 'all' ? undefined : selectedAction

  // Fetch logs from API
  const { data, isLoading, error, refetch } = useGetLogsQuery({
    page,
    limit,
    module: moduleFilter,
    action: actionFilter,
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
  })

  const logs = data?.logs || []
  const pagination = data?.pagination

  // Filter logs based on search (client-side filtering for search term only)
  // Level, category, and time range are handled by API filters
  const filteredLogs = useMemo(() => {
    if (!searchTerm) return logs
    
    return logs.filter(log => {
      const matchesSearch = log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           log.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           log.details?.toLowerCase().includes(searchTerm.toLowerCase())
      
      return matchesSearch
    })
  }, [logs, searchTerm])

  const getLevelIcon = (level: string) => {
    // Map level string to icon
    switch (level) {
      case 'success':
        return CheckCircle
      case 'warning':
        return AlertTriangle
      case 'error':
        return XCircle
      default:
        return Info
    }
  }

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'success':
        return 'text-green-600 bg-green-50 border-green-200'
      case 'warning':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'error':
        return 'text-red-600 bg-red-50 border-red-200'
      default:
        return 'text-blue-600 bg-blue-50 border-blue-200'
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'auth':
        return User
      case 'database':
        return Database
      case 'file':
        return FileText
      case 'system':
        return Database
      case 'user':
        return User
      default:
        return Info
    }
  }

  const handleRefresh = () => {
    refetch()
  }

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1)
  }, [selectedAction, selectedModule, selectedTimeRange])

  const handleExportLogs = () => {
    const csvContent = [
      'Timestamp,Level,Category,Message,User',
      ...filteredLogs.map(log => 
        `${log.timestamp},${log.level},${log.category},"${log.message}",${log.userName || ''}`
      ).join('\n')
    ].join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `logs-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Logs</h1>
        
        </div>
        <div className="flex items-center gap-2">
          {/* <Button variant="outline" onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button> */}
          {/* <Button onClick={handleExportLogs} disabled={isLoading || filteredLogs.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button> */}
        </div>
      </div>

      {/* Filters */}
      <Card>
       <br />
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search logs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Action</label>
              <Select value={selectedAction} onValueChange={setSelectedAction}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {actionOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Module</label>
              <Select value={selectedModule} onValueChange={setSelectedModule}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {moduleOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* <div className="space-y-2">
              <label className="text-sm font-medium">Time Range</label>
              <Select value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="1h">Last Hour</SelectItem>
                  <SelectItem value="24h">Last 24 Hours</SelectItem>
                  <SelectItem value="7d">Last 7 Days</SelectItem>
                  <SelectItem value="30d">Last 30 Days</SelectItem>
                </SelectContent>
              </Select>
            </div> */}
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Log Entries</CardTitle>
            <Badge variant="secondary">
              {filteredLogs.length} of {pagination?.totalLogs || 0} entries
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md text-red-800">
              <p className="font-medium">Error loading logs</p>
              <p className="text-sm mt-1">
                {error && 'data' in error 
                  ? (error.data as any)?.message || 'Failed to fetch logs'
                  : 'Unknown error occurred'}
              </p>
            </div>
          )}
          
          {isLoading && (
            <div className="text-center py-8 text-muted-foreground">
              Loading logs...
            </div>
          )}
          
          {!isLoading && !error && (
            <div className="rounded-md border">
              <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>User</TableHead>
                  {/* <TableHead>Actions</TableHead> */}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log) => {
                  const LevelIcon = getLevelIcon(log.level)
                  const CategoryIcon = getCategoryIcon(log.category)
                  
                  return (
                    <TableRow key={log.id}>
                      <TableCell className="font-mono text-sm">
                        {new Date(log.timestamp).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge className={getLevelColor(log.level)}>
                          <LevelIcon className="mr-1 h-3 w-3" />
                          {log.level.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <CategoryIcon className="h-4 w-4 text-muted-foreground" />
                          {log.category}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <div className="truncate" title={log.message}>
                          {log.message}
                        </div>
                        {log.details && (
                          <div className="text-xs text-muted-foreground mt-1 truncate" title={log.details}>
                            {log.details}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {log.userName ? (
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{log.userName}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      {/* <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell> */}
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
          )}
          
          {!isLoading && !error && filteredLogs.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No logs found matching your criteria
            </div>
          )}

          {/* Pagination */}
          {!isLoading && !error && pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Page {pagination.currentPage} of {pagination.totalPages}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={!pagination.hasPrevPage}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => p + 1)}
                  disabled={!pagination.hasNextPage}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
