// UI utility functions for managing video/audio elements

// Create a placeholder video element (without stream) - like Google Meet
export function addPlaceholderVideoElement(participantId: string, participantName?: string) {
  const container = document.getElementById('videos-container')
  if (!container) {
    console.warn('[Video] videos-container not found in DOM')
    return
  }

  // Check if element already exists
  const existing = document.getElementById(`video-wrapper-${participantId}`)
  if (existing) {
    console.log(`[Video] Placeholder video element already exists for ${participantId}`)
    return
  }

  // Create Card-like structure to match the local video styling
  const gridItem = document.createElement('div')
  gridItem.id = `video-wrapper-${participantId}`
  gridItem.className = 'bg-gray-800 border border-gray-700 rounded-lg overflow-hidden'

  // Create inner structure matching the Card component
  const cardHeader = document.createElement('div')
  cardHeader.className = 'pb-2 px-4 pt-4'
  const cardTitle = document.createElement('h3')
  cardTitle.className = 'text-sm font-semibold text-white'
  cardTitle.textContent = participantName || `Participant ${participantId.substring(0, 8)}...`
  cardHeader.appendChild(cardTitle)

  const cardContent = document.createElement('div')
  cardContent.className = 'p-0'
  const videoContainer = document.createElement('div')
  videoContainer.className = 'relative w-full aspect-video bg-gray-900 rounded-lg overflow-hidden'

  // Create placeholder content (camera off state)
  const placeholder = document.createElement('div')
  placeholder.className = 'absolute inset-0 flex flex-col items-center justify-center bg-gray-800'
  placeholder.id = `placeholder-${participantId}`
  
  // Create a simple avatar/icon placeholder
  const avatar = document.createElement('div')
  avatar.className = 'w-16 h-16 rounded-full bg-gray-700 flex items-center justify-center text-gray-400 text-2xl font-semibold mb-2'
  avatar.textContent = (participantName || participantId).charAt(0).toUpperCase()
  placeholder.appendChild(avatar)

  // Create video element (hidden until stream is available)
  const video = document.createElement('video')
  video.id = `video-${participantId}`
  video.autoplay = true
  video.playsInline = true
  video.className = 'w-full h-full object-cover hidden'
  video.muted = false

  videoContainer.appendChild(placeholder)
  videoContainer.appendChild(video)
  cardContent.appendChild(videoContainer)
  
  gridItem.appendChild(cardHeader)
  gridItem.appendChild(cardContent)

  container.appendChild(gridItem)
  
  console.log(`[Video] Added placeholder video element for participant ${participantId}`)
}

export function addVideoElement(participantId: string, stream: MediaStream) {
  const container = document.getElementById('videos-container')
  if (!container) {
    console.warn('[Video] videos-container not found in DOM')
    return
  }

  // Check if placeholder already exists
  const existingWrapper = document.getElementById(`video-wrapper-${participantId}`)
  const existingVideo = document.getElementById(`video-${participantId}`) as HTMLVideoElement
  const placeholder = document.getElementById(`placeholder-${participantId}`)

  if (existingVideo) {
    // Update existing video element with stream
    existingVideo.srcObject = stream
    existingVideo.classList.remove('hidden')
    if (placeholder) {
      placeholder.style.display = 'none'
    }
    console.log(`[Video] Updated existing video element for participant ${participantId} with stream`)
    return
  }

  // If no existing element, create new one
  if (existingWrapper) {
    existingWrapper.remove()
  }

  // Create Card-like structure to match the local video styling
  // This will be a grid item (since container has display: contents)
  const gridItem = document.createElement('div')
  gridItem.id = `video-wrapper-${participantId}`
  gridItem.className = 'bg-gray-800 border border-gray-700 rounded-lg overflow-hidden'

  // Create inner structure matching the Card component
  const cardHeader = document.createElement('div')
  cardHeader.className = 'pb-2 px-4 pt-4'
  const cardTitle = document.createElement('h3')
  cardTitle.className = 'text-sm font-semibold text-white'
  cardTitle.textContent = `Participant ${participantId.substring(0, 8)}...`
  cardHeader.appendChild(cardTitle)

  const cardContent = document.createElement('div')
  cardContent.className = 'p-0'
  const videoContainer = document.createElement('div')
  videoContainer.className = 'relative w-full aspect-video bg-gray-900 rounded-lg overflow-hidden'

  const video = document.createElement('video')
  video.id = `video-${participantId}`
  video.srcObject = stream
  video.autoplay = true
  video.playsInline = true
  video.className = 'w-full h-full object-cover'
  video.muted = false // Allow audio from remote participants

  // Add error handler
  video.onerror = (e) => {
    console.error(`[Video] Error loading video for ${participantId}:`, e)
  }

  // Add loadedmetadata handler to ensure video plays
  video.onloadedmetadata = () => {
    console.log(`[Video] Video metadata loaded for ${participantId}`)
    video.play().catch(err => {
      console.error(`[Video] Error playing video for ${participantId}:`, err)
    })
  }

  videoContainer.appendChild(video)
  cardContent.appendChild(videoContainer)
  
  gridItem.appendChild(cardHeader)
  gridItem.appendChild(cardContent)

  container.appendChild(gridItem)
  
  console.log(`[Video] Added video element for participant ${participantId}`)
}

