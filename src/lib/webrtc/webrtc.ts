// WebRTC and recording functionality
import { sendWebSocketMessage } from './websocket'
import {
  addVideoElement,
  removeVideoElement,
  setLocalStream,
  addScreenShare,
  removeScreenShare,
  showHostControls,
  addAudioElement,
  removeAudioElement,
} from './ui'
import { STREAMING_SERVER_URL } from '@/constants'

const peerConnectionConfig = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
  sdpSemantics: 'unified-plan' as RTCSdpSemantics,
  bundlePolicy: 'max-bundle' as RTCBundlePolicy,
  rtcpMuxPolicy: 'require' as RTCRtcpMuxPolicy,
}

let myId: string | null = null
let localStream: MediaStream | null = null
let localScreenStream: MediaStream | null = null
let recordingPeerConnection: RTCPeerConnection | null = null
let recordingSessionId: string | null = null
const peerConnections: Record<string, RTCPeerConnection> = {}
let recordingClonedTracks: MediaStreamTrack[] = []

function logAvailableAudioTracks(label: string, stream: MediaStream | null) {
  if (!stream) {
    console.log(`[Recording][${label}] stream missing`)
    return
  }
  const tracks = stream.getAudioTracks()
  console.log(
    `[Recording][${label}] audioTracks=${tracks.length} enabled=${tracks.map(
      (t) => t.enabled
    )} readyState=${tracks.map((t) => t.readyState)} id=${tracks.map(
      (t) => t.id
    )}`
  )
  tracks.forEach((track, index) => {
    console.log(
      `[Recording][${label}] Track ${index}: kind=${track.kind} enabled=${track.enabled} readyState=${track.readyState} muted=${track.muted} label="${track.label}"`
    )
  })
}

export async function initWebRTC() {
  try {
    console.log('[Audio Init] Requesting media with echo cancellation enabled')
    
    let audioConstraints: MediaTrackConstraints = {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    }

    if (navigator.userAgent.includes('Chrome')) {
      audioConstraints = {
        ...audioConstraints,
        googEchoCancellation: true,
        googNoiseSuppression: true,
        googAutoGainControl: true,
        googHighpassFilter: true,
        googTypingNoiseDetection: true,
        googEchoCancellation2: true,
        latency: 0.01,
        sampleRate: 48000,
        channelCount: 1,
      } as any
    } else {
      audioConstraints = {
        ...audioConstraints,
        latency: 0.01,
        sampleRate: 48000,
        channelCount: 1,
      }
    }

    console.log('[Audio Init] Using audio constraints:', audioConstraints)

    localStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: audioConstraints,
    })

    console.log('[Audio Init] Successfully got media stream with echo cancellation')
    setLocalStream(localStream)
    logAvailableAudioTracks('init', localStream)

    const audioTracks = localStream.getAudioTracks()
    audioTracks.forEach((track, index) => {
      const settings = track.getSettings()
      console.log(`[Audio Init] Track ${index} (${track.id}) settings:`)
      console.log(`  - echoCancellation: ${settings.echoCancellation}`)
      console.log(`  - noiseSuppression: ${settings.noiseSuppression}`)
      console.log(`  - autoGainControl: ${settings.autoGainControl}`)
      console.log(`  - sampleRate: ${settings.sampleRate}`)
      console.log(`  - channelCount: ${settings.channelCount}`)
      console.log(`  - label: "${settings.label}"`)

      if (settings.echoCancellation === false) {
        console.warn(
          `[Audio Init] ❌ CRITICAL: Echo cancellation is DISABLED for track ${track.id}!`
        )
      } else if (settings.echoCancellation === true) {
        console.log(
          `[Audio Init] ✅ Echo cancellation is ENABLED for track ${track.id}`
        )
      }
    })

    await new Promise((resolve) => setTimeout(resolve, 100))
    console.log('[Audio Init] Audio initialization complete')
  } catch (error) {
    console.error('Error accessing media devices.', error)
    throw error
  }
}

