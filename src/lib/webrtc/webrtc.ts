// WebRTC and recording functionality
import { sendWebSocketMessage } from "./websocket";
import {
  addVideoElement,
  addPlaceholderVideoElement,
  removeVideoElement,
  setLocalStream,
  addScreenShare,
  removeScreenShare,
  showHostControls,
  addAudioElement,
  removeAudioElement,
  updateVideoElementTitle,
} from "./ui";
import { STREAMING_SERVER_URL } from "@/constants";

const peerConnectionConfig = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  sdpSemantics: "unified-plan" as RTCSdpSemantics,
  bundlePolicy: "max-bundle" as RTCBundlePolicy,
  rtcpMuxPolicy: "require" as RTCRtcpMuxPolicy,
};

let myId: string | null = null;
let localStream: MediaStream | null = null;
let localScreenStream: MediaStream | null = null;
let recordingScreenStream: MediaStream | null = null; // Screen stream specifically for recording
let recordingPeerConnection: RTCPeerConnection | null = null;
let recordingSessionId: string | null = null;
const peerConnections: Record<string, RTCPeerConnection> = {};
let recordingClonedTracks: MediaStreamTrack[] = [];
let recordingMicSender: RTCRtpSender | null = null; // Track sender for microphone in recording
let dummyAudioTrack: MediaStreamTrack | null = null; // Helper to reuse silence track
let dummyAudioContext: AudioContext | null = null;

// Helper to create a silent audio track
function createSilentAudioTrack(): MediaStreamTrack {
  dummyAudioContext = new AudioContext();
  const ctx = dummyAudioContext;
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  gain.gain.value = 0; // Mute
  const dst = ctx.createMediaStreamDestination();
  oscillator.connect(gain);
  gain.connect(dst);
  oscillator.start();
  const track = dst.stream.getAudioTracks()[0];
  return track;
}

const participantUsernames: Record<string, string> = {}; // Map participantId -> username

// Negotiation lock to prevent concurrent offer creation
const negotiationInProgress: Record<string, boolean> = {};

// Connection state tracking
const connectionStates: Record<
  string,
  {
    state: RTCPeerConnectionState;
    iceConnectionState: RTCIceConnectionState;
    iceGatheringState: RTCIceGatheringState;
    signalingState: RTCSignalingState;
    lastError?: string;
    connectedAt?: Date;
  }
> = {};

// Helper functions to check track states
export function hasActiveAudioTrack(): boolean {
  if (!localStream) return false;
  const audioTracks = localStream.getAudioTracks();
  return audioTracks.some(
    (track) => track.readyState === "live" && track.enabled && !track.muted
  );
}

export function hasActiveVideoTrack(): boolean {
  if (!localStream) return false;
  const videoTracks = localStream.getVideoTracks();
  return videoTracks.some(
    (track) => track.readyState === "live" && track.enabled && !track.muted
  );
}

// Callback function to notify UI of track state changes
let onTrackStateChange: (() => void) | null = null;

export function setTrackStateChangeCallback(callback: () => void) {
  onTrackStateChange = callback;
}

// Clean up ended tracks (exported for periodic checks)
export async function cleanupInactiveTracks() {
  if (!localStream) return;

  const allTracks = [
    ...localStream.getAudioTracks(),
    ...localStream.getVideoTracks(),
  ];
  let cleanedUp = false;

  for (const track of allTracks) {
    // Only clean up tracks that are ended (browser disabled them)
    // Don't clean up tracks that are just muted or disabled by user - those are intentional
    if (track.readyState === "ended") {
      console.log(
        `[Track] Cleaning up ended track: ${track.kind} id=${track.id}`
      );
      cleanedUp = true;

      // Stop transmission to peers
      for (const pc of Object.values(peerConnections)) {
        const sender = pc
          .getSenders()
          .find((s) => s.track && s.track.id === track.id);
        if (sender) {
          await sender.replaceTrack(null);
        }
      }

      // Remove track from stream
      localStream.removeTrack(track);
      // Track is already ended, no need to stop it
    }
  }

  // Notify UI of state change if we cleaned up any tracks
  if (cleanedUp && onTrackStateChange) {
    onTrackStateChange();
  }
}

// Setup event listeners for tracks to detect browser-level changes
function setupTrackEventListeners(stream: MediaStream) {
  const handleTrackEnded = async (track: MediaStreamTrack) => {
    console.log(`[Track] Track ended by browser: ${track.kind} id=${track.id}`);
    await cleanupInactiveTracks();
  };

  const handleTrackMute = async (track: MediaStreamTrack) => {
    console.log(`[Track] Track muted by browser: ${track.kind} id=${track.id}`);
    await cleanupInactiveTracks();
  };

  // Add listeners to all existing tracks
  stream.getTracks().forEach((track) => {
    track.addEventListener("ended", () => handleTrackEnded(track));
    track.addEventListener("mute", () => handleTrackMute(track));
  });

  // Listen for new tracks added to the stream
  stream.addEventListener("addtrack", (event) => {
    const track = event.track;
    console.log(`[Track] New track added: ${track.kind} id=${track.id}`);
    track.addEventListener("ended", () => handleTrackEnded(track));
    track.addEventListener("mute", () => handleTrackMute(track));
  });
}

function logAvailableAudioTracks(label: string, stream: MediaStream | null) {
  if (!stream) {
    console.log(`[Recording][${label}] stream missing`);
    return;
  }
  const tracks = stream.getAudioTracks();
  console.log(
    `[Recording][${label}] audioTracks=${tracks.length} enabled=${tracks.map(
      (t) => t.enabled
    )} readyState=${tracks.map((t) => t.readyState)} id=${tracks.map(
      (t) => t.id
    )}`
  );
  tracks.forEach((track, index) => {
    console.log(
      `[Recording][${label}] Track ${index}: kind=${track.kind} enabled=${track.enabled} readyState=${track.readyState} muted=${track.muted} label="${track.label}"`
    );
  });
}

export async function initWebRTC() {
  try {
    console.log(
      "[Media Init] Initializing WebRTC with empty media stream (camera/mic disabled by default)"
    );

    // Create an empty MediaStream - hardware will only be acquired when user toggles mic/video on
    localStream = new MediaStream();

    setLocalStream(localStream);

    // Add event listeners to detect browser-level changes when tracks are added later
    setupTrackEventListeners(localStream);

    // Add local tracks to any existing peer connections that were created without localStream
    addLocalTracksToExistingConnections();

    console.log(
      "[Media Init] WebRTC initialized successfully. Camera and microphone are disabled by default."
    );
  } catch (error) {
    console.error("Error initializing WebRTC.", error);
    throw error;
  }
}