export function removeVideoElement(participantId: string) {
  const videoWrapper = document.getElementById(`video-wrapper-${participantId}`)
  if (videoWrapper) {
    videoWrapper.remove()
  }
}

export function addAudioElement(participantId: string, stream: MediaStream) {
  // Remove existing audio element if present
  removeAudioElement(participantId)

  const audio = document.createElement('audio')
  audio.id = `audio-${participantId}`
  audio.srcObject = stream
  audio.autoplay = true
  audio.playsInline = true
  audio.volume = 1.0

  document.body.appendChild(audio)
}

export function removeAudioElement(participantId: string) {
  const audio = document.getElementById(`audio-${participantId}`) as HTMLAudioElement
  if (audio) {
    audio.pause()
    audio.srcObject = null
    audio.remove()
  }
}

export function addScreenShare(stream: MediaStream, participantId: string) {
  const container = document.getElementById('videos-container')
  if (!container) {
    console.warn('[Screen Share] videos-container not found in DOM')
    return
  }

  // Check if screen share element already exists
  const existingScreenShare = document.getElementById(`screen-wrapper-${participantId}`)
  if (existingScreenShare) {
    // Update existing screen share
    const video = document.getElementById(`screen-${participantId}`) as HTMLVideoElement
    if (video) {
      video.srcObject = stream
      console.log(`[Screen Share] Updated existing screen share for ${participantId}`)
      return
    }
  }

  // Create Card-like structure matching participant video styling
  const gridItem = document.createElement('div')
  gridItem.id = `screen-wrapper-${participantId}`
  gridItem.className = 'bg-gray-800 border border-gray-700 rounded-lg overflow-hidden'

  // Create inner structure matching the Card component
  const cardHeader = document.createElement('div')
  cardHeader.className = 'pb-2 px-4 pt-4'
  const cardTitle = document.createElement('h3')
  cardTitle.className = 'text-sm font-semibold text-white'
  cardTitle.textContent = `Screen Share - ${participantId.substring(0, 8)}...`
  cardHeader.appendChild(cardTitle)

  const cardContent = document.createElement('div')
  cardContent.className = 'p-0'
  const videoContainer = document.createElement('div')
  videoContainer.className = 'relative w-full aspect-video bg-gray-900 rounded-lg overflow-hidden'

  const video = document.createElement('video')
  video.id = `screen-${participantId}`
  video.srcObject = stream
  video.autoplay = true
  video.playsInline = true
  video.className = 'w-full h-full object-contain' // object-contain for screen share to show full screen
  video.muted = false

  // Add error handler
  video.onerror = (e) => {
    console.error(`[Screen Share] Error loading screen share for ${participantId}:`, e)
  }

  // Add loadedmetadata handler to ensure video plays
  video.onloadedmetadata = () => {
    console.log(`[Screen Share] Screen share metadata loaded for ${participantId}`)
    video.play().catch(err => {
      console.error(`[Screen Share] Error playing screen share for ${participantId}:`, err)
    })
  }

  videoContainer.appendChild(video)
  cardContent.appendChild(videoContainer)
  
  gridItem.appendChild(cardHeader)
  gridItem.appendChild(cardContent)

  container.appendChild(gridItem)
  
  console.log(`[Screen Share] Added screen share tab for participant ${participantId}`)
}

export function removeScreenShare(participantId?: string) {
  // If participantId is provided, remove that specific screen share
  if (participantId) {
    const screenShareWrapper = document.getElementById(`screen-wrapper-${participantId}`)
    if (screenShareWrapper) {
      const video = document.getElementById(`screen-${participantId}`) as HTMLVideoElement
      if (video) {
        video.pause()
        video.srcObject = null
      }
      screenShareWrapper.remove()
      console.log(`[Screen Share] Removed screen share for ${participantId}`)
      return
    }
  }

  // Otherwise, remove all screen shares (backward compatibility)
  const container = document.getElementById('videos-container')
  if (container) {
    const screenShares = container.querySelectorAll('[id^="screen-wrapper-"]')
    screenShares.forEach((element) => {
      const videoId = element.id.replace('screen-wrapper-', 'screen-')
      const video = document.getElementById(videoId) as HTMLVideoElement
      if (video) {
        video.pause()
        video.srcObject = null
      }
      element.remove()
    })
    console.log(`[Screen Share] Removed ${screenShares.length} screen share(s)`)
  }
}

export function setLocalStream(stream: MediaStream) {
  const localVideo = document.getElementById('local-video') as HTMLVideoElement
  if (localVideo) {
    localVideo.srcObject = stream
  }
}

export function showHostControls() {
  const hostControls = document.getElementById('host-controls')
  if (hostControls) {
    hostControls.style.display = 'block'
  }
}