export async function startRecording(divisionId: string, token?: string, userRole?: string) {
  if (recordingPeerConnection) {
    console.warn('Recording is already in progress.')
    return
  }

  try {
    recordingPeerConnection = new RTCPeerConnection(peerConnectionConfig)
    recordingClonedTracks = []

    const audioTracks = localStream ? localStream.getAudioTracks() : []
    console.log(`[Recording] starting with mic tracks: ${audioTracks.length}`)
    logAvailableAudioTracks('mic-original', localStream)

    if (audioTracks.length === 0) {
      console.warn(
        '[Recording] No microphone audio tracks found! This will result in silent recording.'
      )
    }

    audioTracks.forEach((track) => {
      const clone = track.clone()
      clone.enabled = true
      recordingClonedTracks.push(clone)
      console.log(
        `[Recording] cloned mic track id=${track.id} original.enabled=${track.enabled} clone.enabled=${clone.enabled} readyState=${clone.readyState} muted=${clone.muted}`
      )

      const audioContext = new AudioContext()
      const source = audioContext.createMediaStreamSource(new MediaStream([clone]))
      const analyser = audioContext.createAnalyser()
      source.connect(analyser)
      const dataArray = new Uint8Array(analyser.frequencyBinCount)

      const checkAudio = () => {
        analyser.getByteFrequencyData(dataArray)
        const sum = dataArray.reduce((a, b) => a + b, 0)
        if (sum > 0) {
          console.log(
            `[Recording] Microphone clone is producing audio data! Audio level: ${sum}`
          )
          audioContext.close()
        } else {
          setTimeout(checkAudio, 100)
        }
      }

      setTimeout(checkAudio, 500)
      recordingPeerConnection.addTrack(clone, new MediaStream([clone]))
    })

    if (localScreenStream) {
      logAvailableAudioTracks('screen-original', localScreenStream)
      const streamClone = localScreenStream.clone()
      streamClone.getTracks().forEach((track) => {
        if (track.kind === 'audio') {
          track.enabled = true
        }
        recordingClonedTracks.push(track)
        console.log(
          `[Recording] cloned screen track kind=${track.kind} id=${track.id} readyState=${track.readyState} enabled=${track.enabled}`
        )
        recordingPeerConnection.addTrack(track, streamClone)
      })
    } else {
      const videoTracks = localStream ? localStream.getVideoTracks() : []
      videoTracks.forEach((track) => {
        const clone = track.clone()
        recordingClonedTracks.push(clone)
        console.log(
          `[Recording] cloned video track id=${track.id} readyState=${track.readyState} enabled=${track.enabled}`
        )
        recordingPeerConnection.addTrack(clone, new MediaStream([clone]))
      })
    }

    const clonedAudioStream = new MediaStream(
      recordingClonedTracks.filter((track) => track.kind === 'audio')
    )
    logAvailableAudioTracks('cloned', clonedAudioStream)
    console.log(
      `[Recording] Total audio tracks for recording: ${
        clonedAudioStream.getAudioTracks().length
      }`
    )

    const offer = await recordingPeerConnection.createOffer()
    await recordingPeerConnection.setLocalDescription(offer)

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
      console.log('[WebRTC] Token provided, length:', token.length)
    } else {
      console.warn('[WebRTC] No token provided for recording request')
    }

    console.log('[WebRTC] Making recording request to /api/recording/start')
    console.log('[WebRTC] Headers:', { ...headers, Authorization: token ? `Bearer ${token.substring(0, 20)}...` : 'none' })
    console.log('[WebRTC] User role from localStorage:', userRole)
    
    // Use the Next.js API proxy route instead of calling streaming server directly
    // This allows us to validate the token with the API server first
    const response = await fetch('/api/recording/start', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        sdp: offer.sdp,
        type: offer.type,
        division_id: divisionId,
        user_role: userRole, // Pass user role from localStorage
      }),
    })
    
    console.log('[WebRTC] Recording response status:', response.status, response.statusText)

    if (!response.ok) {
      let errorMessage = `Failed to start recording: ${response.statusText}`
      try {
        const errorData = await response.json()
        console.log('[WebRTC] Error response data:', JSON.stringify(errorData, null, 2))
        if (errorData.detail) {
          if (typeof errorData.detail === 'string') {
            errorMessage = errorData.detail
          } else if (errorData.detail.message) {
            errorMessage = errorData.detail.message
          } else if (errorData.detail.code) {
            errorMessage = `${errorData.detail.code}: ${errorData.detail.message || errorData.detail}`
          }
        } else if (errorData.message) {
          errorMessage = errorData.message
        }
      } catch (e) {
        console.error('[WebRTC] Error parsing error response:', e)
      }
      console.error('[WebRTC] Throwing error:', errorMessage)
      throw new Error(errorMessage)
    }

    const answer = await response.json()
    await recordingPeerConnection.setRemoteDescription(
      new RTCSessionDescription(answer)
    )

    recordingSessionId = answer.session_id
    console.log(
      `[Recording] Recording started successfully with session ID: ${recordingSessionId}`
    )

    return recordingSessionId
  } catch (error) {
    console.error('Error starting recording:', error)
    if (recordingPeerConnection) {
      recordingPeerConnection.close()
      recordingPeerConnection = null
    }
    throw error
  }
}

