'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { 
  Pen, 
  Eraser, 
  Trash2, 
  Type,
  Move,
} from 'lucide-react'

interface CanvasAnnotationProps {
  width?: number
  height?: number
  onSave?: (imageData: string) => void
  className?: string
}

type DrawingTool = 'pen' | 'eraser' | 'text' | 'move' | 'rectangle' | 'circle'
type DrawingMode = 'draw' | 'erase'

interface TextBox {
  id: string
  x: number
  y: number
  width: number
  height: number
  text: string
  fontSize: number
  color: string
}

export function CanvasAnnotation({ 
  width = 800, 
  height = 600, 
 
  className = '' 
}: CanvasAnnotationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentTool, setCurrentTool] = useState<DrawingTool>('pen')
  const [currentMode, setCurrentMode] = useState<DrawingMode>('draw')
  const [brushSize, setBrushSize] = useState(3)
  const [brushColor, setBrushColor] = useState('#000000')
  const [textBoxes, setTextBoxes] = useState<TextBox[]>([])
  const [selectedTextBox, setSelectedTextBox] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [isEditingText, setIsEditingText] = useState(false)
  const [editingText, setEditingText] = useState('')
  const [editingTextBoxId, setEditingTextBoxId] = useState<string | null>(null)
  const [isResizing, setIsResizing] = useState(false)
  const [resizeHandle, setResizeHandle] = useState<'se' | 'sw' | 'ne' | 'nw' | null>(null)
  const textInputRef = useRef<HTMLTextAreaElement>(null)
  // Snapshot of freehand drawing layer so text-box redraws don't erase drawings
  const drawingSnapshotRef = useRef<ImageData | null>(null)

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size
    canvas.width = width
    canvas.height = height

    // Set default styles
    ctx.strokeStyle = brushColor
    ctx.lineWidth = brushSize
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    // Reset snapshot on dimension change
    drawingSnapshotRef.current = null
  }, [width, height])

  // Draw text boxes
  const drawTextBoxes = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    textBoxes.forEach(textBox => {
      // Draw text box background
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
      ctx.fillRect(textBox.x, textBox.y, textBox.width, textBox.height)
      
      // Draw border
      ctx.strokeStyle = selectedTextBox === textBox.id ? '#007bff' : '#ccc'
      ctx.lineWidth = selectedTextBox === textBox.id ? 2 : 1
      ctx.strokeRect(textBox.x, textBox.y, textBox.width, textBox.height)
      
      // Draw resize handles if selected
      if (selectedTextBox === textBox.id) {
        const handleSize = 12
        const right = textBox.x + textBox.width
        const bottom = textBox.y + textBox.height
        
        ctx.fillStyle = '#007bff'
        // Southeast handle
        ctx.fillRect(right - handleSize, bottom - handleSize, handleSize, handleSize)
        // Southwest handle
        ctx.fillRect(textBox.x, bottom - handleSize, handleSize, handleSize)
        // Northeast handle
        ctx.fillRect(right - handleSize, textBox.y, handleSize, handleSize)
        // Northwest handle
        ctx.fillRect(textBox.x, textBox.y, handleSize, handleSize)
      }
      
      // Draw text
      ctx.fillStyle = textBox.color
      ctx.font = `${textBox.fontSize}px Arial`
      ctx.textAlign = 'left'
      ctx.textBaseline = 'top'
      ctx.fillText(textBox.text, textBox.x + 5, textBox.y + 5)
    })
  }, [textBoxes, selectedTextBox])

  // Redraw canvas with text boxes
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Repaint previous drawing, then overlay text boxes
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    if (drawingSnapshotRef.current) {
      ctx.putImageData(drawingSnapshotRef.current, 0, 0)
    }
    drawTextBoxes()
  }, [textBoxes, selectedTextBox, drawTextBoxes])

  // Handle fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      // Force canvas to redraw when fullscreen changes
      const canvas = canvasRef.current
      if (canvas) {
        const ctx = canvas.getContext('2d')
        if (ctx) {
          // Redraw the canvas to ensure it's visible
          canvas.style.display = 'none'
          canvas.offsetHeight // Trigger reflow
          canvas.style.display = 'block'
        }
      }
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange)
    document.addEventListener('mozfullscreenchange', handleFullscreenChange)
    document.addEventListener('MSFullscreenChange', handleFullscreenChange)

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange)
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange)
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange)
    }
  }, [])


  // Clear canvas
  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    drawingSnapshotRef.current = null
    setTextBoxes([])
    setSelectedTextBox(null)
  }, [])

  // Create text box
  const createTextBox = useCallback((x: number, y: number) => {
    const newTextBox: TextBox = {
      id: Date.now().toString(),
      x: x - 100,
      y: y - 20,
      width: 200,
      height: 40,
      text: 'Text',
      fontSize: 16,
      color: brushColor
    }
    setTextBoxes(prev => [...prev, newTextBox])
    setSelectedTextBox(newTextBox.id)
    return newTextBox
  }, [brushColor])

  // Check if point is inside text box
  const isPointInTextBox = useCallback((x: number, y: number, textBox: TextBox) => {
    return x >= textBox.x && x <= textBox.x + textBox.width &&
           y >= textBox.y && y <= textBox.y + textBox.height
  }, [])

  // Check if point is on resize handle
  const isPointOnResizeHandle = useCallback((x: number, y: number, textBox: TextBox) => {
    const handleSize = 12
    const right = textBox.x + textBox.width
    const bottom = textBox.y + textBox.height
    
    // Southeast handle
    if (x >= right - handleSize && x <= right && y >= bottom - handleSize && y <= bottom) {
      return 'se'
    }
    // Southwest handle
    if (x >= textBox.x && x <= textBox.x + handleSize && y >= bottom - handleSize && y <= bottom) {
      return 'sw'
    }
    // Northeast handle
    if (x >= right - handleSize && x <= right && y >= textBox.y && y <= textBox.y + handleSize) {
      return 'ne'
    }
    // Northwest handle
    if (x >= textBox.x && x <= textBox.x + handleSize && y >= textBox.y && y <= textBox.y + handleSize) {
      return 'nw'
    }
    return null
  }, [])

  // Resize text box
  const resizeTextBox = useCallback((id: string, newWidth: number, newHeight: number, handle: string) => {
    setTextBoxes(prev => prev.map(tb => {
      if (tb.id === id) {
        let newX = tb.x
        let newY = tb.y
        const newW = Math.max(50, newWidth) // Minimum width
        const newH = Math.max(30, newHeight) // Minimum height

        // Adjust position based on handle
        if (handle === 'nw' || handle === 'sw') {
          newX = tb.x + tb.width - newW
        }
        if (handle === 'nw' || handle === 'ne') {
          newY = tb.y + tb.height - newH
        }

        return { ...tb, x: newX, y: newY, width: newW, height: newH }
      }
      return tb
    }))
  }, [])

  // Update text box text
  const updateTextBoxText = useCallback((id: string, text: string) => {
    setTextBoxes(prev => prev.map(tb => {
      if (tb.id !== id) return tb
      // Measure text to auto-resize box
      const canvas = canvasRef.current
      let measuredWidth = tb.width
      if (canvas) {
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.font = `${tb.fontSize}px Arial`
          const lines = text.split('\n')
          measuredWidth = Math.max(...lines.map(l => ctx.measureText(l).width)) + 20
          const lineHeight = tb.fontSize + 10
          const measuredHeight = lines.length * lineHeight + 10
          return {
            ...tb,
            text,
            width: Math.min(600, Math.max(100, Math.floor(measuredWidth))),
            height: Math.min(400, Math.max(30, Math.floor(measuredHeight)))
          }
        }
      }
      return { ...tb, text }
    }))
  }, [])



  // Start editing text box
  const startEditingTextBox = useCallback((id: string) => {
    const textBox = textBoxes.find(tb => tb.id === id)
    if (!textBox) return

    setEditingTextBoxId(id)
    setEditingText(textBox.text)
    setIsEditingText(true)
    setSelectedTextBox(id)
  }, [textBoxes])

  // Save text box edit
  const saveTextBoxEdit = useCallback(() => {
    setIsEditingText(false)
    setEditingTextBoxId(null)
    setEditingText('')
  }, [editingTextBoxId, editingText, updateTextBoxText])

  // Cancel text box edit
  const cancelTextBoxEdit = useCallback(() => {
    setIsEditingText(false)
    setEditingTextBoxId(null)
    setEditingText('')
  }, [])

  // Focus text input when editing starts
  useEffect(() => {
    if (isEditingText && textInputRef.current) {
      textInputRef.current.focus()
      textInputRef.current.select()
    }
  }, [isEditingText])

  // Mouse down handler
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    if (currentTool === 'text' || currentTool === 'move') {
      // Check if clicking on existing text box
      const clickedTextBox = textBoxes.find(tb => isPointInTextBox(x, y, tb))
      if (clickedTextBox) {
        // Check if clicking on resize handle
        const handle = isPointOnResizeHandle(x, y, clickedTextBox)
        if (handle) {
          setIsResizing(true)
          setResizeHandle(handle)
          setSelectedTextBox(clickedTextBox.id)
        } else {
          if (currentTool === 'move') {
            // Drag the text box in Move mode
            setSelectedTextBox(clickedTextBox.id)
            setIsDragging(true)
            setDragOffset({ x: x - clickedTextBox.x, y: y - clickedTextBox.y })
          } else {
            // Single click inside text box: enter edit mode in Text mode
            startEditingTextBox(clickedTextBox.id)
          }
        }
      } else {
        // For text tool, do not create on single click; wait for double click
        setSelectedTextBox(null)
      }
    } else {
      // Drawing mode
      setIsDrawing(true)
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      ctx.beginPath()
      ctx.moveTo(x, y)

      if (currentMode === 'erase') {
        ctx.globalCompositeOperation = 'destination-out'
      } else {
        ctx.globalCompositeOperation = 'source-over'
        ctx.strokeStyle = brushColor
        ctx.lineWidth = brushSize
      }
    }
  }, [currentMode, brushColor, brushSize, currentTool, textBoxes, isPointInTextBox, createTextBox])

  // Mouse move handler
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    if (isResizing && selectedTextBox && resizeHandle) {
      // Resize text box
      const textBox = textBoxes.find(tb => tb.id === selectedTextBox)
      if (textBox) {
        let newWidth = textBox.width
        let newHeight = textBox.height

        if (resizeHandle === 'se') {
          newWidth = x - textBox.x
          newHeight = y - textBox.y
        } else if (resizeHandle === 'sw') {
          newWidth = textBox.x + textBox.width - x
          newHeight = y - textBox.y
        } else if (resizeHandle === 'ne') {
          newWidth = x - textBox.x
          newHeight = textBox.y + textBox.height - y
        } else if (resizeHandle === 'nw') {
          newWidth = textBox.x + textBox.width - x
          newHeight = textBox.y + textBox.height - y
        }

        resizeTextBox(selectedTextBox, newWidth, newHeight, resizeHandle)
      }
    } else if (isDragging && selectedTextBox) {
      // Drag text box
      setTextBoxes(prev => prev.map(tb => 
        tb.id === selectedTextBox 
          ? { ...tb, x: x - dragOffset.x, y: y - dragOffset.y }
          : tb
      ))
    } else if (isDrawing) {
      // Drawing mode
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      ctx.lineTo(x, y)
      ctx.stroke()
    } else if (currentTool === 'text' || currentTool === 'move') {
      // Update cursor when hovering over handles or text boxes
      const hovered = textBoxes.find(tb => isPointInTextBox(x, y, tb))
      if (hovered) {
        const handle = isPointOnResizeHandle(x, y, hovered)
        if (handle === 'se' || handle === 'nw') {
          canvas.style.cursor = 'nwse-resize'
        } else if (handle === 'sw' || handle === 'ne') {
          canvas.style.cursor = 'nesw-resize'
        } else {
          canvas.style.cursor = 'move'
        }
      } else {
        canvas.style.cursor = currentTool === 'move' ? 'move' : 'text'
      }
    }
  }, [isDrawing, isDragging, isResizing, selectedTextBox, dragOffset, resizeHandle, textBoxes, resizeTextBox, currentTool, isPointInTextBox, isPointOnResizeHandle])

  // Mouse up handler
  const handleMouseUp = useCallback(() => {
    if (isDrawing) {
      setIsDrawing(false)
      // Capture snapshot of the drawing layer after stroke completes
      const canvas = canvasRef.current
      if (canvas) {
        const ctx = canvas.getContext('2d')
        if (ctx) {
          try {
            drawingSnapshotRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height)
          } catch {}
        }
      }
    }
    if (isDragging) {
      setIsDragging(false)
    }
    if (isResizing) {
      setIsResizing(false)
      setResizeHandle(null)
    }
  }, [isDrawing, isDragging, isResizing])

  // Double click handler for text editing
  const handleDoubleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const clickedTextBox = textBoxes.find(tb => isPointInTextBox(x, y, tb))
    if (clickedTextBox) {
      // Only start editing if not clicking on resize handle
      const handle = isPointOnResizeHandle(x, y, clickedTextBox)
      if (!handle) {
        startEditingTextBox(clickedTextBox.id)
      }
        } else if (currentTool === 'text') {
      // Create a new text box on double click when using text tool
      const newTextBox = createTextBox(x, y)
      setTimeout(() => startEditingTextBox(newTextBox.id), 50)
    }
  }, [textBoxes, isPointInTextBox, isPointOnResizeHandle, startEditingTextBox, currentTool, createTextBox])

  // Touch handlers for mobile
  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    const touch = e.touches[0]
    const mouseEvent = new MouseEvent('mousedown', {
      clientX: touch.clientX,
      clientY: touch.clientY
    })
    handleMouseDown(mouseEvent as any)
  }, [handleMouseDown])

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    const touch = e.touches[0]
    const mouseEvent = new MouseEvent('mousemove', {
      clientX: touch.clientX,
      clientY: touch.clientY
    })
    handleMouseMove(mouseEvent as any)
  }, [handleMouseMove])

  const handleTouchEnd = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    handleMouseUp()
  }, [handleMouseUp])

  return (
    <div className={`canvas-annotation ${className}`} style={{ position: 'relative', zIndex: 1000 }}>
      {/* Fixed Right Center Toolbar - Block Display */}
      <div className="fixed top-1/2 right-4 transform -translate-y-1/2 w-20 bg-white border-2 border-blue-500 z-[99999] flex flex-col shadow-2xl rounded-lg p-2">
        <div className="space-y-2">
          {/* Drawing Tools - Block Display */}
          <Button
            variant={currentTool === 'pen' ? 'default' : 'outline'}
            size="sm"
            className="w-full h-12 flex flex-col items-center justify-center p-1"
            onClick={() => {
              setCurrentTool('pen')
              setCurrentMode('draw')
            }}
          >
            <Pen className="h-5 w-5" />
            <span className="text-xs mt-1">Draw</span>
          </Button>
          
          <Button
            variant={currentTool === 'eraser' ? 'default' : 'outline'}
            size="sm"
            className="w-full h-12 flex flex-col items-center justify-center p-1"
            onClick={() => {
              setCurrentTool('eraser')
              setCurrentMode('erase')
            }}
          >
            <Eraser className="h-5 w-5" />
            <span className="text-xs mt-1">Erase</span>
          </Button>
          
        <Button
          variant={currentTool === 'move' ? 'default' : 'outline'}
          size="sm"
          className="w-full h-12 flex flex-col items-center justify-center p-1"
          onClick={() => setCurrentTool('move')}
        >
          <Move className="h-5 w-5" />
          <span className="text-xs mt-1">Move</span>
        </Button>

          <Button
            variant={currentTool === 'text' ? 'default' : 'outline'}
            size="sm"
            className="w-full h-12 flex flex-col items-center justify-center p-1"
            onClick={() => setCurrentTool('text')}
          >
            <Type className="h-5 w-5" />
            <span className="text-xs mt-1">Text</span>
          </Button>
          
          {/* <Button
            variant={currentTool === 'rectangle' ? 'default' : 'outline'}
            size="sm"
            className="w-full h-12 flex flex-col items-center justify-center p-1"
            onClick={() => setCurrentTool('rectangle')}
          >
            <Square className="h-5 w-5" />
            <span className="text-xs mt-1">Rect</span>
          </Button>
          
          <Button
            variant={currentTool === 'circle' ? 'default' : 'outline'}
            size="sm"
            className="w-full h-12 flex flex-col items-center justify-center p-1"
            onClick={() => setCurrentTool('circle')}
          >
            <Circle className="h-5 w-5" />
            <span className="text-xs mt-1">Circle</span>
          </Button> */}
          
          {/* Brush Size */}
          <div className="flex flex-col items-center gap-1 py-2">
            <input
              type="range"
              min="1"
              max="20"
              value={brushSize}
              onChange={(e) => setBrushSize(Number(e.target.value))}
              className="w-full"
            />
            <span className="text-xs text-muted-foreground">{brushSize}px</span>
          </div>
          
          {/* Brush Color */}
          <div className="flex flex-col items-center gap-1 py-2">
            <input
              type="color"
              value={brushColor}
              onChange={(e) => setBrushColor(e.target.value)}
              className="w-8 h-8 rounded border"
            />
            <span className="text-xs text-muted-foreground">Color</span>
          </div>
          
          {/* Action Buttons - Block Display */}
          <Button
            variant="outline"
            size="sm"
            onClick={clearCanvas}
            className="w-full h-12 flex flex-col items-center justify-center p-1"
          >
            <Trash2 className="h-5 w-5" />
            <span className="text-xs mt-1">Clear</span>
          </Button>
          
          {/* {selectedTextBox && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => startEditingTextBox(selectedTextBox)}
              className="w-full h-12 flex flex-col items-center justify-center p-1"
            >
              <Type className="h-5 w-5" />
              <span className="text-xs mt-1">Edit</span>
            </Button>
          )}
          
          {selectedTextBox && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => deleteTextBox(selectedTextBox)}
              className="w-full h-12 flex flex-col items-center justify-center p-1"
            >
              <Trash2 className="h-5 w-5" />
              <span className="text-xs mt-1">Delete</span>
            </Button>
          )} */}
        </div>
      </div>

      {/* Canvas */}
      <div className="absolute inset-0 pointer-events-auto">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className={`block w-full h-full ${
            isResizing ? 'cursor-nw-resize' : 
            isDragging ? 'cursor-move' : 
            'cursor-crosshair'
          }`}
          style={{ 
            display: 'block', 
            maxWidth: '100%',
            background: 'transparent',
            position: 'absolute',
            top: 0,
            left: 0,
            zIndex: 1000,
            pointerEvents: 'auto'
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onDoubleClick={handleDoubleClick}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        />
        
        {/* Inline Text Input */}
        {isEditingText && editingTextBoxId && (
          <textarea
            ref={textInputRef}
            value={editingText}
            onChange={(e) => {
              setEditingText(e.target.value)
              if (editingTextBoxId) {
                updateTextBoxText(editingTextBoxId, e.target.value)
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                // Allow newline with Shift+Enter, otherwise save
                if (!e.shiftKey) {
                  e.preventDefault()
                  saveTextBoxEdit()
                }
              } else if (e.key === 'Escape') {
                cancelTextBoxEdit()
              }
            }}
            onBlur={saveTextBoxEdit}
            className="absolute border-2 border-blue-500 bg-white px-2 py-1 text-sm rounded resize-none"
            style={{
              left: textBoxes.find(tb => tb.id === editingTextBoxId)?.x || 0,
              top: textBoxes.find(tb => tb.id === editingTextBoxId)?.y || 0,
              width: textBoxes.find(tb => tb.id === editingTextBoxId)?.width || 100,
              height: textBoxes.find(tb => tb.id === editingTextBoxId)?.height || 30,
              zIndex: 1001,
              fontSize: textBoxes.find(tb => tb.id === editingTextBoxId)?.fontSize || 16,
              color: textBoxes.find(tb => tb.id === editingTextBoxId)?.color || '#000000'
            }}
          />
        )}
      </div>

    </div>
  )
}