export async function startRecording(
  divisionId: string,
  token?: string,
  userRole?: string
) {
  if (recordingPeerConnection) {
    console.warn("Recording is already in progress.");
    return;
  }

  try {
    recordingPeerConnection = new RTCPeerConnection(peerConnectionConfig);
    recordingClonedTracks = [];

    // Always capture screen for recording, even if screen sharing is not active in the meeting
    console.log("[Recording] Requesting screen capture for recording...");
    try {
      const screenStreamConstraints: MediaStreamConstraints = {
        video: {
          width: { ideal: window.screen.width * window.devicePixelRatio },
          height: { ideal: window.screen.height * window.devicePixelRatio },
          frameRate: { ideal: 60 },
          cursor: "always",
        } as MediaTrackConstraints,
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } as MediaTrackConstraints,
      };

      recordingScreenStream = await navigator.mediaDevices.getDisplayMedia(
        screenStreamConstraints
      );

      const videoTracks = recordingScreenStream.getVideoTracks();
      const audioTracks = recordingScreenStream.getAudioTracks();

      console.log(
        `[Recording] Captured screen stream with ${videoTracks.length} video and ${audioTracks.length} audio tracks`
      );

      // Verify we have a video track
      if (videoTracks.length === 0) {
        throw new Error("No video track found in screen capture stream");
      }

      const videoTrack = videoTracks[0];
      console.log(
        `[Recording] Video track details: id=${videoTrack.id}, enabled=${videoTrack.enabled}, readyState=${videoTrack.readyState}, label=${videoTrack.label}`
      );

      // Ensure video track is enabled
      if (!videoTrack.enabled) {
        videoTrack.enabled = true;
        console.log("[Recording] Enabled video track");
      }

      // Handle screen share ending (user might stop sharing)
      videoTrack.addEventListener("ended", () => {
        console.warn("[Recording] Screen share ended during recording!");
        // Note: We don't stop recording here, but the video track will be ended
      });
    } catch (screenError) {
      console.error(
        "[Recording] Failed to capture screen for recording:",
        screenError
      );
      throw new Error(
        "Screen capture is required for recording. Please allow screen sharing when prompted."
      );
    }

    // Get audio tracks from microphone
    const audioTracks = localStream ? localStream.getAudioTracks() : [];
    console.log(`[Recording] starting with mic tracks: ${audioTracks.length}`);
    logAvailableAudioTracks("mic-original", localStream);

    // Reset recording state
    recordingMicSender = null;
    dummyAudioTrack = createSilentAudioTrack();
    
    let trackToAdd: MediaStreamTrack;

    if (audioTracks.length === 0) {
      console.warn(
        "[Recording] No microphone audio tracks found! Using silent dummy track."
      );
      trackToAdd = dummyAudioTrack;
    } else {
      // Use the first audio track as the primary microphone track
      const track = audioTracks[0];
      const clone = track.clone();
      clone.enabled = true;
      recordingClonedTracks.push(clone);
      trackToAdd = clone;

      console.log(
        `[Recording] cloned mic track id=${track.id} original.enabled=${track.enabled} clone.enabled=${clone.enabled} readyState=${clone.readyState} muted=${clone.muted}`
      );

      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(
        new MediaStream([clone])
      );
      const analyser = audioContext.createAnalyser();
      source.connect(analyser);
      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const checkAudio = () => {
        analyser.getByteFrequencyData(dataArray);
        const sum = dataArray.reduce((a, b) => a + b, 0);
        if (sum > 0) {
          console.log(
            `[Recording] Microphone clone is producing audio data! Audio level: ${sum}`
          );
          audioContext.close();
        } else {
          setTimeout(checkAudio, 100);
        }
      };

      setTimeout(checkAudio, 500);
    }

    // Add the selected track (mic clone or dummy) to the peer connection
    if (recordingPeerConnection) {
      // Create a stream for the track
      const stream = new MediaStream([trackToAdd]);
      recordingMicSender = recordingPeerConnection.addTrack(trackToAdd, stream);
      console.log(
        `[Recording] Added audio track (id=${trackToAdd.id}, kind=${trackToAdd.kind}) to recording peer connection. Sender created.`
      );
    }

    // Add screen video track and any screen audio tracks to recording
    if (recordingScreenStream && recordingPeerConnection) {
      logAvailableAudioTracks("screen-original", recordingScreenStream);

      // Get all tracks from the screen stream
      const videoTracks = recordingScreenStream.getVideoTracks();
      const audioTracks = recordingScreenStream.getAudioTracks();

      console.log(
        `[Recording] Processing screen stream: ${videoTracks.length} video track(s), ${audioTracks.length} audio track(s)`
      );

      // Process video tracks
      videoTracks.forEach((track) => {
        // Clone the video track
        const clonedTrack = track.clone();
        clonedTrack.enabled = true; // Ensure video track is enabled

        console.log(
          `[Recording] Cloned video track: id=${clonedTrack.id}, enabled=${clonedTrack.enabled}, readyState=${clonedTrack.readyState}, label=${clonedTrack.label}`
        );

        recordingClonedTracks.push(clonedTrack);

        // Create a MediaStream with just this video track for the peer connection
        const videoStream = new MediaStream([clonedTrack]);
        if (recordingPeerConnection) {
          recordingPeerConnection.addTrack(clonedTrack, videoStream);
          console.log(
            `[Recording] Added video track to recording peer connection`
          );
        }
      });

      // Process audio tracks from screen share (system audio)
      audioTracks.forEach((track) => {
        const clonedTrack = track.clone();
        clonedTrack.enabled = true;

        console.log(
          `[Recording] Cloned screen audio track: id=${clonedTrack.id}, enabled=${clonedTrack.enabled}, readyState=${clonedTrack.readyState}`
        );

        recordingClonedTracks.push(clonedTrack);

        // Create a MediaStream with just this audio track for the peer connection
        const audioStream = new MediaStream([clonedTrack]);
        if (recordingPeerConnection) {
          recordingPeerConnection.addTrack(clonedTrack, audioStream);
          console.log(
            `[Recording] Added screen audio track to recording peer connection`
          );
        }
      });

      console.log(
        `[Recording] Summary: Added ${videoTracks.length} video track(s) and ${audioTracks.length} screen audio track(s) to recording`
      );
    }

    const clonedAudioStream = new MediaStream(
      recordingClonedTracks.filter((track) => track.kind === "audio")
    );
    logAvailableAudioTracks("cloned", clonedAudioStream);
    console.log(
      `[Recording] Total audio tracks for recording: ${
        clonedAudioStream.getAudioTracks().length
      }`
    );

    // Verify we have video tracks before creating offer
    const videoTracksInConnection = recordingClonedTracks.filter(
      (t) => t.kind === "video"
    );
    const audioTracksInConnection = recordingClonedTracks.filter(
      (t) => t.kind === "audio"
    );

    console.log(
      `[Recording] Before creating offer: ${videoTracksInConnection.length} video track(s), ${audioTracksInConnection.length} audio track(s) ready`
    );

    if (videoTracksInConnection.length === 0) {
      throw new Error(
        "No video tracks available for recording. Screen capture may have failed."
      );
    }

    // Create offer with proper options
    const offerOptions: RTCOfferOptions = {
      offerToReceiveAudio: false,
      offerToReceiveVideo: false,
    };

    const offer = await recordingPeerConnection.createOffer(offerOptions);

    // Log offer details to verify video is included
    console.log(
      `[Recording] Created offer, SDP length: ${offer.sdp?.length || 0}`
    );
    if (offer.sdp) {
      const hasVideo = offer.sdp.includes("m=video");
      const hasAudio = offer.sdp.includes("m=audio");
      console.log(
        `[Recording] Offer contains video: ${hasVideo}, audio: ${hasAudio}`
      );
    }

    await recordingPeerConnection.setLocalDescription(offer);

    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
      console.log("[WebRTC] Token provided, length:", token.length);
    } else {
      console.warn("[WebRTC] No token provided for recording request");
    }

    console.log("[WebRTC] Making recording request to /api/recording/start");
    console.log("[WebRTC] Headers:", {
      ...headers,
      Authorization: token ? `Bearer ${token.substring(0, 20)}...` : "none",
    });
    console.log("[WebRTC] User role from localStorage:", userRole);

    // Use the Next.js API proxy route instead of calling streaming server directly
    // This allows us to validate the token with the API server first
    const response = await fetch("/api/recording/start", {
      method: "POST",
      headers,
      body: JSON.stringify({
        sdp: offer.sdp,
        type: offer.type,
        division_id: divisionId,
        user_role: userRole, // Pass user role from localStorage
      }),
    });

    console.log(
      "[WebRTC] Recording response status:",
      response.status,
      response.statusText
    );

    if (!response.ok) {
      let errorMessage = `Failed to start recording: ${response.statusText}`;
      try {
        const errorData = await response.json();
        console.log(
          "[WebRTC] Error response data:",
          JSON.stringify(errorData, null, 2)
        );
        if (errorData.detail) {
          if (typeof errorData.detail === "string") {
            errorMessage = errorData.detail;
          } else if (errorData.detail.message) {
            errorMessage = errorData.detail.message;
          } else if (errorData.detail.code) {
            errorMessage = `${errorData.detail.code}: ${
              errorData.detail.message || errorData.detail
            }`;
          }
        } else if (errorData.message) {
          errorMessage = errorData.message;
        }
      } catch (e) {
        console.error("[WebRTC] Error parsing error response:", e);
      }
      console.error("[WebRTC] Throwing error:", errorMessage);
      throw new Error(errorMessage);
    }

    const answer = await response.json();
    await recordingPeerConnection.setRemoteDescription(
      new RTCSessionDescription(answer)
    );

    recordingSessionId = answer.session_id;
    console.log(
      `[Recording] Recording started successfully with session ID: ${recordingSessionId}`
    );

    return recordingSessionId;
  } catch (error) {
    console.error("Error starting recording:", error);
    // Clean up recording screen stream if it was created
    if (recordingScreenStream) {
      recordingScreenStream.getTracks().forEach((track) => track.stop());
      recordingScreenStream = null;
    }
    // Clean up cloned tracks
    recordingClonedTracks.forEach((track) => {
      if (track.readyState === "live") {
        track.stop();
      }
    });
    recordingClonedTracks = [];
    if (recordingPeerConnection) {
      recordingPeerConnection.close();
      recordingPeerConnection = null;
    }
    throw error;
  }
}

export function stopRecording() {
  if (recordingPeerConnection && recordingSessionId) {
    fetch("/api/recording/stop", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: recordingSessionId }),
    })
      .then((response) => response.json())
      .then((data) => console.log(data.message))
      .catch((error) => console.error("Error stopping recording:", error));

    // Stop all cloned tracks
    recordingClonedTracks.forEach((track) => {
      if (track.readyState === "live") {
        track.stop();
      }
    });
    recordingClonedTracks = [];

    // Stop and clean up recording screen stream
    if (recordingScreenStream) {
      recordingScreenStream.getTracks().forEach((track) => {
        track.stop();
      });
      recordingScreenStream = null;
      console.log("[Recording] Stopped and cleaned up recording screen stream");
    }

    recordingPeerConnection.close();
    recordingPeerConnection = null;
    recordingSessionId = null;
    
    // Cleanup recording specific globals
    recordingMicSender = null;
    if (dummyAudioTrack) {
      dummyAudioTrack.stop();
      dummyAudioTrack = null;
    }
    if (dummyAudioContext) {
      dummyAudioContext.close();
      dummyAudioContext = null;
    }

    console.log(
      "Recording stopped, all tracks cleaned up, and connection closed."
    );
  } else {
    console.warn("No recording in progress to stop.");
  }
}

