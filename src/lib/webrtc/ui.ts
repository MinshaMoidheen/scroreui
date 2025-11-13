// UI utility functions for managing video/audio elements

export function addVideoElement(participantId: string, stream: MediaStream) {
  const container = document.getElementById('videos-container')
  if (!container) return

  // Remove existing video element if present
  removeVideoElement(participantId)

  const videoWrapper = document.createElement('div')
  videoWrapper.id = `video-wrapper-${participantId}`
  videoWrapper.className = 'relative w-full h-full'

  const video = document.createElement('video')
  video.id = `video-${participantId}`
  video.srcObject = stream
  video.autoplay = true
  video.playsInline = true
  video.className = 'w-full h-full object-cover rounded-lg'

  const label = document.createElement('div')
  label.className = 'absolute bottom-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-sm'
  label.textContent = `Participant ${participantId}`

  videoWrapper.appendChild(video)
  videoWrapper.appendChild(label)
  container.appendChild(videoWrapper)
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
  const container = document.getElementById('screen-share-container')
  if (!container) return

  // Find the inner div where video should be placed
  const videoContainer = container.querySelector('div.relative') as HTMLElement
  if (!videoContainer) return

  // Clear existing screen share
  videoContainer.innerHTML = ''

  // Remove hidden class to make container visible
  container.classList.remove('hidden')

  const video = document.createElement('video')
  video.id = `screen-${participantId}`
  video.srcObject = stream
  video.autoplay = true
  video.playsInline = true
  video.className = 'w-full h-full object-contain'

  videoContainer.appendChild(video)
}

export function removeScreenShare() {
  const container = document.getElementById('screen-share-container')
  if (container) {
    // Find the inner div and clear it
    const videoContainer = container.querySelector('div.relative') as HTMLElement
    if (videoContainer) {
      videoContainer.innerHTML = ''
    }
    // Hide the container again
    container.classList.add('hidden')
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