export function stopRecording() {
  if (recordingPeerConnection && recordingSessionId) {
    fetch('/api/recording/stop', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: recordingSessionId }),
    })
      .then((response) => response.json())
      .then((data) => console.log(data.message))
      .catch((error) => console.error('Error stopping recording:', error))

    recordingClonedTracks.forEach((track) => {
      if (track.readyState === 'live') {
        track.stop()
      }
    })

    recordingPeerConnection.close()
    recordingPeerConnection = null
    recordingSessionId = null
    recordingClonedTracks = []
    console.log('Recording stopped, all tracks cleaned up, and connection closed.')
  } else {
    console.warn('No recording in progress to stop.')
  }
}

export function handleSignalingData(message: any) {
  const { type, sender_id } = message

  switch (type) {
    case 'assign_id':
      myId = message.id
      if (typeof window !== 'undefined') {
        ;(window as any).myUserId = myId
      }
      break

    case 'existing_participants':
      if (
        message.participant_ids.length === 1 &&
        message.participant_ids[0] === myId
      ) {
        showHostControls()
      }
      for (const participantId of message.participant_ids) {
        if (participantId !== myId) {
          createPeerConnection(participantId, true)
        }
      }
      break

    case 'new_participant':
      createPeerConnection(message.participant_id, false)
      break

    case 'participant_left':
      closePeerConnection(message.participant_id)
      break

    case 'offer':
      handleOffer(sender_id, message.offer)
      break

    case 'answer':
      handleAnswer(sender_id, message.answer)
      break

    case 'candidate':
      handleIceCandidate(sender_id, message.candidate)
      break
  }
}

export function toggleMic() {
  if (!localStream) return
  const enabled = localStream.getAudioTracks().some((track) => track.enabled)
  localStream.getAudioTracks().forEach((track) => {
    track.enabled = !enabled
    console.log(
      `[Recording] toggleMic track id=${track.id} enabled=${track.enabled} readyState=${track.readyState}`
    )
  })
}

export async function toggleVideo() {
  if (!localStream) return
  const videoTrack = localStream.getVideoTracks()[0]
  if (videoTrack && videoTrack.readyState === 'live') {
    videoTrack.stop()
  } else {
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: true,
      })
      const newVideoTrack = newStream.getVideoTracks()[0]
      if (videoTrack) {
        localStream.removeTrack(videoTrack)
      }
      localStream.addTrack(newVideoTrack)
      for (const pc of Object.values(peerConnections)) {
        const sender = pc
          .getSenders()
          .find((s) => s.track && s.track.kind === 'video')
        if (sender) {
          await sender.replaceTrack(newVideoTrack)
        }
      }
      setLocalStream(localStream)
    } catch (error) {
      console.error('Error re-acquiring video stream:', error)
    }
  }
}