export async function handleSignalingData(message: any) {
  const { type, sender_id } = message;

  switch (type) {
    case "assign_id":
      myId = message.id;
      if (typeof window !== "undefined") {
        (window as any).myUserId = myId;
      }
      // Store current user's username
      if (message.username && myId) {
        participantUsernames[myId] = message.username;
        // Update existing element title if it exists (unlikely but possible)
        const displayName = getDisplayName(myId);
        updateVideoElementTitle(myId, displayName);
      }
      break;

    case "existing_participants":
      console.log(
        `[WebRTC] Received existing_participants: ${message.participant_ids.length} participants`
      );
      if (
        message.participant_ids.length === 1 &&
        message.participant_ids[0] === myId
      ) {
        showHostControls();
      }

      // Ensure localStream is ready before creating peer connections
      // This is critical for new joiners to properly send their media to existing participants
      if (!localStream) {
        console.log(
          "[WebRTC] localStream not ready yet, waiting before connecting to existing participants..."
        );
        // Wait for localStream with retries (max 5 seconds)
        let retries = 0;
        const maxRetries = 50; // 50 * 100ms = 5 seconds
        while (!localStream && retries < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, 100));
          retries++;
        }
        if (!localStream) {
          console.warn(
            "[WebRTC] localStream still not available after waiting, creating receive-only connections"
          );
        } else {
          console.log(
            "[WebRTC] localStream is now ready, proceeding with peer connections"
          );
        }
      }

      // Store usernames from participants array
      if (message.participants && Array.isArray(message.participants)) {
        for (const participant of message.participants) {
          if (participant.id && participant.username) {
            participantUsernames[participant.id] = participant.username;
            // Update existing element titles if they exist
            const displayName = getDisplayName(participant.id);
            updateVideoElementTitle(participant.id, displayName);
          }
        }
      }

      // Create placeholder UI elements for all existing participants immediately
      // This ensures new joiners see existing participants even if their camera/mic is off
      for (const participantId of message.participant_ids) {
        if (participantId !== myId) {
          const existingVideoWrapper = document.getElementById(
            `video-wrapper-${participantId}`
          );
          if (!existingVideoWrapper) {
            console.log(
              `[WebRTC] Creating placeholder UI element for existing participant: ${participantId}`
            );
            const displayName = getDisplayName(participantId);
            addPlaceholderVideoElement(participantId, displayName);
          }
        }
      }

      // Create peer connections for all existing participants
      // The new joiner will be the offerer (initiates the connection)
      for (const participantId of message.participant_ids) {
        if (participantId !== myId) {
          console.log(
            `[WebRTC] Creating peer connection to existing participant: ${participantId}`
          );
          await createPeerConnection(participantId, true);
        }
      }
      break;

    case "new_participant":
      console.log(
        `[WebRTC] Received new_participant: ${message.participant_id}`
      );
      // Store username for new participant
      if (message.username && message.participant_id) {
        participantUsernames[message.participant_id] = message.username;
        // Update existing element title if it exists
        const displayName = getDisplayName(message.participant_id);
        updateVideoElementTitle(message.participant_id, displayName);
      }
      // Existing participants receive this when a new participant joins
      // They should create a peer connection and wait for an offer from the new joiner
      // Ensure localStream is ready before creating peer connection
      if (!localStream) {
        console.log(
          "[WebRTC] localStream not ready yet, waiting before creating peer connection for new participant..."
        );
        // Wait for localStream with retries (max 5 seconds)
        let retries = 0;
        const maxRetries = 50; // 50 * 100ms = 5 seconds
        while (!localStream && retries < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, 100));
          retries++;
        }
        if (!localStream) {
          console.warn(
            "[WebRTC] localStream still not available after waiting, creating receive-only connection for new participant"
          );
        } else {
          console.log(
            "[WebRTC] localStream is now ready, creating peer connection for new participant"
          );
        }
      } else {
        // Check if we have live tracks
        const liveTracks = localStream
          .getTracks()
          .filter((track) => track.readyState === "live");
        if (liveTracks.length === 0) {
          console.warn(
            `[WebRTC] Warning: localStream exists but has no live tracks. New joiner ${message.participant_id} will not be able to see/hear you. Consider re-enabling your camera/microphone.`
          );
        } else {
          console.log(
            `[WebRTC] localStream has ${liveTracks.length} live track(s) ready for new participant`
          );
        }
      }

      // Create placeholder UI element for new participant immediately
      // This ensures existing participants see the new joiner even if their camera/mic is off
      const existingVideoWrapper = document.getElementById(
        `video-wrapper-${message.participant_id}`
      );
      if (!existingVideoWrapper) {
        console.log(
          `[WebRTC] Creating placeholder UI element for new participant: ${message.participant_id}`
        );
        const displayName = getDisplayName(message.participant_id);
        addPlaceholderVideoElement(message.participant_id, displayName);
      }

      await createPeerConnection(message.participant_id, false);
      break;

    case "participant_left":
      // Clean up username when participant leaves
      if (
        message.participant_id &&
        participantUsernames[message.participant_id]
      ) {
        delete participantUsernames[message.participant_id];
      }
      closePeerConnection(message.participant_id);
      break;

    case "offer":
      handleOffer(sender_id, message.offer);
      break;

    case "answer":
      handleAnswer(sender_id, message.answer);
      break;

    case "candidate":
      handleIceCandidate(sender_id, message.candidate);
      break;
  }
}

export async function toggleMic() {
  if (!localStream) return;

  const audioTracks = localStream.getAudioTracks();
  const isCurrentlyEnabled = audioTracks.some(
    (track) => track.enabled && track.readyState === "live"
  );

  if (isCurrentlyEnabled) {
    // Disabling microphone: stop all audio tracks completely
    console.log(
      `[Mic] Disabling microphone - stopping ${audioTracks.length} audio track(s)`
    );

    // Update recording sender to use silent dummy track BEFORE stopping tracks
    // This ensures the sender has a valid track to switch to before the current one dies
    if (recordingPeerConnection && recordingMicSender && dummyAudioTrack) {
      console.log("[Mic] Switching recording audio to silent dummy track");
      try {
        // Just switch to dummy track. We don't need to stop the old track explicitly here
        // because the loop below will stop all local tracks (including the one we just replaced if it was direct)
        await recordingMicSender.replaceTrack(dummyAudioTrack);
        console.log("[Mic] Successfully switched recording sender to silent dummy track");
      } catch (err) {
        console.error("[Mic] Error switching recording track to dummy:", err);
      }
    }

    // First, stop transmission to all peers
    for (const track of audioTracks) {
      for (const pc of Object.values(peerConnections)) {
        const sender = pc
          .getSenders()
          .find(
            (s) =>
              s.track && s.track.kind === "audio" && s.track.id === track.id
          );
        if (sender) {
          await sender.replaceTrack(null);
        }
      }
    }

    // Then stop all tracks completely to release microphone hardware
    // Stop tracks first, then remove them to ensure hardware is released
    for (const track of audioTracks) {
      // Stop the track first - this releases the microphone hardware
      if (track.readyState === "live") {
        track.stop();
        console.log(
          `[Mic] Stopped audio track id=${track.id} to release microphone hardware`
        );
      }
    }

    // Remove all stopped tracks from the stream
    const tracksToRemove = [...audioTracks]; // Create a copy since we're modifying the array
    tracksToRemove.forEach((track) => {
      localStream!.removeTrack(track);
    });

    // Double-check: ensure any remaining audio tracks are stopped
    const remainingAudioTracks = localStream.getAudioTracks();
    remainingAudioTracks.forEach((track) => {
      if (track.readyState === "live") {
        track.stop();
        localStream!.removeTrack(track);
        console.log(`[Mic] Stopped remaining audio track id=${track.id}`);
      }
    });

    // Wait a bit to ensure hardware is fully released before notifying UI
    // This gives the browser time to release the microphone to other apps/tabs
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Notify UI of state change after disabling
    if (onTrackStateChange) {
      const callback = onTrackStateChange;
      callback();
    }
  } else {
    // Enabling microphone: acquire new audio track
    try {
      let audioConstraints: MediaTrackConstraints = {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      };

      if (navigator.userAgent.includes("Chrome")) {
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
        } as any;
      } else {
        audioConstraints = {
          ...audioConstraints,
          latency: 0.01,
          sampleRate: 48000,
          channelCount: 1,
        };
      }

      const newStream = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints,
      });

      const newAudioTrack = newStream.getAudioTracks()[0];

      // Add new track to local stream
      localStream.addTrack(newAudioTrack);

      // Setup event listeners for the new track
      setupTrackEventListeners(newStream);

      // Stop all other tracks from the new stream (shouldn't be any, but be safe)
      newStream.getTracks().forEach((track) => {
        if (track !== newAudioTrack) {
          track.stop();
        }
      });

      // Update peer connections
      for (const pc of Object.values(peerConnections)) {
        const senders = pc.getSenders();

        // First, try to find a sender with an existing audio track
        let audioSender = senders.find(
          (s) => s.track && s.track.kind === "audio"
        );

        if (audioSender) {
          // Sender has an existing audio track - replace it
          try {
            await audioSender.replaceTrack(newAudioTrack);
            console.log(`[Mic] Replaced existing audio track with new one`);
          } catch (error: any) {
            console.error(`[Mic] Error replacing audio track:`, error);
            throw error;
          }
        } else {
          // No audio sender with active track exists
          // Check if there's a sender with null track that might have been audio
          // We'll try to replace it, but if it fails (wrong kind), we'll add as new track
          const nullTrackSender = senders.find((s) => !s.track);

          if (nullTrackSender) {
            // Try to replace null track - if it fails, it means it was for a different kind
            try {
              await nullTrackSender.replaceTrack(newAudioTrack);
              console.log(`[Mic] Replaced null track with new audio track`);
            } catch (error: any) {
              // If replace fails (wrong kind), add as new track instead
              console.log(
                `[Mic] Could not replace null track (wrong kind), adding new track:`,
                error.message
              );
              pc.addTrack(newAudioTrack, localStream);
              // Trigger renegotiation
              if (pc.signalingState === "stable") {
                const offer = await pc.createOffer();
                if (pc.signalingState === "stable") {
                  await pc.setLocalDescription(offer);
                  const targetId = Object.keys(peerConnections).find(
                    (id) => peerConnections[id] === pc
                  );
                  if (targetId) {
                    sendWebSocketMessage({
                      type: "offer",
                      target_id: targetId,
                      offer: offer,
                    });
                  }
                }
              }
            }
          } else {
            // No sender exists at all, add new track
            pc.addTrack(newAudioTrack, localStream);
            console.log(`[Mic] Added new audio track to peer connection`);
            // Only create offer if in stable state (renegotiation)
            if (pc.signalingState === "stable") {
              const offer = await pc.createOffer();
              if (pc.signalingState === "stable") {
                await pc.setLocalDescription(offer);
                const targetId = Object.keys(peerConnections).find(
                  (id) => peerConnections[id] === pc
                );
                if (targetId) {
                  sendWebSocketMessage({
                    type: "offer",
                    target_id: targetId,
                    offer: offer,
                  });
                }
              }
            } else {
              console.warn(
                `[Mic] Cannot renegotiate, signaling state is ${pc.signalingState}`
              );
            }
          }
        }
      }

      console.log(
        `[Mic] Acquired new audio track id=${newAudioTrack.id} enabled=${newAudioTrack.enabled} readyState=${newAudioTrack.readyState}`
      );

      // Update recording sender to use new microphone track DIRECTLY (no cloning)
      if (recordingPeerConnection && recordingMicSender) {
        console.log("[Mic] Switching recording audio to new microphone track");
        try {
          // Use the track directly - safer than cloning for reliability
          // We rely on the fact that when we toggle mic OFF, we switch back to dummy track
          // before stopping this track.
          
          // Debug audio levels on the new track
          const audioContext = new AudioContext();
          const source = audioContext.createMediaStreamSource(newStream);
          const analyser = audioContext.createAnalyser();
          source.connect(analyser);
          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          
          const checkAudio = () => {
            if (analyser) {
                analyser.getByteFrequencyData(dataArray);
                const sum = dataArray.reduce((a, b) => a + b, 0);
                if (sum > 0) {
                  console.log(`[Mic] New microphone track is producing audio! Level: ${sum}`);
                  audioContext.close();
                } else {
                  // Check for a few seconds then give up logging
                  if (audioContext.state !== 'closed') {
                     setTimeout(checkAudio, 200); 
                  }
                }
            }
          };
          checkAudio(); // Start checking
          
          await recordingMicSender.replaceTrack(newAudioTrack);
          console.log(`[Mic] Successfully switched recording sender to new mic track (direct)`);
        } catch (err) {
          console.error("[Mic] Error switching recording track to mic:", err);
        }
      }

      // Notify UI of state change after enabling (with small delay to ensure stream is updated)
      if (onTrackStateChange) {
        const callback = onTrackStateChange;
        setTimeout(() => {
          callback();
        }, 50);
      }
    } catch (error: any) {
      console.error("[Mic] Error acquiring audio stream:", error);
      if (
        error.name === "NotAllowedError" ||
        error.name === "PermissionDeniedError"
      ) {
        throw new Error(
          "Microphone access denied. Please allow microphone access in your browser settings."
        );
      }
      throw error;
    }
  }
}

