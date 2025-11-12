'use client'

import { useEffect, useRef, useState } from 'react'
import { Replayer } from 'rrweb'
import type { eventWithTime } from '@/hooks/use-rrweb-recording'
import '@/styles/rrweb-mouse.css'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Play, 
  Pause, 
  Square, 
  SkipBack, 
  SkipForward,
  RotateCcw,
  Maximize,
  Minimize
} from 'lucide-react'

interface RrwebSessionViewerProps {
  events: eventWithTime[]
  sessionId: string
  videoSrc?: string
  videoType?: string
  onClose?: () => void
}

export function RrwebSessionViewer({ events, sessionId, videoSrc, videoType, onClose }: RrwebSessionViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const replayerRef = useRef<Replayer | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null)
  const videoHasEndedRef = useRef(false) // Track if video has ended to prevent loops
  const lastVideoTimeRef = useRef(0) // Track last video time to detect loops
  const [isVideoPlaying, setIsVideoPlaying] = useState(false) // Track video playback state

  // console.log('RRWeb SessionViewer: Received props:', { 
  //   eventsLength: events?.length || 0, 
  //   sessionId, 
  //   videoSrc,
  //   videoType,
  //   events: events?.slice(0, 3) // Show first 3 events for debugging
  // })

  useEffect(() => {
    if (!containerRef.current || !events || events.length === 0) {
      console.log('RRWeb: No container or events available', { 
        hasContainer: !!containerRef.current, 
        eventsLength: events?.length || 0 
      })
      return
    }

    // console.log('RRWeb: Initializing replayer with events:', events.length)

    try {
      // Clean up existing replayer
      if (replayerRef.current) {
        replayerRef.current.destroy()
        replayerRef.current = null
      }

      // Create a deep copy of events to avoid modifying frozen objects
      // This prevents "Cannot add property, object is not extensible" errors
      let eventsCopy: typeof events
      try {
        const eventsJson = JSON.stringify(events)
        
        // Replace backend API URLs with proxy URLs in the events data
        // This ensures images load from same origin from the start
        // Pattern 1: Full URLs with localhost:5031
        let fixedEventsJson = eventsJson.replace(
          /http:\/\/localhost:5031\/api\/v1\/files\/serve\/([^"'\s\)\?]+)([^"'\s\)]*)/g,
          '/api/files/serve/$1$2'
        )
        
        // Pattern 2: Any domain with /api/v1/files/serve/
        fixedEventsJson = fixedEventsJson.replace(
          /https?:\/\/[^\/]+\/api\/v1\/files\/serve\/([^"'\s\)\?]+)([^"'\s\)]*)/g,
          '/api/files/serve/$1$2'
        )
        
        // Pattern 3: Relative URLs starting with /api/v1/files/serve/ (not already processed)
        fixedEventsJson = fixedEventsJson.replace(
          /\/api\/v1\/files\/serve\/([^"'\s\)\?,\}\]]+)([^"'\s\)\?,\}\]]*)/g,
          '/api/files/serve/$1$2'
        )
        
        // Pattern 4: Replace blob URLs - they're temporary and won't work in replay
        // Mark them so runtime code can try to recover filename from attributes
        fixedEventsJson = fixedEventsJson.replace(
          /blob:https?:\/\/[^"'\s\)]+/g,
          'blob://invalid-in-replay'
        )
        
        eventsCopy = JSON.parse(fixedEventsJson) as typeof events
      } catch (e) {
        console.warn('RRWeb: Failed to deep copy events, using shallow copy', e)
        // Fallback to shallow copy if JSON parsing fails
        eventsCopy = events.map((event: any) => ({
          type: event.type,
          data: event.data,
          timestamp: event.timestamp
        })) as typeof events
        
        // Try to fix URLs in shallow copy
        const fixUrlsInObject = (obj: any): any => {
          if (!obj || typeof obj !== 'object') return obj
          
          if (Array.isArray(obj)) {
            return obj.map(fixUrlsInObject)
          }
          
          const fixed: any = {}
          for (const key in obj) {
            const value = obj[key]
            if (typeof value === 'string') {
              // Replace backend API URLs
              fixed[key] = value
                .replace(/http:\/\/localhost:5031\/api\/v1\/files\/serve\/([^"'\s\)]+)/g, '/api/files/serve/$1')
                .replace(/(https?:\/\/[^\/]+)?\/api\/v1\/files\/serve\/([^"'\s\)]+)/g, '/api/files/serve/$2')
            } else if (typeof value === 'object') {
              fixed[key] = fixUrlsInObject(value)
            } else {
              fixed[key] = value
            }
          }
          return fixed
        }
        
        eventsCopy = fixUrlsInObject(eventsCopy) as typeof events
      }

      // Initialize replayer as overlay with copied events
      replayerRef.current = new Replayer(eventsCopy, {
        root: containerRef.current,
        loadTimeout: 10000,
        skipInactive: false,
        showWarning: true,
        showDebug: true,
        mouseTail: {
          duration: 1000,
          lineCap: 'round',
          lineWidth: 4,
          strokeStyle: '#ff0000',
        },
        plugins: [],
        // Configure for overlay mode with enhanced mouse display
        insertStyleRules: [
          '.replayer-wrapper { background: transparent !important; }',
          '.replayer-mouse { z-index: 1000 !important; position: absolute !important; width: 20px !important; height: 20px !important; border-radius: 50% !important; background: #ff0000 !important; border: 2px solid #ffffff !important; pointer-events: none !important; transform: translate(-50%, -50%) !important; box-shadow: 0 0 10px rgba(255, 0, 0, 0.5) !important; }',
          '.replayer-mouse-tail { z-index: 999 !important; pointer-events: none !important; stroke: #ff0000 !important; stroke-width: 3 !important; fill: none !important; opacity: 0.8 !important; }',
          '.replayer-mouse::before { content: "" !important; position: absolute !important; top: 50% !important; left: 50% !important; width: 4px !important; height: 4px !important; background: #ffffff !important; border-radius: 50% !important; transform: translate(-50%, -50%) !important; }',
        ],
        // Enable mouse interactions
        UNSAFE_replayCanvas: true,
        // Show all mouse events
        blockClass: 'rr-block',
      })

      // console.log('RRWeb: Replayer initialized successfully')

      // Fix broken images in the replay
      const fixBrokenImages = () => {
        if (!containerRef.current) return

        try {
          // Get the replayer's iframe
          const replayerIframe = containerRef.current?.querySelector('iframe') as HTMLIFrameElement
          
          // Function to fix images in a document
          const fixImagesInDocument = (doc: Document) => {
            const images = doc.querySelectorAll('img')
            images.forEach((img: HTMLImageElement) => {
              // Skip if image is already loaded successfully and not from backend
              if (img.complete && img.naturalHeight > 0 && !img.src.includes('localhost:5031') && !img.src.startsWith('blob:')) return
              if (img.src.startsWith('data:')) return
              
              // Handle broken blob URLs - extract filename from error context or alt text
              if (img.src.startsWith('blob:') || img.src === 'blob://invalid-in-replay') {
                // Blob URLs are temporary and often invalid after page reload/session replay
                // Try to extract filename from alt text, title, or other attributes
                const altText = img.alt || img.getAttribute('alt') || ''
                const titleText = img.title || img.getAttribute('title') || ''
                
                // Look for filename in alt/title
                const possibleFilename = altText || titleText
                if (possibleFilename && possibleFilename.includes('.') && 
                    (possibleFilename.match(/\.(jpg|jpeg|png|gif|webp)$/i))) {
                  const filename = possibleFilename.split(/[\/\\]/).pop() || possibleFilename
                  const proxyUrl = `/api/files/serve/${encodeURIComponent(filename)}`
                  img.src = proxyUrl
                  img.removeAttribute('crossorigin')
                  img.setAttribute('data-rrweb-fixed', 'true')
                  console.log('RRWeb: Replacing broken blob URL with proxy:', filename)
                  return
                }
                
                // If blob URL is working, skip it
                if (img.complete && img.naturalHeight > 0) return
                
                // If blob URL is broken, it will be caught by error handler below
              }
              
              // Check if image has a data-fixed attribute to avoid re-processing
              if (img.hasAttribute('data-rrweb-fixed')) return
              
              // Listen for image load errors
              const handleImageError = async () => {
                try {
                  // Extract filename from the src URL
                  const srcUrl = img.src || img.getAttribute('src') || ''
                  
                  // Handle blob URLs specially - they can't be used after session ends
                  if (srcUrl.startsWith('blob:')) {
                    // Try to get filename from alt, title, or data attributes
                    const altText = img.alt || img.getAttribute('alt') || ''
                    const titleText = img.title || img.getAttribute('title') || ''
                    const dataFilename = img.getAttribute('data-filename') || img.getAttribute('data-src') || ''
                    
                    // Look for filename in various attributes
                    let possibleFilename = altText || titleText || dataFilename
                    
                    // If no filename found, try to get from parent element or nearby text
                    if (!possibleFilename || !possibleFilename.includes('.')) {
                      const parent = img.parentElement
                      if (parent) {
                        const parentText = parent.textContent || ''
                        // Look for image filename patterns in parent text
                        const filenameMatch = parentText.match(/([a-zA-Z0-9_\-]+\.(jpg|jpeg|png|gif|webp))/i)
                        if (filenameMatch) {
                          possibleFilename = filenameMatch[1]
                        }
                      }
                    }
                    
                    if (possibleFilename && possibleFilename.includes('.') && 
                        possibleFilename.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
                      const filename = possibleFilename.split(/[\/\\]/).pop() || possibleFilename
                      const proxyUrl = `/api/files/serve/${encodeURIComponent(filename)}`
                      img.src = proxyUrl
                      img.removeAttribute('crossorigin')
                      img.setAttribute('data-rrweb-fixed', 'true')
                      console.log('RRWeb: Replacing broken blob URL with proxy from attributes:', filename)
                      return
                    } else {
                      console.warn('RRWeb: Cannot extract filename from blob URL:', srcUrl)
                      return
                    }
                  }
                  
                  let filename = ''
                  
                  // Try multiple ways to extract filename
                  const urlParts = srcUrl.split('/')
                  const lastPart = urlParts[urlParts.length - 1]
                  
                  // Remove query parameters and hash
                  filename = lastPart.split('?')[0].split('#')[0]
                  
                  // If we can extract a filename, try to load it through Next.js proxy (same-origin)
                  if (filename && filename.length > 0 && filename.includes('.')) {
                    // Use Next.js API route proxy to avoid CORS issues in iframe
                    const proxyUrl = `/api/files/serve/${encodeURIComponent(filename)}`
                    
                    console.log('RRWeb: Attempting to fix broken image:', filename, 'Original URL:', srcUrl)
                    
                    // Remove existing error listeners to avoid recursion
                    img.removeEventListener('error', handleImageError)
                    
                    // Set the proxy URL directly (same origin, no CORS issues)
                    img.src = proxyUrl
                    img.removeAttribute('crossorigin') // Remove crossOrigin for same-origin requests
                    img.setAttribute('data-rrweb-fixed', 'true')
                    
                    // Verify the image loads successfully
                    img.addEventListener('load', () => {
                      console.log('RRWeb: Successfully fixed image via proxy:', filename)
                    }, { once: true })
                    
                    img.addEventListener('error', () => {
                      console.warn('RRWeb: Image still failed to load from proxy:', filename)
                      // Remove the fixed attribute and try one more time
                      img.removeAttribute('data-rrweb-fixed')
                    }, { once: true })
                  } else {
                    console.warn('RRWeb: Could not extract filename from URL:', srcUrl)
                  }
                } catch (error) {
                  console.warn('RRWeb: Error fixing image:', error)
                }
              }
              
              // Remove existing error listener if any
              img.removeEventListener('error', handleImageError)
              // Add error listener
              img.addEventListener('error', handleImageError, { once: true })
              
              // Pre-emptively fix images by checking if they're API-served files
              // This avoids waiting for the error event
              const srcUrl = img.src || img.getAttribute('src') || ''
              
              // Check if this looks like a local file that should come from API
              if (srcUrl && (srcUrl.includes('.jpg') || srcUrl.includes('.jpeg') || srcUrl.includes('.png') || srcUrl.includes('.gif') || srcUrl.includes('.webp') || srcUrl.includes('.webm'))) {
                // Extract filename from URL
                let filename = ''
                const urlParts = srcUrl.split('/')
                filename = urlParts[urlParts.length - 1].split('?')[0].split('#')[0]
                
                // Check if this is a backend API URL that needs to be proxied
                const isBackendApiUrl = srcUrl.includes('/api/v1/files/serve/') || srcUrl.includes('localhost:5031')
                // Check if it's already using our Next.js proxy
                const isAlreadyProxy = srcUrl.includes('/api/files/serve/') && !srcUrl.includes('localhost:5031')
                
                // If it's a backend API URL OR looks like a filename that's not from our proxy, fix it
                if (filename && filename.includes('.') && (isBackendApiUrl || (!isAlreadyProxy && !srcUrl.includes('/api/files/serve/')))) {
                  // Use Next.js API route proxy to avoid CORS issues
                  const proxyUrl = `/api/files/serve/${encodeURIComponent(filename)}`
                  
                  // Remove crossOrigin for same-origin requests
                  img.removeAttribute('crossorigin')
                  
                  // Try the proxy URL directly (same origin, no CORS)
                  img.src = proxyUrl
                  img.setAttribute('data-rrweb-fixed', 'true')
                  
                  console.log('RRWeb: Pre-emptively fixing image via proxy:', filename, 'from URL:', srcUrl)
                  
                  // If this also fails, the error handler will catch it
                  img.addEventListener('error', () => {
                    // Remove the fixed attribute so error handler can try again
                    img.removeAttribute('data-rrweb-fixed')
                    handleImageError()
                  }, { once: true })
                  
                  return // Skip the rest of the processing for this image
                }
              }
              
              // For other images from external sources, set crossOrigin if needed
              if (img.src && !img.src.startsWith('data:') && !img.src.startsWith('blob:') && !img.src.includes('/api/files/serve/') && !img.src.includes('/api/v1/files/serve/')) {
                // Only set crossOrigin for external URLs
                if (img.src.startsWith('http://') || img.src.startsWith('https://')) {
                  img.crossOrigin = 'anonymous'
                }
              }
            })
          }
          
          // Function to access iframe document and fix images
          const accessAndFixIframe = () => {
            if (replayerIframe) {
              try {
                // Try to access iframe content (may fail due to CORS)
                const iframeDoc = replayerIframe.contentDocument || replayerIframe.contentWindow?.document
                if (iframeDoc) {
                  fixImagesInDocument(iframeDoc)
                  
                  // Also set up a mutation observer for new images
                  const observer = new MutationObserver(() => {
                    fixImagesInDocument(iframeDoc)
                  })
                  
                  observer.observe(iframeDoc.body || iframeDoc.documentElement, {
                    childList: true,
                    subtree: true
                  })
                  
                  // Store observer for cleanup
                  ;(replayerIframe as any)._rrwebImageObserver = observer
                }
              } catch (e) {
                console.warn('RRWeb: Cannot access iframe document (CORS):', e)
                // If we can't access iframe, try to intercept via postMessage or other methods
              }
            }
          }
          
          // Wait a bit for the replayer to render the DOM
          setTimeout(() => {
            accessAndFixIframe()
          }, 500)
          
          // Also try after a longer delay
          setTimeout(() => {
            accessAndFixIframe()
          }, 2000)
          
        } catch (error) {
          console.warn('RRWeb: Error in fixBrokenImages:', error)
        }
      }

      // Fix images after load event
      replayerRef.current.on('load', () => {
        console.log('RRWeb: Load event')
        fixBrokenImages()
      })
      
      // Also fix images after start
      replayerRef.current.on('start', () => {
        // console.log('RRWeb: Start event')
        fixBrokenImages()
      })

      // Periodically check and fix images during playback
      const imageFixInterval = setInterval(() => {
        if (replayerRef.current) {
          fixBrokenImages()
        }
      }, 2000) // Check every 2 seconds during playback

      // Store interval for cleanup
      ;(replayerRef.current as any)._imageFixInterval = imageFixInterval

      // Set up event listeners
      replayerRef.current.on('finish', () => {
        console.log('RRWeb: Playback finished')
        setIsPlaying(false)
        setCurrentTime(duration)
        // Mark video as ended and prevent any loops
        if (videoElement) {
          videoHasEndedRef.current = true;
          videoElement.pause();
          videoElement.loop = false;
          videoElement.removeAttribute('loop');
          // Ensure video stays at end
          if (videoElement.currentTime < videoElement.duration - 0.5) {
            videoElement.currentTime = videoElement.duration;
          }
        }
      })
      
      // Prevent video restart when replayer plays
      replayerRef.current.on('play', () => {
        setIsPlaying(true)
        // Only start video if it hasn't ended
        if (videoElement && !videoHasEndedRef.current) {
          // Don't restart if video has already ended
          if (videoElement.ended || (videoElement.duration > 0 && videoElement.currentTime >= videoElement.duration - 0.5)) {
            console.log('Video has ended, not restarting');
            return;
          }
          if (videoElement.paused && !videoElement.ended) {
            videoElement.play().catch(err => console.log('Video play error:', err));
          }
        }
      })
      
      replayerRef.current.on('pause', () => {
        setIsPlaying(false)
        if (videoElement && !videoElement.paused) {
          videoElement.pause();
        }
      })

      replayerRef.current.on('resize', (ev: unknown) => {
        const size = ev as { width: number; height: number }
        // console.log('RRWeb: Resize event', size)
        if (containerRef.current) {
          containerRef.current.style.width = `${size.width}px`
          containerRef.current.style.height = `${size.height}px`
        }
      })

      // Calculate duration using eventsCopy
      if (eventsCopy.length > 0) {
        const totalDuration = eventsCopy[eventsCopy.length - 1].timestamp - eventsCopy[0].timestamp
        setDuration(totalDuration)
        // console.log('RRWeb: Duration calculated:', totalDuration)
      }

      // Auto-play the recording
      setTimeout(() => {
        if (replayerRef.current) {
          // console.log('RRWeb: Starting auto-play')
          replayerRef.current.play()
          setIsPlaying(true)
        }
      }, 1000)

      // Add custom mouse click indicators - use the eventsCopy created above
      const addMouseClickIndicators = () => {
        if (!containerRef.current || !eventsCopy || eventsCopy.length === 0) return

        // Use the eventsCopy that was already created above - don't create another copy
        
        // Find all mouse click events from the copy
        const clickEvents = eventsCopy.filter((event: any) => event && event.type === 3) // Mouse click events
        
        const hasXY = (d: unknown): d is { x: number; y: number } =>
          !!d && typeof (d as { x?: unknown }).x === 'number' && typeof (d as { y?: unknown }).y === 'number'

        const firstEventTimestamp = eventsCopy && eventsCopy[0] ? eventsCopy[0].timestamp : 0

        clickEvents.forEach((event: any, index: number) => {
          // Calculate delay as a local variable - never modify the event object
          const delay = (event.timestamp || 0) - firstEventTimestamp
          
          // Use setTimeout with the delay, but wrap in a try-catch for safety
          try {
            setTimeout(() => {
              try {
                if (hasXY(event.data)) {
                  const clickIndicator = document.createElement('div')
                  clickIndicator.className = 'replayer-mouse-click'
                  const d = event.data as { x: number; y: number }
                  clickIndicator.style.left = `${d.x}px`
                  clickIndicator.style.top = `${d.y}px`
                  clickIndicator.style.position = 'absolute'
                  clickIndicator.style.zIndex = '1001'
                  
                  if (containerRef.current) {
                    containerRef.current.appendChild(clickIndicator)
                    
                    // Remove after animation
                    setTimeout(() => {
                      try {
                        clickIndicator.remove()
                      } catch (e) {
                        console.log('Error removing click indicator:', e)
                      }
                    }, 300)
                  }
                }
              } catch (e) {
                console.log('Error in click indicator timeout:', e)
              }
            }, Math.max(0, delay))
          } catch (e) {
            console.log('Error setting timeout for click indicator:', e)
          }
        })
      }

      // Add click indicators after a short delay
      setTimeout(addMouseClickIndicators, 2000)

    } catch (error) {
      console.error('RRWeb: Error initializing replayer:', error)
    }

    return () => {
      if (replayerRef.current) {
        // Clean up image fix interval
        if ((replayerRef.current as any)._imageFixInterval) {
          clearInterval((replayerRef.current as any)._imageFixInterval)
        }
        
        // Clean up mutation observers
        if (containerRef.current) {
          const replayerIframe = containerRef.current.querySelector('iframe') as HTMLIFrameElement
          if (replayerIframe && (replayerIframe as any)._rrwebImageObserver) {
            (replayerIframe as any)._rrwebImageObserver.disconnect()
            delete (replayerIframe as any)._rrwebImageObserver
          }
        }
        
        // console.log('RRWeb: Destroying replayer')
        replayerRef.current.destroy()
        replayerRef.current = null
      }
    }
  }, [events, duration])

  // Video synchronization effect
  useEffect(() => {
    if (!videoElement || !replayerRef.current) return;

    const syncVideo = () => {
      if (replayerRef.current && videoElement) {
        try {
          const currentTime = replayerRef.current.getCurrentTime();
          const videoTime = currentTime / 1000; // Convert ms to seconds
          if (Math.abs(videoElement.currentTime - videoTime) > 0.1) {
            videoElement.currentTime = videoTime;
          }
        } catch (error) {
          console.log('Video sync error:', error);
        }
      }
    };

    // Sync every 100ms
    const syncInterval = setInterval(syncVideo, 100);

    return () => {
      clearInterval(syncInterval);
    };
  }, [videoElement]);

  // DISABLED: Auto-fullscreen effect - Video should show in modal, not fullscreen by default
  // Removed auto-fullscreen to keep video in modal view

  // Listen for fullscreen changes (for manual fullscreen toggle)
  useEffect(() => {
    const handleFullscreenChange = () => {
      const doc = document as Document & {
        webkitFullscreenElement?: Element | null
        mozFullScreenElement?: Element | null
        msFullscreenElement?: Element | null
      }
      const isCurrentlyFullscreen = !!(doc.fullscreenElement || 
                                      doc.webkitFullscreenElement || 
                                      doc.mozFullScreenElement || 
                                      doc.msFullscreenElement);
      setIsFullscreen(isCurrentlyFullscreen);
      
      // DON'T close modal when fullscreen is exited - user should control this
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  const play = () => {
    if (replayerRef.current) {
      replayerRef.current.play()
      setIsPlaying(true)
    }
  }

  const pause = () => {
    if (replayerRef.current) {
      replayerRef.current.pause()
      setIsPlaying(false)
    }
  }

  const stop = () => {
    if (replayerRef.current) {
      replayerRef.current.pause()
      replayerRef.current.play(0)
      setIsPlaying(false)
      setCurrentTime(0)
    }
  }

  const restart = () => {
    if (replayerRef.current) {
      replayerRef.current.play(0)
      setCurrentTime(0)
    }
  }

  const skipBackward = () => {
    if (replayerRef.current) {
      const newTime = Math.max(0, currentTime - 5000) // 5 seconds back
      replayerRef.current.play(newTime)
      setCurrentTime(newTime)
    }
  }

  const skipForward = () => {
    if (replayerRef.current) {
      const newTime = Math.min(duration, currentTime + 5000) // 5 seconds forward
      replayerRef.current.play(newTime)
      setCurrentTime(newTime)
    }
  }

  const setSpeed = (speed: number) => {
    if (replayerRef.current) {
      replayerRef.current.setConfig({ speed: speed })
      setPlaybackSpeed(speed)
    }
  }

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  const formatTime = (ms: number): string => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!replayerRef.current) return

    const rect = e.currentTarget.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const percentage = clickX / rect.width
    const newTime = percentage * duration

    replayerRef.current.play(newTime)
    setCurrentTime(newTime)
  }

  return (
    <Card className={`w-full max-w-[95vw] mx-auto ${isFullscreen ? 'fixed inset-0 z-50 m-0 rounded-none max-w-full' : 'max-w-7xl'}`}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Play className="h-5 w-5" />
            Session Replay - {sessionId}
            {isFullscreen && <span className="ml-2 text-sm text-blue-600">(Fullscreen)</span>}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={toggleFullscreen}
            >
              {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
            </Button>
            {onClose && (
              <Button variant="outline" size="sm" onClick={onClose}>
                Close
              </Button>
            )}
          </div>
        </CardTitle>
        <CardDescription>
          Replay user interactions and mouse movements
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Video + Events Container */}
        <div 
          className="w-full bg-black border rounded-lg overflow-hidden relative"
          style={{ minHeight: isFullscreen ? 'calc(100vh - 250px)' : '70vh', height: isFullscreen ? 'calc(100vh - 250px)' : '70vh', maxHeight: isFullscreen ? 'none' : '800px' }}
        >
          {/* Video Background */}
          {videoSrc && (
            <video
              ref={(video) => {
                if (video) {
                  setVideoElement(video);
                  console.log('Video element set:', videoSrc);
                  
                  // CRITICAL: Explicitly prevent looping - multiple safeguards
                  video.loop = false;
                  video.removeAttribute('loop');
                  videoHasEndedRef.current = false; // Reset ended state
                  lastVideoTimeRef.current = 0;
                  
                  // Initialize video
                  video.load();
                  
                  // Handle when video ends - CRITICAL to prevent loops
                  const handleEnded = () => {
                    console.log('Video ended - preventing loop/restart');
                    videoHasEndedRef.current = true;
                    video.pause();
                    video.loop = false;
                    video.removeAttribute('loop');
                    // Ensure video stays at end
                    if (video.currentTime < video.duration - 0.1) {
                      video.currentTime = video.duration;
                    }
                    lastVideoTimeRef.current = video.duration;
                    
                    // Prevent any play attempts after video ended
                    const preventPlayAfterEnd = () => {
                      if (videoHasEndedRef.current) {
                        console.log('Preventing video restart after it ended');
                        video.pause();
                        video.currentTime = video.duration;
                      }
                    };
                    video.addEventListener('play', preventPlayAfterEnd);
                  };
                  
                  // Track video time to detect loops - CRITICAL
                  const handleTimeUpdate = () => {
                    // Only check if video duration is valid (greater than 0)
                    if (!video.duration || video.duration <= 0) {
                      return; // Video not loaded yet, skip checks
                    }
                    
                    // If video has ended, prevent any updates that might restart it
                    if (videoHasEndedRef.current || video.ended) {
                      if (video.currentTime < video.duration - 0.1) {
                        video.currentTime = video.duration;
                      }
                      if (!video.paused) {
                        video.pause();
                      }
                      return;
                    }
                    
                    // Update last valid time as video plays forward
                    if (video.currentTime > lastVideoTimeRef.current) {
                      lastVideoTimeRef.current = video.currentTime;
                    }
                    
                    // CRITICAL: Detect loop - if video jumps from end to start, stop it
                    // Only check if we have a valid last time and video duration
                    if (lastVideoTimeRef.current > video.duration - 1 && video.currentTime < 1 && video.duration > 5) {
                      console.log('LOOP DETECTED: Video jumped from end to start - STOPPING');
                      videoHasEndedRef.current = true;
                      video.pause();
                      video.currentTime = video.duration;
                      video.loop = false;
                      video.removeAttribute('loop');
                      lastVideoTimeRef.current = video.duration;
                      return;
                    }
                    
                    // If video time goes backward (not a full loop but still wrong), correct it
                    // Only correct if video has been playing for at least 2 seconds
                    if (lastVideoTimeRef.current > 2 && video.currentTime < lastVideoTimeRef.current - 0.5) {
                      console.log('Video time went backward, correcting');
                      video.currentTime = lastVideoTimeRef.current;
                    }
                    
                    // When video reaches end (within 0.05 seconds), mark as ended
                    // Make sure we're actually at the end, not just close
                    if (video.duration > 0 && video.currentTime >= video.duration - 0.05 && !videoHasEndedRef.current) {
                      videoHasEndedRef.current = true;
                      video.loop = false;
                      video.removeAttribute('loop');
                      console.log('Video reached end, marking as ended');
                    }
                  };
                  
                  // Prevent seeking backward (which could cause restarts)
                  const handleSeeked = () => {
                    if (videoHasEndedRef.current) {
                      // If video ended, prevent seeking away from end
                      if (video.currentTime < video.duration - 0.5) {
                        video.currentTime = video.duration;
                        video.pause();
                      }
                      return;
                    }
                    
                    // Prevent backward seeks if video has been playing
                    if (lastVideoTimeRef.current > 2 && video.currentTime < lastVideoTimeRef.current - 1) {
                      console.log('Preventing backward seek');
                      video.currentTime = lastVideoTimeRef.current;
                    }
                  };
                  
                  // Auto-play when video is ready
                  const handleCanPlay = () => {
                    console.log('Video can play, starting playback', {
                      hasEnded: videoHasEndedRef.current,
                      duration: video.duration,
                      readyState: video.readyState
                    });
                    // Only play if video hasn't ended and video is ready
                    if (!videoHasEndedRef.current && video.readyState >= 2) {
                      video.play().catch(err => {
                        console.log('Video play error:', err);
                        // If autoplay failed, try again when user interacts
                      });
                    }
                  };
                  
                  // Also listen for loadeddata to ensure video is ready
                  const handleLoadedData = () => {
                    console.log('Video loaded data, ensuring it can play', {
                      hasEnded: videoHasEndedRef.current,
                      duration: video.duration
                    });
                    // Ensure loop is still false after loading
                    video.loop = false;
                    video.removeAttribute('loop');
                    // Try to play if not ended
                    if (!videoHasEndedRef.current && video.paused && video.readyState >= 2) {
                      video.play().catch(err => console.log('Video play error on loadeddata:', err));
                    }
                  };
                  
                  // Enforce no loop periodically (extra safeguard)
                  const enforceNoLoop = setInterval(() => {
                    if (video.loop) {
                      console.log('Loop was set to true, forcing to false');
                      video.loop = false;
                      video.removeAttribute('loop');
                    }
                    if (videoHasEndedRef.current && !video.paused) {
                      video.pause();
                    }
                  }, 100);
                  
                  video.addEventListener('canplay', handleCanPlay, { once: true });
                  video.addEventListener('loadeddata', handleLoadedData);
                  video.addEventListener('ended', handleEnded);
                  video.addEventListener('timeupdate', handleTimeUpdate);
                  video.addEventListener('seeked', handleSeeked);
                  
                  // Sync video with rrweb playback when replayer is available (but only if not ended)
                  const syncVideo = () => {
                    if (replayerRef.current && video && !videoHasEndedRef.current) {
                      try {
                        const currentTime = replayerRef.current.getCurrentTime();
                        const videoTime = currentTime / 1000; // Convert ms to seconds
                        // Only sync if video hasn't ended and times are close
                        if (!video.ended && Math.abs(video.currentTime - videoTime) > 0.1 && videoTime < video.duration) {
                          video.currentTime = videoTime;
                        }
                      } catch (error) {
                        console.log('Video sync error:', error);
                      }
                    }
                  };
                  
                  // Sync every 100ms (but stop if video ended)
                  const syncInterval = setInterval(() => {
                    if (!videoHasEndedRef.current) {
                      syncVideo();
                    }
                  }, 100);
                  
                  // Cleanup
                  return () => {
                    clearInterval(syncInterval);
                    clearInterval(enforceNoLoop);
                    video.removeEventListener('canplay', handleCanPlay);
                    video.removeEventListener('loadeddata', handleLoadedData);
                    video.removeEventListener('ended', handleEnded);
                    video.removeEventListener('timeupdate', handleTimeUpdate);
                    video.removeEventListener('seeked', handleSeeked);
                  };
                }
              }}
              className="w-full h-full object-contain"
              controls={true}
              muted={false}
              playsInline
              preload="auto"
              autoPlay
              loop={false}
              onPlay={() => setIsVideoPlaying(true)}
              onPause={() => setIsVideoPlaying(false)}
              onEnded={() => setIsVideoPlaying(false)}
            >
              <source src={videoSrc} type={videoType || 'video/mp4'} />
              Your browser does not support the video tag.
            </video>
          )}
          
          {/* RRWeb Events Container (overlay if video, standalone if not) */}
          <div 
            ref={containerRef}
            className={videoSrc ? 'absolute inset-0 pointer-events-none' : 'w-full h-full bg-white'}
            style={videoSrc ? { zIndex: 10 } : {}}
          />
          
          {/* Fallback States */}
          {/* If no video, replayer renders standalone; no fallback needed */}
          {(!events || events.length === 0) && videoSrc && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <div className="text-gray-500 text-lg mb-2">No Recording Data</div>
                <div className="text-gray-400 text-sm">
                  No events were captured during this session
                </div>
              </div>
            </div>
          )}
          {events && events.length > 0 && !replayerRef.current && videoSrc && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <div className="text-gray-500 text-lg mb-2">Loading Recording...</div>
                <div className="text-gray-400 text-sm">
                  Initializing replay player
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="space-y-4">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div
              className="w-full h-2 bg-gray-200 rounded-full cursor-pointer hover:bg-gray-300 transition-colors"
              onClick={handleProgressClick}
            >
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-100"
                style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
              />
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Control Buttons */}
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={restart}>
                <RotateCcw className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="outline" onClick={skipBackward}>
                <SkipBack className="h-4 w-4" />
              </Button>
              <Button size="sm" onClick={isPlaying ? pause : play}>
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
              <Button size="sm" variant="outline" onClick={skipForward}>
                <SkipForward className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="outline" onClick={stop}>
                <Square className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Video Controls (if video is available) */}
            {videoSrc && videoElement && (
              <div className="flex items-center gap-2 border-l pl-4">
                <span className="text-sm text-muted-foreground">Video:</span>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => {
                    if (videoElement.paused) {
                      videoElement.play().catch(err => console.log('Video play error:', err));
                      setIsVideoPlaying(true);
                    } else {
                      videoElement.pause();
                      setIsVideoPlaying(false);
                    }
                  }}
                >
                  {isVideoPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (videoElement.currentTime > 0) {
                      videoElement.currentTime = 0;
                      videoElement.pause();
                      setIsVideoPlaying(false);
                    }
                  }}
                >
                  <Square className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Speed Control */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Speed:</span>
              {[0.5, 1, 1.5, 2].map((speed) => (
                <Button
                  key={speed}
                  size="sm"
                  variant={playbackSpeed === speed ? "default" : "outline"}
                  onClick={() => setSpeed(speed)}
                >
                  {speed}x
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Session Info */}
        <div className="text-sm text-muted-foreground">
          <p>Events: {events.length} | Duration: {formatTime(duration)} | Speed: {playbackSpeed}x</p>
        </div>
      </CardContent>
    </Card>
  )
}