export async function shareScreen() {
  if (localScreenStream) return

  const audioTrack = localStream
    ? localStream.getAudioTracks().find((track) => track.enabled)
    : null

  try {
    const screenStreamConstraints: DisplayMediaStreamConstraints = {
      video: {
        width: { ideal: window.screen.width },
        height: { ideal: window.screen.height },
        frameRate: { ideal: 30 },
        cursor: 'always',
      } as MediaTrackConstraints,
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      } as MediaTrackConstraints,
    }

    localScreenStream = await navigator.mediaDevices.getDisplayMedia(
      screenStreamConstraints
    )

    if (audioTrack) {
      const micClone = audioTrack.clone()
      localScreenStream.addTrack(micClone)
    }

    logAvailableAudioTracks('shareScreen', localScreenStream)
    console.log(
      `[Screen Share] Captured ${
        localScreenStream.getVideoTracks().length
      } video and ${localScreenStream.getAudioTracks().length} audio tracks`
    )

    addScreenShare(localScreenStream, myId || 'unknown')

    for (const [peerId, pc] of Object.entries(peerConnections)) {
      localScreenStream
        .getTracks()
        .forEach((track) => pc.addTrack(track, localScreenStream!))
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      sendWebSocketMessage({ type: 'offer', target_id: peerId, offer: offer })
    }
  } catch (err) {
    console.error('Error sharing screen:', err)
    if (localScreenStream) {
      localScreenStream.getTracks().forEach((track) => track.stop())
      localScreenStream = null
      removeScreenShare()
    }
  }
}

export async function stopScreenShare() {
  if (!localScreenStream) return

  const screenTracks = localScreenStream.getTracks()
  screenTracks.forEach((track) => track.stop())
  localScreenStream = null
  removeScreenShare()

  for (const [peerId, pc] of Object.entries(peerConnections)) {
    const senders = pc.getSenders()
    senders.forEach((sender) => {
      if (sender.track && screenTracks.includes(sender.track)) {
        pc.removeTrack(sender)
      }
    })
    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)
    sendWebSocketMessage({ type: 'offer', target_id: peerId, offer: offer })
  }
}

async function createPeerConnection(targetId: string, isOfferer: boolean) {
  if (!localStream) return

  const pc = new RTCPeerConnection(peerConnectionConfig)
  ;(pc as any).iceCandidates = []
  peerConnections[targetId] = pc

  console.log(`[WebRTC] Creating peer connection for ${targetId}, I am ${myId}`)

  localStream.getTracks().forEach((track) => {
    console.log(
      `[WebRTC] Adding ${track.kind} track to peer connection for ${targetId}`
    )
    const sender = pc.addTrack(track, localStream!)
    if (sender.getParameters) {
      const params = sender.getParameters()
      if (params.encodings && params.encodings.length > 0) {
        params.encodings[0].priority = 'high'
        params.encodings[0].networkPriority = 'high'
        sender.setParameters(params).catch((err) => {
          console.warn(
            `[WebRTC] Could not set ${track.kind} parameters for ${targetId}:`,
            err
          )
        })
      }
    }
  })

  pc.onicecandidate = (event) => {
    if (event.candidate) {
      sendWebSocketMessage({
        type: 'candidate',
        target_id: targetId,
        candidate: event.candidate,
      })
    }
  }

  pc.ontrack = (event) => {
    if (!event.streams || !event.streams[0]) {
      console.log(`[WebRTC] ontrack: No streams received from ${targetId}`)
      return
    }

    const [stream] = event.streams
    console.log(
      `[WebRTC] ontrack: Received ${
        event.track.kind
      } track from ${targetId}, stream has ${
        stream.getVideoTracks().length
      } video and ${stream.getAudioTracks().length} audio tracks`
    )

    if (event.track.kind === 'video') {
      console.log(`[WebRTC] Processing video track from ${targetId}`)
      if (stream.getAudioTracks().length > 0) {
        console.log(`[WebRTC] Adding combined video+audio stream for ${targetId}`)
        addVideoElement(targetId, stream)
        if (
          targetId !== myId &&
          (!(typeof window !== 'undefined' && (window as any).myUserId) ||
            targetId !== (window as any).myUserId)
        ) {
          const existingAudioElement = document.getElementById(`audio-${targetId}`)
          if (!existingAudioElement) {
            console.log(
              `[WebRTC] Adding audio element for combined stream from ${targetId}`
            )
            addAudioElement(targetId, stream)
          }
        }
      } else {
        console.log(`[WebRTC] Adding screen share for ${targetId}`)
        addScreenShare(stream, targetId)
      }
    } else if (event.track.kind === 'audio') {
      console.log(`[WebRTC] Processing standalone audio track from ${targetId}`)
      if (
        targetId === myId ||
        (typeof window !== 'undefined' &&
          (window as any).myUserId &&
          targetId === (window as any).myUserId)
      ) {
        console.warn(
          `[WebRTC] BLOCKED: Own audio playback prevented for ${targetId}`
        )
        return
      }
      const existingAudioElement = document.getElementById(`audio-${targetId}`)
      const existingVideoElement = document.getElementById(`video-${targetId}`)
      if (!existingAudioElement && !existingVideoElement) {
        console.log(`[WebRTC] Adding standalone audio element for ${targetId}`)
        addAudioElement(targetId, stream)
      }
    }
  }

  if (isOfferer) {
    const offerOptions: RTCOfferOptions = {
      offerToReceiveAudio: true,
      offerToReceiveVideo: true,
      voiceActivityDetection: false,
    }
    const offer = await pc.createOffer(offerOptions)
    await pc.setLocalDescription(offer)
    console.log(`[WebRTC] Created offer for ${targetId}`)
    sendWebSocketMessage({
      type: 'offer',
      target_id: targetId,
      offer: offer,
    })
  }
}