export async function toggleVideo() {
  if (!localStream) return;

  const videoTracks = localStream.getVideoTracks();
  const isCurrentlyEnabled = videoTracks.some(
    (track) => track.enabled && track.readyState === "live"
  );

  if (isCurrentlyEnabled) {
    // Disabling video: stop all video tracks completely
    console.log(
      `[Video] Disabling video - stopping ${videoTracks.length} video track(s)`
    );

    // First, stop transmission to all peers
    for (const videoTrack of videoTracks) {
      for (const pc of Object.values(peerConnections)) {
        const sender = pc
          .getSenders()
          .find(
            (s) =>
              s.track &&
              s.track.kind === "video" &&
              s.track.id === videoTrack.id
          );
        if (sender) {
          await sender.replaceTrack(null);
        }
      }
    }

    // Clear local video display FIRST to remove any references
    const localVideo = document.getElementById(
      "local-video"
    ) as HTMLVideoElement;
    if (localVideo) {
      localVideo.pause();
      localVideo.srcObject = null;
      localVideo.load(); // Reset the video element completely
      console.log(`[Video] Cleared local video element to release references`);
    }

    // Then stop all tracks completely to release camera hardware
    // Stop tracks first, then remove them to ensure hardware is released
    for (const videoTrack of videoTracks) {
      // Stop the track first - this releases the camera hardware
      if (videoTrack.readyState === "live") {
        videoTrack.stop();
        console.log(
          `[Video] Stopped video track id=${videoTrack.id} to release camera hardware`
        );
      }
    }

    // Remove all stopped tracks from the stream
    const tracksToRemove = [...videoTracks]; // Create a copy since we're modifying the array
    tracksToRemove.forEach((track) => {
      localStream!.removeTrack(track);
    });

    // Double-check: ensure any remaining video tracks are stopped
    const remainingVideoTracks = localStream.getVideoTracks();
    remainingVideoTracks.forEach((track) => {
      if (track.readyState === "live") {
        track.stop();
        localStream!.removeTrack(track);
        console.log(`[Video] Stopped remaining video track id=${track.id}`);
      }
    });

    // Update local stream (which will be empty now)
    setLocalStream(localStream);

    // Wait a bit to ensure hardware is fully released before notifying UI
    // This gives the browser time to release the camera to other apps/tabs
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Notify UI of state change after disabling
    if (onTrackStateChange) {
      const callback = onTrackStateChange;
      callback();
    }
  } else {
    // Enabling video: acquire new camera
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: true,
      });
      const newVideoTrack = newStream.getVideoTracks()[0];

      // Remove any old tracks if they exist
      const oldTracks = localStream.getVideoTracks();
      oldTracks.forEach((track) => {
        track.stop();
        localStream!.removeTrack(track);
      });

      // Add new track
      localStream.addTrack(newVideoTrack);

      // Setup event listeners for the new track
      setupTrackEventListeners(newStream);

      // Stop all other tracks from the new stream (shouldn't be any, but be safe)
      newStream.getTracks().forEach((track) => {
        if (track !== newVideoTrack) {
          track.stop();
        }
      });

      // Update peer connections
      for (const pc of Object.values(peerConnections)) {
        const senders = pc.getSenders();

        // First, try to find a sender with an existing video track
        let videoSender = senders.find(
          (s) => s.track && s.track.kind === "video"
        );

        if (videoSender) {
          // Sender has an existing video track - replace it
          try {
            await videoSender.replaceTrack(newVideoTrack);
            console.log(`[Video] Replaced existing video track with new one`);
          } catch (error: any) {
            console.error(`[Video] Error replacing video track:`, error);
            throw error;
          }
        } else {
          // No video sender with active track exists
          // Check if there's a sender with null track that might have been video
          // We'll try to replace it, but if it fails (wrong kind), we'll add as new track
          const nullTrackSender = senders.find((s) => !s.track);

          if (nullTrackSender) {
            // Try to replace null track - if it fails, it means it was for a different kind
            try {
              await nullTrackSender.replaceTrack(newVideoTrack);
              console.log(`[Video] Replaced null track with new video track`);
            } catch (error: any) {
              // If replace fails (wrong kind), add as new track instead
              console.log(
                `[Video] Could not replace null track (wrong kind), adding new track:`,
                error.message
              );
              pc.addTrack(newVideoTrack, localStream);
              // Trigger renegotiation
              if (pc.signalingState === "stable") {
                const offer = await pc.createOffer();
                if (pc.signalingState === "stable") {
                  await pc.setLocalDescription(offer);
                  const targetId = Object.keys(peerConnections).find(
                    (id) => peerConnections[id] === pc
                  );
                  if (targetId) {
                    sendWebSocketMessage({
                      type: "offer",
                      target_id: targetId,
                      offer: offer,
                    });
                  }
                }
              }
            }
          } else {
            // No sender exists at all, add new track
            pc.addTrack(newVideoTrack, localStream);
            console.log(`[Video] Added new video track to peer connection`);
            // Only create offer if in stable state (renegotiation)
            if (pc.signalingState === "stable") {
              const offer = await pc.createOffer();
              if (pc.signalingState === "stable") {
                await pc.setLocalDescription(offer);
                const targetId = Object.keys(peerConnections).find(
                  (id) => peerConnections[id] === pc
                );
                if (targetId) {
                  sendWebSocketMessage({
                    type: "offer",
                    target_id: targetId,
                    offer: offer,
                  });
                }
              }
            } else {
              console.warn(
                `[Video] Cannot renegotiate, signaling state is ${pc.signalingState}`
              );
            }
          }
        }
      }

      setLocalStream(localStream);
      console.log(
        `[Video] Acquired new video track id=${newVideoTrack.id} enabled=${newVideoTrack.enabled} readyState=${newVideoTrack.readyState}`
      );

      // Notify UI of state change after enabling (with small delay to ensure stream is updated)
      if (onTrackStateChange) {
        const callback = onTrackStateChange;
        setTimeout(() => {
          callback();
        }, 50);
      }
    } catch (error: any) {
      console.error("[Video] Error acquiring video stream:", error);
      if (
        error.name === "NotAllowedError" ||
        error.name === "PermissionDeniedError"
      ) {
        throw new Error(
          "Camera access denied. Please allow camera access in your browser settings."
        );
      }
      throw error;
    }
  }
}

export async function shareScreen() {
  if (localScreenStream) return;

  const audioTrack = localStream
    ? localStream.getAudioTracks().find((track) => track.enabled)
    : null;

  try {
    const screenStreamConstraints: DisplayMediaStreamConstraints = {
      video: {
        width: { ideal: window.screen.width * window.devicePixelRatio },
        height: { ideal: window.screen.height * window.devicePixelRatio },
        frameRate: { ideal: 30 },
        cursor: "always",
      } as MediaTrackConstraints,
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      } as MediaTrackConstraints,
    };

    localScreenStream = await navigator.mediaDevices.getDisplayMedia(
      screenStreamConstraints
    );

    if (audioTrack) {
      const micClone = audioTrack.clone();
      localScreenStream.addTrack(micClone);
    }

    logAvailableAudioTracks("shareScreen", localScreenStream);
    console.log(
      `[Screen Share] Captured ${
        localScreenStream.getVideoTracks().length
      } video and ${localScreenStream.getAudioTracks().length} audio tracks`
    );

    const myDisplayName = myId ? getDisplayName(myId) : undefined;
    addScreenShare(localScreenStream, myId || "unknown", myDisplayName);

    for (const [peerId, pc] of Object.entries(peerConnections)) {
      localScreenStream
        .getTracks()
        .forEach((track) => pc.addTrack(track, localScreenStream!));
      // Only create offer if in stable state (renegotiation)
      if (pc.signalingState === "stable") {
        const offer = await pc.createOffer();
        if (pc.signalingState === "stable") {
          await pc.setLocalDescription(offer);
          sendWebSocketMessage({
            type: "offer",
            target_id: peerId,
            offer: offer,
          });
        }
      } else {
        console.warn(
          `[Screen Share] Cannot renegotiate, signaling state is ${pc.signalingState} for ${peerId}`
        );
      }
    }
  } catch (err) {
    console.error("Error sharing screen:", err);
    if (localScreenStream) {
      localScreenStream.getTracks().forEach((track) => track.stop());
      localScreenStream = null;
      // Remove screen share tab for this participant
      removeScreenShare(myId || undefined);
    }
  }
}

export async function stopScreenShare() {
  if (!localScreenStream) return;

  const screenTracks = localScreenStream.getTracks();
  screenTracks.forEach((track) => track.stop());
  localScreenStream = null;
  // Remove screen share tab for this participant
  removeScreenShare(myId || undefined);

  for (const [peerId, pc] of Object.entries(peerConnections)) {
    const senders = pc.getSenders();
    senders.forEach((sender) => {
      if (sender.track && screenTracks.includes(sender.track)) {
        pc.removeTrack(sender);
      }
    });
    // Only create offer if in stable state (renegotiation)
    if (pc.signalingState === "stable") {
      const offer = await pc.createOffer();
      if (pc.signalingState === "stable") {
        await pc.setLocalDescription(offer);
        sendWebSocketMessage({
          type: "offer",
          target_id: peerId,
          offer: offer,
        });
      }
    } else {
      console.warn(
        `[Screen Share] Cannot renegotiate, signaling state is ${pc.signalingState} for ${peerId}`
      );
    }
  }
}

