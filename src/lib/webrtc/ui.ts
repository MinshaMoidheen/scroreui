// UI utility functions for managing video/audio elements

// Create a placeholder video element (without stream) - like Google Meet
export function addPlaceholderVideoElement(
  participantId: string,
  participantName?: string,
  retryCount: number = 0
) {
  const container = document.getElementById("videos-container");
  if (!container) {
    // Retry with exponential backoff if container doesn't exist yet
    const maxRetries = 5;
    if (retryCount < maxRetries) {
      const delay = Math.min(100 * Math.pow(2, retryCount), 1000); // Max 1 second
      console.log(
        `[Video] videos-container not found, retrying in ${delay}ms (attempt ${
          retryCount + 1
        }/${maxRetries})`
      );
      setTimeout(() => {
        // Use requestAnimationFrame for better timing with React rendering
        requestAnimationFrame(() => {
          addPlaceholderVideoElement(
            participantId,
            participantName,
            retryCount + 1
          );
        });
      }, delay);
      return;
    } else {
      console.warn(
        `[Video] videos-container not found after ${maxRetries} retries, giving up`
      );
      return;
    }
  }

  // Check if element already exists
  const existing = document.getElementById(`video-wrapper-${participantId}`);
  if (existing) {
    console.log(
      `[Video] Placeholder video element already exists for ${participantId}`
    );
    return;
  }

  // Determine display name: use participantName if provided, otherwise fallback
  const displayName =
    participantName || `Participant ${participantId.substring(0, 8)}...`;

  // Create Card-like structure to match the local video styling
  const gridItem = document.createElement("div");
  gridItem.id = `video-wrapper-${participantId}`;
  gridItem.className =
    "bg-gray-800 border border-gray-700 rounded-lg overflow-hidden";

  // Create inner structure matching the Card component
  const cardHeader = document.createElement("div");
  cardHeader.className = "pb-2 px-4 pt-4";
  const cardTitle = document.createElement("h3");
  cardTitle.className = "text-sm font-semibold text-white";
  cardTitle.textContent = displayName;
  cardHeader.appendChild(cardTitle);

  const cardContent = document.createElement("div");
  cardContent.className = "p-0";
  const videoContainer = document.createElement("div");
  videoContainer.className =
    "relative w-full aspect-video bg-gray-900 rounded-lg overflow-hidden";

  // Create placeholder content (camera off state)
  const placeholder = document.createElement("div");
  placeholder.className =
    "absolute inset-0 flex flex-col items-center justify-center bg-gray-800";
  placeholder.id = `placeholder-${participantId}`;

  // Create a simple avatar/icon placeholder
  // Use first character of display name (or "Y" for "You")
  const avatar = document.createElement("div");
  avatar.className =
    "w-16 h-16 rounded-full bg-gray-700 flex items-center justify-center text-gray-400 text-2xl font-semibold mb-2";
  const avatarText =
    displayName === "You" ? "Y" : displayName.charAt(0).toUpperCase();
  avatar.textContent = avatarText;
  placeholder.appendChild(avatar);

  // Create video element (hidden until stream is available)
  const video = document.createElement("video");
  video.id = `video-${participantId}`;
  video.autoplay = true;
  video.playsInline = true;
  video.className = "w-full h-full object-cover hidden";
  video.muted = false;

  videoContainer.appendChild(placeholder);
  videoContainer.appendChild(video);
  cardContent.appendChild(videoContainer);

  gridItem.appendChild(cardHeader);
  gridItem.appendChild(cardContent);

  container.appendChild(gridItem);

  console.log(
    `[Video] Added placeholder video element for participant ${participantId}`
  );
}

