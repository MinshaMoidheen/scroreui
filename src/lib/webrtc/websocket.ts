// WebSocket utility for meeting room communication
import { STREAMING_SERVER_URL } from '@/constants'

let ws: WebSocket | null = null
let messageHandlers: ((message: any) => void)[] = []

export function connectWebSocket(roomId: string, onMessage: (message: any) => void, token?: string) {
  const wsUrl = STREAMING_SERVER_URL.replace('http://', 'ws://').replace('https://', 'wss://')
  
  // Get token from parameter or localStorage
  const accessToken = token || (typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null)
  
  // Construct WebSocket URL with token: {serverUrl}/ws/${roomId}?token=${encodeURIComponent(token)}
  let fullWsUrl = `${wsUrl}/ws/${roomId}`
  if (accessToken) {
    fullWsUrl += `?token=${encodeURIComponent(accessToken)}`
  }
  
  ws = new WebSocket(fullWsUrl)

  ws.onopen = () => {
    console.log('[WebSocket] Connected to room:', roomId)
  }

  ws.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data)
      onMessage(message)
      messageHandlers.forEach(handler => handler(message))
    } catch (error) {
      console.error('[WebSocket] Error parsing message:', error)
    }
  }

  ws.onerror = (error) => {
    console.error('[WebSocket] Error:', error)
  }

  ws.onclose = () => {
    console.log('[WebSocket] Connection closed')
    ws = null
  }

  return ws
}

export function sendWebSocketMessage(message: any) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message))
  } else {
    console.warn('[WebSocket] Cannot send message, connection not open')
  }
}

export function disconnectWebSocket() {
  if (ws) {
    ws.close()
    ws = null
  }
  messageHandlers = []
}

export function addMessageHandler(handler: (message: any) => void) {
  messageHandlers.push(handler)
}

export function removeMessageHandler(handler: (message: any) => void) {
  messageHandlers = messageHandlers.filter(h => h !== handler)
}