// Add local tracks to existing peer connections that were created without localStream
function addLocalTracksToExistingConnections() {
  if (!localStream) return;

  for (const [targetId, pc] of Object.entries(peerConnections)) {
    // Check if this peer connection already has local tracks
    const existingSenders = pc.getSenders();
    const hasLocalTracks = localStream
      .getTracks()
      .some((track) =>
        existingSenders.some((sender) => sender.track?.id === track.id)
      );

    // If no local tracks are present, add them
    if (!hasLocalTracks) {
      console.log(
        `[WebRTC] Adding local tracks to existing peer connection for ${targetId}`
      );
      localStream.getTracks().forEach((track) => {
        const sender = pc.addTrack(track, localStream!);
        if (sender.getParameters) {
          const params = sender.getParameters();
          if (params.encodings && params.encodings.length > 0) {
            params.encodings[0].priority = "high";
            params.encodings[0].networkPriority = "high";
            sender.setParameters(params).catch((err) => {
              console.warn(
                `[WebRTC] Could not set ${track.kind} parameters for ${targetId}:`,
                err
              );
            });
          }
        }
      });
    }
  }
}

// Helper function to handle video track state changes and toggle between video and placeholder
function handleRemoteVideoTrackState(
  participantId: string,
  videoTrack: MediaStreamTrack
) {
  const video = document.getElementById(
    `video-${participantId}`
  ) as HTMLVideoElement;
  let placeholder = document.getElementById(`placeholder-${participantId}`);

  // Ensure placeholder exists
  if (!placeholder) {
    const displayName = getDisplayName(participantId);
    addPlaceholderVideoElement(participantId, displayName);
    placeholder = document.getElementById(`placeholder-${participantId}`);
  }

  if (!video || !placeholder) {
    return;
  }

  const updateDisplay = () => {
    const isTrackActive =
      videoTrack.readyState === "live" && videoTrack.enabled;

    if (isTrackActive) {
      // Show video, hide placeholder
      video.classList.remove("hidden");
      placeholder!.style.display = "none";
      console.log(
        `[WebRTC] Showing video for ${participantId} (track enabled)`
      );
    } else {
      // Hide video, show placeholder
      video.classList.add("hidden");
      placeholder!.style.display = "block";
      console.log(
        `[WebRTC] Showing placeholder for ${participantId} (track disabled/ended)`
      );
    }
  };

  // Listen for track ended event
  const endedHandler = () => {
    console.log(`[WebRTC] Video track ended for ${participantId}`);
    updateDisplay();
  };
  videoTrack.addEventListener("ended", endedHandler);

  // Since MediaStreamTrack doesn't fire events for enabled property changes,
  // we'll use a periodic check to monitor the enabled state
  let lastEnabledState = videoTrack.enabled;
  const enabledCheckInterval = setInterval(() => {
    if (videoTrack.readyState === "ended") {
      clearInterval(enabledCheckInterval);
      return;
    }

    if (videoTrack.enabled !== lastEnabledState) {
      lastEnabledState = videoTrack.enabled;
      console.log(
        `[WebRTC] Video track enabled state changed for ${participantId}: ${videoTrack.enabled}`
      );
      updateDisplay();
    }
  }, 500); // Check every 500ms

  // Store interval ID on the track for cleanup (if needed)
  (videoTrack as any)._enabledCheckInterval = enabledCheckInterval;

  // Initial state check
  updateDisplay();

  // Return cleanup function
  return () => {
    clearInterval(enabledCheckInterval);
    videoTrack.removeEventListener("ended", endedHandler);
  };
}