export function addVideoElement(
  participantId: string,
  stream: MediaStream,
  participantName?: string
) {
  const container = document.getElementById("videos-container");
  if (!container) {
    console.warn("[Video] videos-container not found in DOM");
    return;
  }

  // Check if placeholder already exists
  const existingWrapper = document.getElementById(
    `video-wrapper-${participantId}`
  );
  const existingVideo = document.getElementById(
    `video-${participantId}`
  ) as HTMLVideoElement;
  const placeholder = document.getElementById(`placeholder-${participantId}`);

  if (existingVideo) {
    // Update existing video element with stream
    existingVideo.srcObject = stream;
    existingVideo.classList.remove("hidden");
    if (placeholder) {
      placeholder.style.display = "none";
    }
    // Update title if participantName is provided
    if (participantName) {
      const cardTitle = existingWrapper?.querySelector("h3");
      if (cardTitle) {
        cardTitle.textContent = participantName;
      }
    }
    console.log(
      `[Video] Updated existing video element for participant ${participantId} with stream`
    );
    return;
  }

  // If no existing element, create new one
  if (existingWrapper) {
    existingWrapper.remove();
  }

  // Determine display name: use participantName if provided, otherwise fallback
  const displayName =
    participantName || `Participant ${participantId.substring(0, 8)}...`;

  // Create Card-like structure to match the local video styling
  // This will be a grid item (since container has display: contents)
  const gridItem = document.createElement("div");
  gridItem.id = `video-wrapper-${participantId}`;
  gridItem.className =
    "bg-gray-800 border border-gray-700 rounded-lg overflow-hidden";

  // Create inner structure matching the Card component
  const cardHeader = document.createElement("div");
  cardHeader.className = "pb-2 px-4 pt-4";
  const cardTitle = document.createElement("h3");
  cardTitle.className = "text-sm font-semibold text-white";
  cardTitle.textContent = displayName;
  cardHeader.appendChild(cardTitle);

  const cardContent = document.createElement("div");
  cardContent.className = "p-0";
  const videoContainer = document.createElement("div");
  videoContainer.className =
    "relative w-full aspect-video bg-gray-900 rounded-lg overflow-hidden";

  // Create placeholder content (camera off state) - will be shown when video is disabled
  const newPlaceholder = document.createElement("div");
  newPlaceholder.className =
    "absolute inset-0 flex flex-col items-center justify-center bg-gray-800";
  newPlaceholder.id = `placeholder-${participantId}`;
  newPlaceholder.style.display = "none"; // Hidden initially since we have video

  // Create a simple avatar/icon placeholder
  // Use first character of display name (or "Y" for "You")
  const avatar = document.createElement("div");
  avatar.className =
    "w-16 h-16 rounded-full bg-gray-700 flex items-center justify-center text-gray-400 text-2xl font-semibold mb-2";
  const avatarText =
    displayName === "You" ? "Y" : displayName.charAt(0).toUpperCase();
  avatar.textContent = avatarText;
  newPlaceholder.appendChild(avatar);

  const video = document.createElement("video");
  video.id = `video-${participantId}`;
  video.srcObject = stream;
  video.autoplay = true;
  video.playsInline = true;
  video.className = "w-full h-full object-cover";
  video.muted = false; // Allow audio from remote participants

  // Add error handler
  video.onerror = (e) => {
    console.error(`[Video] Error loading video for ${participantId}:`, e);
  };

  // Add loadedmetadata handler to ensure video plays
  video.onloadedmetadata = () => {
    console.log(`[Video] Video metadata loaded for ${participantId}`);
    video.play().catch((err) => {
      console.error(`[Video] Error playing video for ${participantId}:`, err);
    });
  };

  videoContainer.appendChild(newPlaceholder);
  videoContainer.appendChild(video);
  cardContent.appendChild(videoContainer);

  gridItem.appendChild(cardHeader);
  gridItem.appendChild(cardContent);

  container.appendChild(gridItem);

  console.log(`[Video] Added video element for participant ${participantId}`);
}

export function removeVideoElement(participantId: string) {
  const videoWrapper = document.getElementById(
    `video-wrapper-${participantId}`
  );
  if (videoWrapper) {
    videoWrapper.remove();
  }
}