function closePeerConnection(participantId: string) {
  if (peerConnections[participantId]) {
    peerConnections[participantId].close()
    delete peerConnections[participantId]
    removeVideoElement(participantId)
    removeAudioElement(participantId)
  }
}

export function closeAllPeerConnections() {
  for (const participantId in peerConnections) {
    closePeerConnection(participantId)
  }
  if (recordingPeerConnection) {
    recordingPeerConnection.close()
    recordingPeerConnection = null
  }
}

export function getLocalStream() {
  return localStream
}

export function getLocalScreenStream() {
  return localScreenStream
}

export function getMyId() {
  return myId
}

export function stopLocalStream() {
  if (localStream) {
    localStream.getTracks().forEach((track) => track.stop())
    localStream = null
  }
  if (recordingPeerConnection) {
    recordingPeerConnection.close()
    recordingPeerConnection = null
  }
  recordingClonedTracks.forEach((track) => track.stop())
  recordingClonedTracks = []
}

async function handleOffer(senderId: string, offer: RTCSessionDescriptionInit) {
  const pc =
    peerConnections[senderId] || (await createPeerConnection(senderId, false))

  if (pc.signalingState !== 'stable') {
    console.warn('Glare condition detected, ignoring incoming offer.')
    return
  }

  await pc.setRemoteDescription(new RTCSessionDescription(offer))
  const iceCandidates = (pc as any).iceCandidates || []
  for (const candidate of iceCandidates) {
    await pc.addIceCandidate(new RTCIceCandidate(candidate))
  }
  ;(pc as any).iceCandidates = []

  const answerOptions: RTCAnswerOptions = {
    voiceActivityDetection: false,
  }
  const answer = await pc.createAnswer(answerOptions)
  await pc.setLocalDescription(answer)
  console.log(`[WebRTC] Created answer for ${senderId}`)
  sendWebSocketMessage({
    type: 'answer',
    target_id: senderId,
    answer: answer,
  })
}

async function handleAnswer(senderId: string, answer: RTCSessionDescriptionInit) {
  const pc = peerConnections[senderId]
  if (pc && pc.signalingState === 'have-local-offer') {
    await pc.setRemoteDescription(new RTCSessionDescription(answer))
  }
}

async function handleIceCandidate(senderId: string, candidate: RTCIceCandidateInit) {
  const pc = peerConnections[senderId]
  if (pc && pc.remoteDescription) {
    await pc.addIceCandidate(new RTCIceCandidate(candidate))
  } else if (pc) {
    if (!(pc as any).iceCandidates) {
      ;(pc as any).iceCandidates = []
    }
    ;(pc as any).iceCandidates.push(candidate)
  }
}