async function createPeerConnection(targetId: string, isOfferer: boolean) {
  // Allow creating peer connections even without localStream (for receiving remote streams)
  // Check if peer connection already exists
  if (peerConnections[targetId]) {
    console.log(`[WebRTC] Peer connection for ${targetId} already exists`);
    // If we're the offerer and localStream is now available, ensure tracks are added
    if (isOfferer && localStream) {
      const pc = peerConnections[targetId];
      const existingSenders = pc.getSenders();
      const hasLocalTracks = localStream
        .getTracks()
        .some((track) =>
          existingSenders.some((sender) => sender.track?.id === track.id)
        );
      if (!hasLocalTracks) {
        console.log(
          `[WebRTC] Adding local tracks to existing peer connection for ${targetId}`
        );
        localStream.getTracks().forEach((track) => {
          const sender = pc.addTrack(track, localStream!);
          if (sender.getParameters) {
            const params = sender.getParameters();
            if (params.encodings && params.encodings.length > 0) {
              params.encodings[0].priority = "high";
              params.encodings[0].networkPriority = "high";
              sender.setParameters(params).catch((err) => {
                console.warn(
                  `[WebRTC] Could not set ${track.kind} parameters for ${targetId}:`,
                  err
                );
              });
            }
          }
        });
        // If we're the offerer and connection is stable, create a new offer with tracks
        // Check negotiation lock to prevent concurrent negotiations
        if (
          pc.signalingState === "stable" &&
          !negotiationInProgress[targetId]
        ) {
          negotiationInProgress[targetId] = true;
          try {
            // Wait a bit after adding tracks to ensure they're registered
            await new Promise((resolve) => setTimeout(resolve, 100));

            // Double-check state is still stable after delay
            if (pc.signalingState !== "stable") {
              console.warn(
                `[WebRTC] Signaling state changed to ${pc.signalingState} after adding tracks, skipping offer creation for ${targetId}`
              );
              negotiationInProgress[targetId] = false;
              return;
            }

            const offerOptions: RTCOfferOptions = {
              offerToReceiveAudio: true,
              offerToReceiveVideo: true,
              voiceActivityDetection: false,
            };
            const offer = await pc.createOffer(offerOptions);
            if (pc.signalingState === "stable") {
              await pc.setLocalDescription(offer);
              console.log(
                `[WebRTC] Created updated offer with tracks for ${targetId}`
              );
              sendWebSocketMessage({
                type: "offer",
                target_id: targetId,
                offer: offer,
              });
            }
            negotiationInProgress[targetId] = false;
          } catch (error) {
            negotiationInProgress[targetId] = false;
            console.error(
              `[WebRTC] Error creating updated offer for ${targetId}:`,
              error
            );
          }
        } else if (negotiationInProgress[targetId]) {
          console.log(
            `[WebRTC] Negotiation already in progress for ${targetId}, skipping offer creation`
          );
        }
      }
    }
    return;
  }

  const pc = new RTCPeerConnection(peerConnectionConfig);
  (pc as any).iceCandidates = [];
  peerConnections[targetId] = pc;

  // Initialize connection state tracking
  connectionStates[targetId] = {
    state: pc.connectionState,
    iceConnectionState: pc.iceConnectionState,
    iceGatheringState: pc.iceGatheringState,
    signalingState: pc.signalingState,
  };

  // Track connection state changes
  pc.onconnectionstatechange = () => {
    if (connectionStates[targetId]) {
      connectionStates[targetId].state = pc.connectionState;
      console.log(
        `[WebRTC] Connection state changed for ${targetId}: ${pc.connectionState}`
      );
      if (
        pc.connectionState === "failed" ||
        pc.connectionState === "disconnected"
      ) {
        connectionStates[
          targetId
        ].lastError = `Connection ${pc.connectionState}`;
        console.warn(
          `[WebRTC] Connection issue with ${targetId}: ${pc.connectionState}`
        );
      } else if (pc.connectionState === "connected") {
        connectionStates[targetId].connectedAt = new Date();
        console.log(`[WebRTC] ✅ Successfully connected to ${targetId}`);

        // Log what tracks we're sending
        const senders = pc.getSenders();
        const audioSenders = senders.filter(
          (s) => s.track && s.track.kind === "audio"
        );
        const videoSenders = senders.filter(
          (s) => s.track && s.track.kind === "video"
        );
        console.log(
          `[WebRTC] Connection to ${targetId}: Sending ${audioSenders.length} audio track(s) and ${videoSenders.length} video track(s)`
        );

        // Log what tracks we're receiving
        const receivers = pc.getReceivers();
        const audioReceivers = receivers.filter(
          (r) => r.track && r.track.kind === "audio"
        );
        const videoReceivers = receivers.filter(
          (r) => r.track && r.track.kind === "video"
        );
        console.log(
          `[WebRTC] Connection to ${targetId}: Receiving ${audioReceivers.length} audio track(s) and ${videoReceivers.length} video track(s)`
        );

        // Log details of received tracks
        if (audioReceivers.length > 0) {
          audioReceivers.forEach((receiver, index) => {
            const track = receiver.track;
            console.log(
              `[WebRTC] 🔊 Receiving audio track ${index} from ${targetId}: id=${track.id}, enabled=${track.enabled}, readyState=${track.readyState}, muted=${track.muted}`
            );
          });
        } else {
          console.log(
            `[WebRTC] ⚠️ No audio tracks received from ${targetId} yet - waiting for ontrack event`
          );
        }

        if (videoReceivers.length > 0) {
          videoReceivers.forEach((receiver, index) => {
            const track = receiver.track;
            console.log(
              `[WebRTC] 📹 Receiving video track ${index} from ${targetId}: id=${track.id}, enabled=${track.enabled}, readyState=${track.readyState}, muted=${track.muted}`
            );
          });
        } else {
          console.log(
            `[WebRTC] ⚠️ No video tracks received from ${targetId} yet - waiting for ontrack event`
          );
        }

        // Check again after a short delay to see if tracks arrived
        setTimeout(() => {
          const receiversAfterDelay = pc.getReceivers();
          const audioReceiversAfterDelay = receiversAfterDelay.filter(
            (r) => r.track && r.track.kind === "audio"
          );
          const videoReceiversAfterDelay = receiversAfterDelay.filter(
            (r) => r.track && r.track.kind === "video"
          );

          if (
            audioReceiversAfterDelay.length !== audioReceivers.length ||
            videoReceiversAfterDelay.length !== videoReceivers.length
          ) {
            console.log(
              `[WebRTC] 📊 Track status update for ${targetId} (after 1s): Receiving ${audioReceiversAfterDelay.length} audio and ${videoReceiversAfterDelay.length} video track(s)`
            );
          } else if (
            audioReceiversAfterDelay.length === 0 &&
            videoReceiversAfterDelay.length === 0
          ) {
            console.warn(
              `[WebRTC] ⚠️ Still no tracks received from ${targetId} after 1 second - ontrack event may not have fired yet`
            );
          }
        }, 1000);
      }
    }
  };

  pc.oniceconnectionstatechange = () => {
    if (connectionStates[targetId]) {
      connectionStates[targetId].iceConnectionState = pc.iceConnectionState;
      console.log(
        `[WebRTC] ICE connection state changed for ${targetId}: ${pc.iceConnectionState}`
      );
      if (
        pc.iceConnectionState === "failed" ||
        pc.iceConnectionState === "disconnected"
      ) {
        connectionStates[targetId].lastError = `ICE ${pc.iceConnectionState}`;
        console.warn(
          `[WebRTC] ICE connection issue with ${targetId}: ${pc.iceConnectionState}`
        );
      }
    }
  };

  pc.onicegatheringstatechange = () => {
    if (connectionStates[targetId]) {
      connectionStates[targetId].iceGatheringState = pc.iceGatheringState;
      console.log(
        `[WebRTC] ICE gathering state changed for ${targetId}: ${pc.iceGatheringState}`
      );
    }
  };

  pc.onsignalingstatechange = () => {
    if (connectionStates[targetId]) {
      connectionStates[targetId].signalingState = pc.signalingState;
      console.log(
        `[WebRTC] Signaling state changed for ${targetId}: ${pc.signalingState}`
      );
      // Clear negotiation lock when state returns to stable (negotiation complete)
      if (pc.signalingState === "stable" && negotiationInProgress[targetId]) {
        console.log(
          `[WebRTC] Negotiation completed for ${targetId}, clearing lock`
        );
        negotiationInProgress[targetId] = false;
      }
    }
  };

  console.log(
    `[WebRTC] Creating peer connection for ${targetId}, I am ${myId}, isOfferer: ${isOfferer}`
  );

  // Only add local tracks if localStream exists
  if (localStream) {
    const tracks = localStream.getTracks();
    console.log(
      `[WebRTC] Adding ${tracks.length} local track(s) to peer connection for ${targetId}:`
    );
    tracks.forEach((track) => {
      console.log(
        `[WebRTC]   - ${track.kind} track: id=${track.id}, enabled=${track.enabled}, readyState=${track.readyState}, muted=${track.muted}`
      );
    });

    tracks.forEach((track) => {
      const sender = pc.addTrack(track, localStream!);
      if (sender.getParameters) {
        const params = sender.getParameters();
        if (params.encodings && params.encodings.length > 0) {
          params.encodings[0].priority = "high";
          params.encodings[0].networkPriority = "high";
          sender.setParameters(params).catch((err) => {
            console.warn(
              `[WebRTC] Could not set ${track.kind} parameters for ${targetId}:`,
              err
            );
          });
        }
      }
    });
    console.log(
      `[WebRTC] Added ${
        localStream.getTracks().length
      } local track(s) to peer connection for ${targetId}`
    );
  } else {
    console.log(
      `[WebRTC] No local stream available, creating peer connection for receiving only from ${targetId}`
    );
  }

  pc.onicecandidate = (event) => {
    if (event.candidate) {
      sendWebSocketMessage({
        type: "candidate",
        target_id: targetId,
        candidate: event.candidate,
      });
    }
  };

  // Create placeholder UI element immediately when peer connection is established
  // This ensures new joiners see existing participants even if their camera/mic is off
  const existingVideoWrapper = document.getElementById(
    `video-wrapper-${targetId}`
  );
  if (!existingVideoWrapper) {
    console.log(`[WebRTC] Creating placeholder UI element for ${targetId}`);
    const displayName = getDisplayName(targetId);
    addPlaceholderVideoElement(targetId, displayName);
  }

  pc.ontrack = (event) => {
    console.log(
      `[WebRTC] 🎯 ontrack event fired from ${targetId}: track kind=${event.track.kind}, track id=${event.track.id}, enabled=${event.track.enabled}, readyState=${event.track.readyState}`
    );

    if (!event.streams || !event.streams[0]) {
      console.warn(
        `[WebRTC] ⚠️ ontrack: No streams received from ${targetId} - event.streams is empty`
      );
      return;
    }

    const [stream] = event.streams;
    console.log(
      `[WebRTC] ✅ ontrack: Received ${
        event.track.kind
      } track from ${targetId}, stream has ${
        stream.getVideoTracks().length
      } video and ${stream.getAudioTracks().length} audio tracks`
    );

    // Log all tracks in the stream
    const allTracks = stream.getTracks();
    console.log(
      `[WebRTC] Stream from ${targetId} contains ${allTracks.length} total track(s):`
    );
    allTracks.forEach((track, index) => {
      console.log(
        `[WebRTC]   Track ${index}: kind=${track.kind}, id=${track.id}, enabled=${track.enabled}, readyState=${track.readyState}, muted=${track.muted}, label="${track.label}"`
      );
    });

    // Handle video tracks
    if (event.track.kind === "video") {
      console.log(`[WebRTC] Processing video track from ${targetId}`);

      // Check if we already have a video element for this participant
      const existingVideoElement = document.getElementById(`video-${targetId}`);
      const placeholder = document.getElementById(`placeholder-${targetId}`);

      // If video track exists, always show it (could be webcam or screen share)
      // IMPORTANT: If a placeholder exists for this participant, it's ALWAYS their webcam
      // Screen share is a separate stream that doesn't replace participant placeholders
      if (stream.getVideoTracks().length > 0) {
        const videoTrack = stream.getVideoTracks()[0];
        const trackLabel = videoTrack.label.toLowerCase();

        // Screen share detection (very strict):
        // 1. Only if NO placeholder exists (screen share is separate from participant video)
        // 2. AND label must explicitly indicate screen share with specific patterns
        // 3. Screen share labels typically look like: "screen:0:0", "Entire Screen", "Screen 1", etc.
        const isScreenShare =
          !placeholder && // Never treat as screen share if placeholder exists (it's their webcam)
          (trackLabel.includes("screen") || trackLabel.includes("display")) &&
          (trackLabel.includes(":") ||
            trackLabel.includes("entire") ||
            trackLabel.includes("window") ||
            /screen\s*\d+/i.test(trackLabel)); // Matches "Screen 1", "Screen 2", etc.

        if (isScreenShare) {
          console.log(
            `[WebRTC] Detected screen share from ${targetId} (label: ${videoTrack.label})`
          );
          const displayName = getDisplayName(targetId);
          addScreenShare(stream, targetId, displayName);

          // Listen for screen share track ending (when participant stops sharing)
          videoTrack.addEventListener("ended", () => {
            console.log(`[WebRTC] Screen share track ended for ${targetId}`);
            removeScreenShare(targetId);
          });
        } else {
          // Regular webcam video - always goes to participant's placeholder/tab
          console.log(
            `[WebRTC] Adding webcam video stream for ${targetId} (label: ${videoTrack.label})`
          );
          if (!existingVideoElement) {
            // Check if placeholder exists, if so update it, otherwise create new
            if (placeholder) {
              // Update placeholder to show video
              const video = document.getElementById(
                `video-${targetId}`
              ) as HTMLVideoElement;
              if (video) {
                video.srcObject = stream;
                console.log(
                  `[WebRTC] Updated placeholder with video stream for ${targetId}`
                );

                // Set up track state monitoring to toggle between video and placeholder
                handleRemoteVideoTrackState(targetId, videoTrack);

                // IMPORTANT: Also add audio if stream has audio tracks
                if (
                  targetId !== myId &&
                  (!(
                    typeof window !== "undefined" && (window as any).myUserId
                  ) ||
                    targetId !== (window as any).myUserId) &&
                  stream.getAudioTracks().length > 0
                ) {
                  console.log(
                    `[WebRTC] 🔊 Video stream from ${targetId} includes ${
                      stream.getAudioTracks().length
                    } audio track(s) - setting up audio playback`
                  );
                  const existingAudioElement = document.getElementById(
                    `audio-${targetId}`
                  );
                  if (!existingAudioElement) {
                    console.log(
                      `[WebRTC] ✅ Adding audio element when updating placeholder for ${targetId}`
                    );
                    addAudioElement(targetId, stream);
                  } else {
                    // Update existing audio element
                    const audio = existingAudioElement as HTMLAudioElement;
                    if (audio.srcObject !== stream) {
                      console.log(
                        `[WebRTC] 🔄 Updating audio element with new stream for ${targetId}`
                      );
                      audio.srcObject = stream;
                    }
                  }
                }
              } else {
                const displayName = getDisplayName(targetId);
                addVideoElement(targetId, stream, displayName);

                // Set up track state monitoring to toggle between video and placeholder
                handleRemoteVideoTrackState(targetId, videoTrack);

                // Ensure audio is added if stream has audio tracks
                if (
                  targetId !== myId &&
                  (!(
                    typeof window !== "undefined" && (window as any).myUserId
                  ) ||
                    targetId !== (window as any).myUserId) &&
                  stream.getAudioTracks().length > 0
                ) {
                  console.log(
                    `[WebRTC] 🔊 Video stream from ${targetId} includes ${
                      stream.getAudioTracks().length
                    } audio track(s) - setting up audio playback`
                  );
                  const existingAudioElement = document.getElementById(
                    `audio-${targetId}`
                  );
                  if (!existingAudioElement) {
                    console.log(
                      `[WebRTC] ✅ Adding audio element after creating video element for ${targetId}`
                    );
                    addAudioElement(targetId, stream);
                  }
                }
              }
            } else {
              const displayName = getDisplayName(targetId);
              addVideoElement(targetId, stream, displayName);

              // Set up track state monitoring to toggle between video and placeholder
              handleRemoteVideoTrackState(targetId, videoTrack);

              // Ensure audio is added if stream has audio tracks
              if (
                targetId !== myId &&
                (!(typeof window !== "undefined" && (window as any).myUserId) ||
                  targetId !== (window as any).myUserId) &&
                stream.getAudioTracks().length > 0
              ) {
                const existingAudioElement = document.getElementById(
                  `audio-${targetId}`
                );
                if (!existingAudioElement) {
                  console.log(
                    `[WebRTC] Adding audio element after creating video element for ${targetId}`
                  );
                  addAudioElement(targetId, stream);
                }
              }
            }
          } else {
            // Update existing video element
            const video = existingVideoElement as HTMLVideoElement;
            if (video.srcObject !== stream) {
              video.srcObject = stream;
            }

            // Set up track state monitoring to toggle between video and placeholder
            handleRemoteVideoTrackState(targetId, videoTrack);

            // IMPORTANT: Also ensure audio is added/updated if stream has audio tracks
            if (
              targetId !== myId &&
              (!(typeof window !== "undefined" && (window as any).myUserId) ||
                targetId !== (window as any).myUserId) &&
              stream.getAudioTracks().length > 0
            ) {
              console.log(
                `[WebRTC] 🔊 Video stream from ${targetId} includes ${
                  stream.getAudioTracks().length
                } audio track(s) - setting up audio playback`
              );
              const existingAudioElement = document.getElementById(
                `audio-${targetId}`
              );
              if (!existingAudioElement) {
                console.log(
                  `[WebRTC] ✅ Adding audio element when updating existing video for ${targetId}`
                );
                addAudioElement(targetId, stream);
              } else {
                // Update existing audio element
                const audio = existingAudioElement as HTMLAudioElement;
                if (audio.srcObject !== stream) {
                  console.log(
                    `[WebRTC] 🔄 Updating audio element with new stream for ${targetId}`
                  );
                  audio.srcObject = stream;
                }
              }
            }
          }
        }
      }
    } else if (event.track.kind === "audio") {
      // Handle standalone audio tracks
      const audioTrack = event.track;
      console.log(
        `[WebRTC] 🔊 Received AUDIO track from ${targetId}: id=${audioTrack.id}, enabled=${audioTrack.enabled}, readyState=${audioTrack.readyState}, muted=${audioTrack.muted}, label="${audioTrack.label}"`
      );
      console.log(
        `[WebRTC] Audio stream from ${targetId} has ${
          stream.getAudioTracks().length
        } audio track(s)`
      );

      if (
        targetId === myId ||
        (typeof window !== "undefined" &&
          (window as any).myUserId &&
          targetId === (window as any).myUserId)
      ) {
        console.warn(
          `[WebRTC] BLOCKED: Own audio playback prevented for ${targetId}`
        );
        return;
      }

      // Log track state changes
      audioTrack.addEventListener("ended", () => {
        console.log(
          `[WebRTC] ⏹️ Audio track ended for ${targetId} - audio stream stopped`
        );
      });

      audioTrack.addEventListener("mute", () => {
        console.log(
          `[WebRTC] 🔇 Audio track muted for ${targetId} - user muted their microphone`
        );
      });

      audioTrack.addEventListener("unmute", () => {
        console.log(
          `[WebRTC] 🔊 Audio track unmuted for ${targetId} - user unmuted their microphone`
        );
      });

      const existingAudioElement = document.getElementById(`audio-${targetId}`);
      const existingVideoElement = document.getElementById(`video-${targetId}`);

      // Add audio element - either standalone or to complement existing video
      if (!existingAudioElement) {
        console.log(
          `[WebRTC] ✅ Adding audio element for ${targetId}${
            existingVideoElement
              ? " (complementing existing video)"
              : " (standalone audio)"
          }`
        );
        addAudioElement(targetId, stream);
      } else {
        // Update existing audio element with new stream
        const audio = existingAudioElement as HTMLAudioElement;
        if (audio.srcObject !== stream) {
          console.log(
            `[WebRTC] 🔄 Updating audio element with new stream for ${targetId}`
          );
          audio.srcObject = stream;
        } else {
          console.log(
            `[WebRTC] ℹ️ Audio element already exists with same stream for ${targetId}`
          );
        }
      }
    }
  };

  if (isOfferer) {
    // Check if we can create an offer (state must be stable)
    if (pc.signalingState === "closed") {
      console.warn(
        `[WebRTC] Cannot create offer, connection is closed for ${targetId}`
      );
      return;
    }

    // Check if negotiation is already in progress
    if (negotiationInProgress[targetId]) {
      console.warn(
        `[WebRTC] Negotiation already in progress for ${targetId}, skipping offer creation`
      );
      return;
    }

    // Only create offer if in stable state
    if (pc.signalingState !== "stable") {
      console.warn(
        `[WebRTC] Cannot create offer, signaling state is ${pc.signalingState} (expected stable) for ${targetId}`
      );
      return;
    }

    // Set negotiation lock
    negotiationInProgress[targetId] = true;

    try {
      // Ensure we have tracks added if localStream exists
      // This is especially important for new joiners connecting to existing participants
      if (localStream) {
        const senders = pc.getSenders();
        const localTracks = localStream.getTracks();
        const hasAllTracks = localTracks.every((track) =>
          senders.some((sender) => sender.track?.id === track.id)
        );

        if (!hasAllTracks) {
          console.log(
            `[WebRTC] Adding missing local tracks before creating offer for ${targetId}`
          );
          localTracks.forEach((track) => {
            const hasTrack = senders.some(
              (sender) => sender.track?.id === track.id
            );
            if (!hasTrack) {
              const sender = pc.addTrack(track, localStream!);
              if (sender.getParameters) {
                const params = sender.getParameters();
                if (params.encodings && params.encodings.length > 0) {
                  params.encodings[0].priority = "high";
                  params.encodings[0].networkPriority = "high";
                  sender.setParameters(params).catch((err) => {
                    console.warn(
                      `[WebRTC] Could not set ${track.kind} parameters for ${targetId}:`,
                      err
                    );
                  });
                }
              }
            }
          });
          // Wait longer to ensure tracks are fully registered and state is stable
          await new Promise((resolve) => setTimeout(resolve, 100));

          // Double-check state is still stable after adding tracks
          if (pc.signalingState !== "stable") {
            console.warn(
              `[WebRTC] Signaling state changed to ${pc.signalingState} after adding tracks, aborting offer creation for ${targetId}`
            );
            negotiationInProgress[targetId] = false;
            return;
          }
        }
      }

      // Verify we have senders before creating offer
      const sendersBeforeOffer = pc.getSenders();
      console.log(
        `[WebRTC] Creating offer for ${targetId} with ${sendersBeforeOffer.length} sender(s)`
      );
      if (localStream && sendersBeforeOffer.length === 0) {
        console.warn(
          `[WebRTC] WARNING: No senders in peer connection before creating offer for ${targetId}, even though localStream exists`
        );
      }

      const offerOptions: RTCOfferOptions = {
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
        voiceActivityDetection: false,
      };

      const offer = await pc.createOffer(offerOptions);

      // Log offer SDP to verify tracks are included
      if (offer.sdp) {
        const hasVideo = offer.sdp.includes("m=video");
        const hasAudio = offer.sdp.includes("m=audio");
        const sendRecvCount = (offer.sdp.match(/a=sendrecv/g) || []).length;
        const sendOnlyCount = (offer.sdp.match(/a=sendonly/g) || []).length;
        const recvOnlyCount = (offer.sdp.match(/a=recvonly/g) || []).length;

        // Count senders to verify what we're offering
        const senders = pc.getSenders();
        const audioSenders = senders.filter(
          (s) => s.track && s.track.kind === "audio"
        );
        const videoSenders = senders.filter(
          (s) => s.track && s.track.kind === "video"
        );

        console.log(`[WebRTC] 📤 Offer SDP for ${targetId}:`);
        console.log(
          `[WebRTC]   - SDP contains: video=${hasVideo}, audio=${hasAudio}`
        );
        console.log(
          `[WebRTC]   - SDP directions: sendrecv=${sendRecvCount}, sendonly=${sendOnlyCount}, recvonly=${recvOnlyCount}`
        );
        console.log(
          `[WebRTC]   - Local senders: ${audioSenders.length} audio, ${videoSenders.length} video`
        );
      }

      // Double-check state is still stable before setting local description
      if (pc.signalingState === "stable") {
        await pc.setLocalDescription(offer);
        const sendersCount = pc.getSenders().length;
        console.log(
          `[WebRTC] Created offer for ${targetId} with ${sendersCount} sender(s), sending offer via WebSocket`
        );

        // Ensure offer is sent
        const offerMessage = {
          type: "offer",
          target_id: targetId,
          offer: offer,
        };
        sendWebSocketMessage(offerMessage);
        console.log(`[WebRTC] Offer sent to ${targetId} via WebSocket`);

        // Clear negotiation lock after successful offer creation
        // Note: We'll clear it when we receive the answer or on error
      } else {
        console.warn(
          `[WebRTC] Cannot set local offer, signaling state changed to ${pc.signalingState} for ${targetId}`
        );
        negotiationInProgress[targetId] = false;
      }
    } catch (error) {
      negotiationInProgress[targetId] = false;
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(
        `[WebRTC] Error creating offer for ${targetId}:`,
        errorMessage
      );
      if (connectionStates[targetId]) {
        connectionStates[targetId].lastError = errorMessage;
      }
    }
  }
}