export function addAudioElement(participantId: string, stream: MediaStream) {
  // Remove existing audio element if present
  removeAudioElement(participantId);

  const audioTracks = stream.getAudioTracks();
  console.log(
    `[Audio] Creating audio element for participant ${participantId} with ${audioTracks.length} audio track(s)`
  );

  // Log details about each audio track
  audioTracks.forEach((track, index) => {
    console.log(
      `[Audio] Track ${index} from ${participantId}: id=${track.id}, enabled=${track.enabled}, readyState=${track.readyState}, muted=${track.muted}, label="${track.label}"`
    );
  });

  const audio = document.createElement("audio");
  audio.id = `audio-${participantId}`;
  audio.srcObject = stream;
  audio.autoplay = true;
  audio.volume = 1.0;
  // Note: playsInline is a video element property, not audio

  // Add event listeners to track audio playback
  audio.addEventListener("loadedmetadata", () => {
    console.log(
      `[Audio] ✅ Audio metadata loaded for ${participantId} - ready to play`
    );
  });

  audio.addEventListener("canplay", () => {
    console.log(
      `[Audio] ✅ Audio can play for ${participantId} - audio data is available`
    );
  });

  audio.addEventListener("playing", () => {
    console.log(
      `[Audio] 🔊 Audio is now PLAYING for ${participantId} - user should hear audio`
    );
  });

  audio.addEventListener("pause", () => {
    console.log(`[Audio] ⏸️ Audio paused for ${participantId}`);
  });

  audio.addEventListener("ended", () => {
    console.log(`[Audio] ⏹️ Audio ended for ${participantId}`);
  });

  audio.addEventListener("error", (e) => {
    console.error(
      `[Audio] ❌ Error playing audio for ${participantId}:`,
      e,
      audio.error
    );
  });

  audio.addEventListener("volumechange", () => {
    console.log(
      `[Audio] Volume changed for ${participantId}: volume=${audio.volume}, muted=${audio.muted}`
    );
  });

  // Track when audio actually starts playing
  audio.addEventListener("play", () => {
    console.log(
      `[Audio] ▶️ Play event fired for ${participantId} - attempting to play audio`
    );
  });

  document.body.appendChild(audio);

  // Log initial state
  console.log(
    `[Audio] ✅ Audio element created and added to DOM for ${participantId}. Autoplay: ${audio.autoplay}, Volume: ${audio.volume}`
  );

  // Try to play and log result
  audio
    .play()
    .then(() => {
      console.log(
        `[Audio] 🔊 Successfully started playing audio for ${participantId}`
      );
    })
    .catch((error) => {
      console.warn(
        `[Audio] ⚠️ Could not autoplay audio for ${participantId}:`,
        error
      );
    });
}

export function removeAudioElement(participantId: string) {
  const audio = document.getElementById(
    `audio-${participantId}`
  ) as HTMLAudioElement;
  if (audio) {
    audio.pause();
    audio.srcObject = null;
    audio.remove();
  }
}

