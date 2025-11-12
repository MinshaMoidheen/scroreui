'use client'

import { useState, useCallback, useEffect } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import '../styles/react-pdf.css'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  ChevronLeft, 
  ChevronRight, 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  Download,
  Search,
  X,
  ArrowUp,
  ArrowDown
} from 'lucide-react'

// Set up PDF.js worker - use local worker file for better reliability
pdfjs.GlobalWorkerOptions.workerSrc = '/pdfjs/pdf.worker.min.js'

// Additional PDF.js configuration for better compatibility
pdfjs.GlobalWorkerOptions.workerPort = null

// Test worker accessibility
if (typeof window !== 'undefined') {
  fetch('/pdfjs/pdf.worker.min.js', { method: 'HEAD' })
    .then(response => {
      if (!response.ok) {
        console.warn('Local PDF.js worker not accessible, using CDN worker')
        pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`
      } else {
        console.log('Local PDF.js worker is accessible')
      }
    })
    .catch(() => {
      console.warn('Local PDF.js worker not accessible, using CDN worker')
      pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`
    })
}

interface ReactPdfViewerProps {
  src: string
  className?: string
  onError?: (error: Error) => void
}

export function ReactPdfViewer({ src, className = '', onError }: ReactPdfViewerProps) {
  const [numPages, setNumPages] = useState<number>(0)
  const [pageNumber, setPageNumber] = useState<number>(1)
  const [scale, setScale] = useState<number>(1.0)
  const [rotation, setRotation] = useState<number>(0)
  const [searchText, setSearchText] = useState<string>('')
  const [isSearching, setIsSearching] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [retryCount, setRetryCount] = useState<number>(0)
  const [scrollPosition, setScrollPosition] = useState<number>(0)

  console.log("isLoading", isLoading, "error", error, "src", src)

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    console.log('PDF loaded successfully:', { numPages, src })
    setNumPages(numPages)
    setPageNumber(1)
    setError(null)
    setIsLoading(false)
  }, [src])

  const onDocumentLoadError = useCallback((error: Error) => {
    console.error('Error loading PDF:', error)
    console.error('PDF URL:', src)
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    })
    
    // Check if it's a worker-related error
    if (error.message.includes('worker') || error.message.includes('Failed to fetch dynamically imported module')) {
      console.warn('Worker error detected, trying with jsdelivr CDN worker')
      // Try jsdelivr CDN worker as fallback
      pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`
      // Retry immediately with CDN worker
      setTimeout(() => {
        setError(null)
        setIsLoading(true)
        setPageNumber(1)
      }, 100)
      return
    }
    
    // Additional debugging for PDF structure errors
    if (error.message.includes('Invalid PDF structure')) {
      console.error('PDF Structure Error Details:')
      console.error('- This usually means the PDF file is corrupted or not a valid PDF')
      console.error('- The file might be empty or contain invalid data')
      console.error('- Check if the file was uploaded correctly')
      console.error('- Verify the file is not corrupted during transfer')
      console.error('- PDF URL being accessed:', src)
      console.error('- PDF.js version:', pdfjs.version)
      console.error('- Worker source:', pdfjs.GlobalWorkerOptions.workerSrc)
      
      // Test the PDF URL directly
      fetch(src, { method: 'HEAD' })
        .then(response => {
          console.error('PDF URL test result:', {
            status: response.status,
            statusText: response.statusText,
            contentType: response.headers.get('content-type'),
            contentLength: response.headers.get('content-length')
          })
        })
        .catch(fetchError => {
          console.error('PDF URL test failed:', fetchError)
        })
    }
    
    const errorMessage = `Failed to load PDF: ${error.message}`
    setError(errorMessage)
    setIsLoading(false)
    
    // Call parent error handler if provided
    if (onError) {
      onError(error)
    }
  }, [src, onError])

  const goToPrevPage = useCallback(() => {
    setPageNumber(prev => Math.max(prev - 1, 1))
  }, [])

  const goToNextPage = useCallback(() => {
    setPageNumber(prev => Math.min(prev + 1, numPages))
  }, [numPages])

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement
    const scrollTop = target.scrollTop
    const scrollHeight = target.scrollHeight - target.clientHeight
    const scrollPercent = (scrollTop / scrollHeight) * 100
    setScrollPosition(scrollPercent)
  }, [])

  const scrollToTop = useCallback(() => {
    const container = document.querySelector('.pdf-container')
    if (container) {
      container.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [])

  const scrollToBottom = useCallback(() => {
    const container = document.querySelector('.pdf-container')
    if (container) {
      container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' })
    }
  }, [])

  // Keyboard shortcuts for scrolling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'Home':
            e.preventDefault()
            scrollToTop()
            break
          case 'End':
            e.preventDefault()
            scrollToBottom()
            break
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [scrollToTop, scrollToBottom])

  const zoomIn = useCallback(() => {
    setScale(prev => Math.min(prev + 0.2, 3.0))
  }, [])

  const zoomOut = useCallback(() => {
    setScale(prev => Math.max(prev - 0.2, 0.5))
  }, [])

  const rotate = useCallback(() => {
    setRotation(prev => (prev + 90) % 360)
  }, [])

  const handlePageInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const page = parseInt(e.target.value)
    if (page >= 1 && page <= numPages) {
      setPageNumber(page)
    }
  }, [numPages])

  const handleSearch = useCallback(() => {
    if (searchText.trim()) {
      setIsSearching(true)
      // Note: react-pdf doesn't have built-in search, so we'll just highlight the text
      // In a real implementation, you might want to use a different PDF library
      setTimeout(() => setIsSearching(false), 1000)
    }
  }, [searchText])

  const downloadPdf = useCallback(() => {
    const link = document.createElement('a')
    link.href = src
    link.download = 'document.pdf'
    link.click()
  }, [src])

  const retryLoad = useCallback(() => {
    console.log('Retrying PDF load for:', src, 'Attempt:', retryCount + 1)
    setError(null)
    setIsLoading(true)
    setRetryCount(prev => prev + 1)
    
    // Try different worker sources on retry
    if (retryCount === 1) {
      console.log('Trying jsdelivr CDN worker on retry')
      pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`
    } else if (retryCount === 2) {
      console.log('Trying unpkg CDN worker on retry')
      pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`
    } else if (retryCount === 3) {
      console.log('Trying local worker on retry')
      pdfjs.GlobalWorkerOptions.workerSrc = '/pdfjs/pdf.worker.min.js'
    } else if (retryCount >= 4) {
      console.log('Trying jsdelivr CDN worker as final attempt')
      pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`
    }
    
    // Force re-render by updating a dummy state
    setPageNumber(1)
  }, [src, retryCount])

  const openInNewTab = useCallback(() => {
    window.open(src, '_blank')
  }, [src])

  // Validate PDF URL and test accessibility
  const validatePdfUrl = useCallback(async () => {
    try {
      console.log('Validating PDF URL:', src)
      const response = await fetch(src, { method: 'HEAD' })
      console.log('PDF URL validation response:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const contentType = response.headers.get('content-type')
      if (contentType && !contentType.includes('pdf')) {
        throw new Error(`Invalid content type: ${contentType}. Expected PDF.`)
      }
      
      console.log('PDF URL validation successful')
      return true
    } catch (error) {
      console.error('PDF URL validation failed:', error)
      setError(`URL validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      return false
    }
  }, [src])

  return (
    <div className={`w-full h-full flex flex-col ${className}`}>
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 border-b bg-gray-50 dark:bg-gray-800">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={goToPrevPage}
            disabled={pageNumber <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <div className="flex items-center gap-2">
            <Input
              type="number"
              value={pageNumber}
              onChange={handlePageInput}
              className="w-16 h-8 text-center"
              min={1}
              max={numPages}
            />
            <span className="text-sm text-muted-foreground">of {numPages}</span>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={goToNextPage}
            disabled={pageNumber >= numPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <Input
              type="text"
              placeholder="Search..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-48 h-8"
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleSearch}
              disabled={!searchText.trim()}
            >
              <Search className="h-4 w-4" />
            </Button>
            {isSearching && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchText('')
                  setIsSearching(false)
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={zoomOut}
              disabled={scale <= 0.5}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground min-w-[60px] text-center">
              {Math.round(scale * 100)}%
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={zoomIn}
              disabled={scale >= 3.0}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={rotate}
          >
            <RotateCw className="h-4 w-4" />
          </Button>
          
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={scrollToTop}
              title="Scroll to Top"
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
            <div className="text-xs text-muted-foreground min-w-[40px] text-center">
              {Math.round(scrollPosition)}%
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={scrollToBottom}
              title="Scroll to Bottom"
            >
              <ArrowDown className="h-4 w-4" />
            </Button>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={downloadPdf}
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* PDF Content */}
      <div 
        className="flex-1 overflow-auto bg-gray-100 dark:bg-gray-900 p-4 pdf-container"
        onScroll={handleScroll}
      >
        {error ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center max-w-md">
              <div className="text-red-500 mb-4">
                <p className="text-lg font-semibold">PDF Error</p>
                <p className="text-sm">{error}</p>
              </div>
              <div className="space-y-2 text-sm text-muted-foreground mb-4">
                <p>URL: {src}</p>
                <p>This could be due to:</p>
                <ul className="text-left space-y-1">
                  <li>• Invalid PDF file structure</li>
                  <li>• CORS issues</li>
                  <li>• File not found</li>
                  <li>• Network connectivity problems</li>
                </ul>
              </div>
              <div className="flex gap-2 justify-center">
                <Button onClick={retryLoad} variant="outline">
                  Try Again
                </Button>
                <Button onClick={validatePdfUrl} variant="outline">
                  Validate URL
                </Button>
                <Button onClick={openInNewTab} variant="outline">
                  Open in New Tab
                </Button>
                <Button onClick={downloadPdf} variant="outline">
                  Download
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            <Document
              file={src}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              loading={
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading PDF...</p>
                    <p className="text-xs text-muted-foreground mt-2">URL: {src}</p>
                  </div>
                </div>
              }
              error={
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <p className="text-red-500 mb-4">Failed to load PDF</p>
                    <Button onClick={retryLoad}>
                      Retry
                    </Button>
                  </div>
                </div>
              }
            >
              <Page
                pageNumber={pageNumber}
                scale={scale}
                rotate={rotation}
                className="shadow-lg"
                renderTextLayer={false}
                renderAnnotationLayer={false}
              />
            </Document>
          </div>
        )}
      </div>
    </div>
  )
}