function closePeerConnection(participantId: string) {
  if (peerConnections[participantId]) {
    peerConnections[participantId].close();
    delete peerConnections[participantId];
    delete connectionStates[participantId];
    removeVideoElement(participantId);
    removeAudioElement(participantId);
    console.log(`[WebRTC] Closed peer connection for ${participantId}`);
  }
}

export function closeAllPeerConnections() {
  for (const participantId in peerConnections) {
    closePeerConnection(participantId);
  }
  if (recordingPeerConnection) {
    recordingPeerConnection.close();
    recordingPeerConnection = null;
  }
}

export function getLocalStream() {
  return localStream;
}

export function getLocalScreenStream() {
  return localScreenStream;
}

export function getMyId() {
  return myId;
}

// Helper function to get display name for a participant
// Returns "You" for current user, username for others, or fallback
export function getDisplayName(participantId: string): string {
  if (participantId === myId) {
    return "You";
  }
  return (
    participantUsernames[participantId] ||
    `Participant ${participantId.substring(0, 8)}...`
  );
}

export function stopLocalStream() {
  if (localStream) {
    // Stop all tracks to release hardware
    localStream.getTracks().forEach((track) => {
      track.stop(); // Releases camera/microphone hardware
      console.log(
        `[Stream] Stopped ${track.kind} track id=${track.id} to release hardware`
      );
    });

    // Clear local video element
    const localVideo = document.getElementById(
      "local-video"
    ) as HTMLVideoElement;
    if (localVideo) {
      localVideo.srcObject = null;
    }

    localStream = null;
    console.log(
      "[Stream] Local stream stopped and cleared - hardware released"
    );
  }
}