export function addScreenShare(
  stream: MediaStream,
  participantId: string,
  participantName?: string
) {
  const container = document.getElementById("videos-container");
  if (!container) {
    console.warn("[Screen Share] videos-container not found in DOM");
    return;
  }

  // Check if screen share element already exists
  const existingScreenShare = document.getElementById(
    `screen-wrapper-${participantId}`
  );
  if (existingScreenShare) {
    // Update existing screen share
    const video = document.getElementById(
      `screen-${participantId}`
    ) as HTMLVideoElement;
    if (video) {
      video.srcObject = stream;
      // Update title if participantName is provided
      if (participantName) {
        const cardTitle = existingScreenShare.querySelector("h3");
        if (cardTitle) {
          cardTitle.textContent = `Screen Share - ${participantName}`;
        }
      }
      console.log(
        `[Screen Share] Updated existing screen share for ${participantId}`
      );
      return;
    }
  }

  // Determine display name: use participantName if provided, otherwise fallback
  const displayName =
    participantName || `Participant ${participantId.substring(0, 8)}...`;

  // Create Card-like structure matching participant video styling
  const gridItem = document.createElement("div");
  gridItem.id = `screen-wrapper-${participantId}`;
  gridItem.className =
    "bg-gray-800 border border-gray-700 rounded-lg overflow-hidden";

  // Create inner structure matching the Card component
  const cardHeader = document.createElement("div");
  cardHeader.className = "pb-2 px-4 pt-4";
  const cardTitle = document.createElement("h3");
  cardTitle.className = "text-sm font-semibold text-white";
  cardTitle.textContent = `Screen Share - ${displayName}`;
  cardHeader.appendChild(cardTitle);

  const cardContent = document.createElement("div");
  cardContent.className = "p-0";
  const videoContainer = document.createElement("div");
  videoContainer.className =
    "relative w-full aspect-video bg-gray-900 rounded-lg overflow-hidden";

  const video = document.createElement("video");
  video.id = `screen-${participantId}`;
  video.srcObject = stream;
  video.autoplay = true;
  video.playsInline = true;
  video.className = "w-full h-full object-contain"; // object-contain for screen share to show full screen
  video.muted = false;

  // Add error handler
  video.onerror = (e) => {
    console.error(
      `[Screen Share] Error loading screen share for ${participantId}:`,
      e
    );
  };

  // Add loadedmetadata handler to ensure video plays
  video.onloadedmetadata = () => {
    console.log(
      `[Screen Share] Screen share metadata loaded for ${participantId}`
    );
    video.play().catch((err) => {
      console.error(
        `[Screen Share] Error playing screen share for ${participantId}:`,
        err
      );
    });
  };

  videoContainer.appendChild(video);
  cardContent.appendChild(videoContainer);

  gridItem.appendChild(cardHeader);
  gridItem.appendChild(cardContent);

  container.appendChild(gridItem);

  console.log(
    `[Screen Share] Added screen share tab for participant ${participantId}`
  );
}

export function removeScreenShare(participantId?: string) {
  // If participantId is provided, remove that specific screen share
  if (participantId) {
    const screenShareWrapper = document.getElementById(
      `screen-wrapper-${participantId}`
    );
    if (screenShareWrapper) {
      const video = document.getElementById(
        `screen-${participantId}`
      ) as HTMLVideoElement;
      if (video) {
        video.pause();
        video.srcObject = null;
      }
      screenShareWrapper.remove();
      console.log(`[Screen Share] Removed screen share for ${participantId}`);
      return;
    }
  }

  // Otherwise, remove all screen shares (backward compatibility)
  const container = document.getElementById("videos-container");
  if (container) {
    const screenShares = container.querySelectorAll('[id^="screen-wrapper-"]');
    screenShares.forEach((element) => {
      const videoId = element.id.replace("screen-wrapper-", "screen-");
      const video = document.getElementById(videoId) as HTMLVideoElement;
      if (video) {
        video.pause();
        video.srcObject = null;
      }
      element.remove();
    });
    console.log(
      `[Screen Share] Removed ${screenShares.length} screen share(s)`
    );
  }
}

export function setLocalStream(stream: MediaStream) {
  const localVideo = document.getElementById("local-video") as HTMLVideoElement;
  if (localVideo) {
    localVideo.srcObject = stream;
  }
}

export function showHostControls() {
  const hostControls = document.getElementById("host-controls");
  if (hostControls) {
    hostControls.style.display = "block";
  }
}

// Update the title of an existing video element
export function updateVideoElementTitle(
  participantId: string,
  displayName: string
) {
  const videoWrapper = document.getElementById(
    `video-wrapper-${participantId}`
  );
  if (videoWrapper) {
    const cardTitle = videoWrapper.querySelector("h3");
    if (cardTitle) {
      cardTitle.textContent = displayName;
    }
    // Also update avatar if placeholder exists
    const placeholder = document.getElementById(`placeholder-${participantId}`);
    if (placeholder) {
      const avatar = placeholder.querySelector("div");
      if (avatar) {
        const avatarText =
          displayName === "You" ? "Y" : displayName.charAt(0).toUpperCase();
        avatar.textContent = avatarText;
      }
    }
  }

  // Also update screen share title if it exists
  const screenWrapper = document.getElementById(
    `screen-wrapper-${participantId}`
  );
  if (screenWrapper) {
    const cardTitle = screenWrapper.querySelector("h3");
    if (cardTitle) {
      cardTitle.textContent = `Screen Share - ${displayName}`;
    }
  }
}