// Explicit function to release all media devices completely
export function releaseAllMediaDevices() {
  console.log("[Media] Releasing all media devices...");

  // Stop and clear local stream
  stopLocalStream();

  // Stop screen share if active
  if (localScreenStream) {
    localScreenStream.getTracks().forEach((track) => {
      track.stop();
      console.log(
        `[Media] Stopped screen share ${track.kind} track id=${track.id}`
      );
    });
    localScreenStream = null;
  }

  // Stop recording screen stream if active
  if (recordingScreenStream) {
    recordingScreenStream.getTracks().forEach((track) => {
      track.stop();
      console.log(
        `[Media] Stopped recording screen ${track.kind} track id=${track.id}`
      );
    });
    recordingScreenStream = null;
  }

  // Stop all cloned recording tracks
  recordingClonedTracks.forEach((track) => {
    if (track.readyState === "live") {
      track.stop();
      console.log(`[Media] Stopped cloned recording track id=${track.id}`);
    }
  });
  recordingClonedTracks = [];

  recordingMicSender = null;
  if (dummyAudioTrack) {
    dummyAudioTrack.stop();
    dummyAudioTrack = null;
  }

  console.log(
    "[Media] All media devices released - hardware is now available for other apps"
  );
}

async function handleOffer(senderId: string, offer: RTCSessionDescriptionInit) {
  let pc = peerConnections[senderId];

  // Create peer connection if it doesn't exist
  if (!pc) {
    console.log(
      `[WebRTC] Received offer from ${senderId}, creating peer connection`
    );
    await createPeerConnection(senderId, false);
    pc = peerConnections[senderId];
    if (!pc) {
      console.error(
        `[WebRTC] Failed to create peer connection for ${senderId}`
      );
      return;
    }
  }

  // Only process offer if in stable state (glare condition check)
  if (pc.signalingState !== "stable") {
    console.warn(
      `[WebRTC] Glare condition detected, ignoring incoming offer from ${senderId}. Current state: ${pc.signalingState}`
    );
    return;
  }

  try {
    // IMPORTANT: Add local tracks BEFORE setRemoteDescription
    // This ensures tracks are included in the answer we create
    if (localStream && pc) {
      const senders = pc.getSenders();
      const localTracks = localStream
        .getTracks()
        .filter((track) => track.readyState === "live");
      const hasAllTracks =
        localTracks.length > 0 &&
        localTracks.every((track) =>
          senders.some((sender) => sender.track?.id === track.id)
        );

      if (!hasAllTracks && localTracks.length > 0) {
        console.log(
          `[WebRTC] Adding ${localTracks.length} local track(s) before handling offer from ${senderId}`
        );
        localTracks.forEach((track) => {
          const hasTrack = senders.some(
            (sender) => sender.track?.id === track.id
          );
          if (!hasTrack) {
            const sender = pc.addTrack(track, localStream!);
            if (sender.getParameters) {
              const params = sender.getParameters();
              if (params.encodings && params.encodings.length > 0) {
                params.encodings[0].priority = "high";
                params.encodings[0].networkPriority = "high";
                sender.setParameters(params).catch((err) => {
                  console.warn(
                    `[WebRTC] Could not set ${track.kind} parameters for ${senderId}:`,
                    err
                  );
                });
              }
            }
          }
        });
        console.log(
          `[WebRTC] Added local tracks, now have ${
            pc.getSenders().length
          } sender(s)`
        );
        // Small delay to ensure tracks are fully registered before creating answer
        await new Promise((resolve) => setTimeout(resolve, 50));
      } else if (localTracks.length === 0) {
        console.warn(
          `[WebRTC] Warning: localStream exists but has no live tracks for ${senderId}`
        );
      }
    }

    await pc.setRemoteDescription(new RTCSessionDescription(offer));

    // Verify state transitioned to "have-remote-offer" before proceeding
    if (pc.signalingState !== "have-remote-offer") {
      console.warn(
        `[WebRTC] Unexpected signaling state after setRemoteDescription: ${pc.signalingState}, ignoring offer from ${senderId}.`
      );
      return;
    }

    // Process any queued ICE candidates
    const iceCandidates = (pc as any).iceCandidates || [];
    for (const candidate of iceCandidates) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.warn(`[WebRTC] Error adding queued ICE candidate:`, err);
      }
    }
    (pc as any).iceCandidates = [];

    // Create answer - tracks should already be added before setRemoteDescription
    const answerOptions: RTCAnswerOptions = {
      voiceActivityDetection: false,
    };

    // Verify we have senders before creating answer
    const sendersBeforeAnswer = pc.getSenders();
    console.log(
      `[WebRTC] Creating answer for ${senderId} with ${sendersBeforeAnswer.length} sender(s)`
    );
    if (localStream && sendersBeforeAnswer.length === 0) {
      console.warn(
        `[WebRTC] WARNING: No senders in peer connection before creating answer for ${senderId}, even though localStream exists`
      );
    }

    const answer = await pc.createAnswer(answerOptions);

    // Log answer SDP to verify tracks are included
    if (answer.sdp) {
      const hasVideo = answer.sdp.includes("m=video");
      const hasAudio = answer.sdp.includes("m=audio");
      const sendRecvCount = (answer.sdp.match(/a=sendrecv/g) || []).length;
      const sendOnlyCount = (answer.sdp.match(/a=sendonly/g) || []).length;
      const recvOnlyCount = (answer.sdp.match(/a=recvonly/g) || []).length;

      // Count senders and receivers to verify what we're offering/receiving
      const senders = pc.getSenders();
      const receivers = pc.getReceivers();
      const audioSenders = senders.filter(
        (s) => s.track && s.track.kind === "audio"
      );
      const videoSenders = senders.filter(
        (s) => s.track && s.track.kind === "video"
      );
      const audioReceivers = receivers.filter(
        (r) => r.track && r.track.kind === "audio"
      );
      const videoReceivers = receivers.filter(
        (r) => r.track && r.track.kind === "video"
      );

      console.log(`[WebRTC] 📥 Answer SDP for ${senderId}:`);
      console.log(
        `[WebRTC]   - SDP contains: video=${hasVideo}, audio=${hasAudio}`
      );
      console.log(
        `[WebRTC]   - SDP directions: sendrecv=${sendRecvCount}, sendonly=${sendOnlyCount}, recvonly=${recvOnlyCount}`
      );
      console.log(
        `[WebRTC]   - Local senders: ${audioSenders.length} audio, ${videoSenders.length} video`
      );
      console.log(
        `[WebRTC]   - Local receivers: ${audioReceivers.length} audio, ${videoReceivers.length} video`
      );
    }

    // Double-check state is still "have-remote-offer" before setting local description
    if (pc.signalingState === "have-remote-offer") {
      await pc.setLocalDescription(answer);
      const sendersCount = pc.getSenders().length;
      console.log(
        `[WebRTC] Created and set answer for ${senderId} with ${sendersCount} sender(s), sending answer back`
      );

      if (sendersCount === 0 && localStream) {
        console.warn(
          `[WebRTC] WARNING: Answer created with 0 senders for ${senderId} even though localStream exists. This means no tracks will be sent.`
        );
      }

      // Ensure answer is sent
      const answerMessage = {
        type: "answer",
        target_id: senderId,
        answer: answer,
      };
      sendWebSocketMessage(answerMessage);
      console.log(`[WebRTC] Answer sent to ${senderId} via WebSocket`);
    } else {
      console.warn(
        `[WebRTC] Cannot set local answer, signaling state changed to ${pc.signalingState} (expected have-remote-offer) for ${senderId}`
      );
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(
      `[WebRTC] Error handling offer from ${senderId}:`,
      errorMessage
    );
    if (connectionStates[senderId]) {
      connectionStates[senderId].lastError = errorMessage;
    }
  }
}

async function handleAnswer(
  senderId: string,
  answer: RTCSessionDescriptionInit
) {
  const pc = peerConnections[senderId];
  if (!pc) {
    console.warn(`[WebRTC] Received answer from unknown peer: ${senderId}`);
    return;
  }

  // Only set remote description if we're in "have-local-offer" state
  if (pc.signalingState === "have-local-offer") {
    try {
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
      console.log(
        `[WebRTC] Set remote answer from ${senderId}, connection established`
      );
      // Clear negotiation lock after successful answer
      negotiationInProgress[senderId] = false;
    } catch (error) {
      negotiationInProgress[senderId] = false;
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(
        `[WebRTC] Error setting remote answer from ${senderId}:`,
        errorMessage
      );
      if (connectionStates[senderId]) {
        connectionStates[senderId].lastError = errorMessage;
      }
    }
  } else {
    // Clear negotiation lock even if state is wrong
    negotiationInProgress[senderId] = false;
    console.warn(
      `[WebRTC] Cannot set remote answer, signaling state is ${pc.signalingState} (expected have-local-offer) for ${senderId}`
    );
  }
}

async function handleIceCandidate(
  senderId: string,
  candidate: RTCIceCandidateInit
) {
  const pc = peerConnections[senderId];
  if (pc && pc.remoteDescription) {
    await pc.addIceCandidate(new RTCIceCandidate(candidate));
  } else if (pc) {
    if (!(pc as any).iceCandidates) {
      (pc as any).iceCandidates = [];
    }
    (pc as any).iceCandidates.push(candidate);
  }
}
