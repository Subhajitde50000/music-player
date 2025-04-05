const wrapper = document.querySelector(".wrapper"),
  musicImg = wrapper.querySelector(".img-area img"),
  musicName = wrapper.querySelector(".song-details .name"),
  musicArtist = wrapper.querySelector(".song-details .artist"),
  playPauseBtn = wrapper.querySelector(".play-pause"),
  prevBtn = wrapper.querySelector("#prev"),
  nextBtn = wrapper.querySelector("#next"),
  mainAudio = wrapper.querySelector("#main-audio"),
  progressArea = wrapper.querySelector(".progress-area"),
  progressBar = progressArea.querySelector(".progress-bar"),
  musicList = wrapper.querySelector(".music-list"),
  moreMusicBtn = wrapper.querySelector("#more-music"),
  closeMoreMusic = musicList.querySelector("#close"),
  repeatBtn = wrapper.querySelector("#repeat-plist"),
  ulTag = wrapper.querySelector("ul");

let musicIndex = Math.floor(Math.random() * allMusic.length);
let isMusicPaused = true;
// Add variables for crossfade and preloading
let nextAudio = new Audio();
let fadeOutInterval;
let fadeInInterval;
const FADE_DURATION = 1000; // Crossfade duration in milliseconds
const PRELOAD_THRESHOLD = 15; // Seconds before song end to start preloading next song

window.addEventListener("load", () => {
  loadMusic(musicIndex);
  updatePlayingSong();
  preloadNextSong(); // Preload next song on initial load
});

// Load music details
function loadMusic(index) {
  const song = allMusic[index];
  musicName.innerText = song.name;
  musicArtist.innerText = song.artist;
  musicImg.src = `images/${song.src}.jpg`;
  mainAudio.src = `songs/${song.src}.mp3`;
  
  // Show loading indicator while audio is loading
  musicImg.classList.add('loading');
  
  // Remove loading indicator once audio is loaded
  mainAudio.addEventListener('canplay', () => {
    musicImg.classList.remove('loading');
  }, { once: true });
}

// Add function to preload next song
function preloadNextSong() {
  // Calculate the next song index based on current mode
  let nextIndex;
  if (repeatBtn.innerText === "shuffle") {
    // For shuffle mode, pick a random song that's not the current one
    do {
      nextIndex = Math.floor(Math.random() * allMusic.length);
    } while (nextIndex === musicIndex);
  } else {
    // For normal playback, get the next song in sequence
    nextIndex = (musicIndex + 1) % allMusic.length;
  }
  
  const nextSong = allMusic[nextIndex];
  
  // Clear any existing src to avoid memory leaks
  nextAudio.src = '';
  
  // Preload the next song
  if (nextSong.audioUrl) {
    nextAudio.src = nextSong.audioUrl;
  } else {
    nextAudio.src = `songs/${nextSong.src}.mp3`;
  }
  nextAudio.load();
}

// Play music with smooth fade in
function playMusic() {
  wrapper.classList.add("paused");
  playPauseBtn.querySelector("i").innerText = "pause";
  
  // Clear any existing fade intervals
  clearInterval(fadeOutInterval);
  clearInterval(fadeInInterval);
  
  // Start with low volume if not already playing
  if (isMusicPaused) {
    const originalVolume = mainAudio.volume;
    mainAudio.volume = 0.1;
    
    // Fade in the volume
    let currentVolume = 0.1;
    fadeInInterval = setInterval(() => {
      currentVolume = Math.min(currentVolume + 0.1, originalVolume);
      mainAudio.volume = currentVolume;
      
      if (currentVolume >= originalVolume) {
        clearInterval(fadeInInterval);
      }
    }, FADE_DURATION / 10);
  }
  
  mainAudio.play();
  isMusicPaused = false;
}

// Pause music with smooth fade out
function pauseMusic() {
  // Don't change UI immediately, wait for fade out
  clearInterval(fadeInInterval);
  clearInterval(fadeOutInterval);
  
  const originalVolume = mainAudio.volume;
  let currentVolume = originalVolume;
  
  fadeOutInterval = setInterval(() => {
    currentVolume = Math.max(currentVolume - 0.1, 0);
    mainAudio.volume = currentVolume;
    
    if (currentVolume <= 0) {
      clearInterval(fadeOutInterval);
      // Now update UI and actually pause
      wrapper.classList.remove("paused");
      playPauseBtn.querySelector("i").innerText = "play_arrow";
      mainAudio.pause();
      mainAudio.volume = originalVolume; // Restore original volume
      isMusicPaused = true;
    }
  }, FADE_DURATION / 10);
}

// Enhanced function to smoothly transition to previous song
function prevMusic() {
  smoothSongTransition((musicIndex - 1 + allMusic.length) % allMusic.length);
}

// Enhanced function to smoothly transition to next song
function nextMusic() {
  smoothSongTransition((musicIndex + 1) % allMusic.length);
}

// Smooth transition between songs with crossfade
function smoothSongTransition(newIndex) {
  // Store original volume
  const originalVolume = mainAudio.volume;
  
  // Clear any existing fade intervals
  clearInterval(fadeOutInterval);
  clearInterval(fadeInInterval);
  
  // Fade out current song
  let currentVolume = originalVolume;
  fadeOutInterval = setInterval(() => {
    currentVolume = Math.max(currentVolume - 0.1, 0);
    mainAudio.volume = currentVolume;
    
    if (currentVolume <= 0) {
      clearInterval(fadeOutInterval);
      
      // Switch to next song
      musicIndex = newIndex;
      loadMusic(musicIndex);
      updatePlayingSong();
      
      // Start playing immediately but with 0 volume
      mainAudio.volume = 0;
      mainAudio.play();
      wrapper.classList.add("paused");
      playPauseBtn.querySelector("i").innerText = "pause";
      
      // Fade in new song
      let newVolume = 0;
      fadeInInterval = setInterval(() => {
        newVolume = Math.min(newVolume + 0.1, originalVolume);
        mainAudio.volume = newVolume;
        
        if (newVolume >= originalVolume) {
          clearInterval(fadeInInterval);
          // Preload the next song for even smoother transitions
          preloadNextSong();
        }
      }, FADE_DURATION / 10);
    }
  }, FADE_DURATION / 10);
}

// Select a song from the list with smooth transition
function selectSong(element) {
  const selectedIndex = element.getAttribute("li-index");
  smoothSongTransition(selectedIndex - 1);
}

// Play or pause event
playPauseBtn.addEventListener("click", () => {
  const isPlaying = wrapper.classList.contains("paused");
  isPlaying ? pauseMusic() : playMusic();
  updatePlayingSong();
});

// Previous and next button events
prevBtn.addEventListener("click", prevMusic);
nextBtn.addEventListener("click", nextMusic);

// Update progress bar as music plays
mainAudio.addEventListener("timeupdate", (e) => {
  if (mainAudio.duration) {
    const progressWidth = (e.target.currentTime / mainAudio.duration) * 100;
    progressBar.style.width = `${progressWidth}%`;

    updateCurrentTime(e.target.currentTime);
    
    // Preload next song when approaching the end of current song
    if (mainAudio.duration - e.target.currentTime <= PRELOAD_THRESHOLD && !nextAudio.src) {
      preloadNextSong();
    }
  }
});

// Update current time and duration
function updateCurrentTime(currentTime) {
  const currentMin = Math.floor(currentTime / 60);
  const currentSec = Math.floor(currentTime % 60)
    .toString()
    .padStart(2, "0");
  wrapper.querySelector(".current-time").innerText = `${currentMin}:${currentSec}`;
}

mainAudio.addEventListener("loadeddata", () => {
  const totalMin = Math.floor(mainAudio.duration / 60);
  const totalSec = Math.floor(mainAudio.duration % 60)
    .toString()
    .padStart(2, "0");
  wrapper.querySelector(".max-duration").innerText = `${totalMin}:${totalSec}`;
});

// Seek through the progress bar
progressArea.addEventListener("click", (e) => {
  const progressWidth = progressArea.clientWidth;
  const clickedOffsetX = e.offsetX;
  mainAudio.currentTime = (clickedOffsetX / progressWidth) * mainAudio.duration;
  playMusic();
  updatePlayingSong();
});

// Repeat/shuffle button event
repeatBtn.addEventListener("click", () => {
  switch (repeatBtn.innerText) {
    case "repeat":
      repeatBtn.innerText = "repeat_one";
      repeatBtn.setAttribute("title", "Song looped");
      break;
    case "repeat_one":
      repeatBtn.innerText = "shuffle";
      repeatBtn.setAttribute("title", "Playback shuffled");
      break;
    case "shuffle":
      repeatBtn.innerText = "repeat";
      repeatBtn.setAttribute("title", "Playlist looped");
      break;
  }
});

// Modified handle song end event with smooth transition
mainAudio.addEventListener("ended", () => {
  switch (repeatBtn.innerText) {
    case "repeat":
      nextMusic(); // Using our enhanced smooth transition
      break;
    case "repeat_one":
      mainAudio.currentTime = 0;
      playMusic();
      break;
    case "shuffle":
      // For shuffle, get a random index and use smooth transition
      let randomIndex;
      do {
        randomIndex = Math.floor(Math.random() * allMusic.length);
      } while (randomIndex === musicIndex);
      smoothSongTransition(randomIndex);
      break;
  }
});

// Shuffle music
function shuffleMusic() {
  let randomIndex;
  do {
    randomIndex = Math.floor(Math.random() * allMusic.length);
  } while (randomIndex === musicIndex);
  musicIndex = randomIndex;
  loadMusic(musicIndex);
  playMusic();
  updatePlayingSong();
}

// Add search functionality
const searchInput = wrapper.querySelector("#search-input");
searchInput.addEventListener("input", filterSongs);

function filterSongs() {
  const searchTerm = searchInput.value.toLowerCase();
  const allListItems = ulTag.querySelectorAll("li");
  
  allListItems.forEach(item => {
    const songName = item.querySelector(".row span").textContent.toLowerCase();
    const artistName = item.querySelector(".row p").textContent.toLowerCase();
    
    if (songName.includes(searchTerm) || artistName.includes(searchTerm)) {
      item.style.display = "flex";
    } else {
      item.style.display = "none";
    }
  });
}

// Add filter functionality
const filterOptions = wrapper.querySelector("#filter-options");
filterOptions.addEventListener("change", sortSongs);

function sortSongs() {
  const filterValue = filterOptions.value;
  const allListItems = Array.from(ulTag.querySelectorAll("li"));
  
  // Sort the songs based on selected filter
  allListItems.sort((a, b) => {
    const aName = a.querySelector(".row span").textContent;
    const bName = b.querySelector(".row span").textContent;
    const aArtist = a.querySelector(".row p").textContent;
    const bArtist = b.querySelector(".row p").textContent;
    
    switch(filterValue) {
      case "name-asc":
        return aName.localeCompare(bName);
      case "name-desc":
        return bName.localeCompare(aName);
      case "artist-asc":
        return aArtist.localeCompare(bArtist);
      case "artist-desc":
        return bArtist.localeCompare(aArtist);
      default:
        // Default order - sort by index
        return parseInt(a.getAttribute("li-index")) - parseInt(b.getAttribute("li-index"));
    }
  });
  
  // Clear and re-append sorted items
  ulTag.innerHTML = '';
  allListItems.forEach(item => {
    ulTag.appendChild(item);
  });
  
  // Maintain search filtering
  if (searchInput.value.trim() !== '') {
    filterSongs();
  }
  
  // Update playing indicator
  updatePlayingSong();
}

// Modify the existing filterSongs function to work with sorted lists
function filterSongs() {
  const searchTerm = searchInput.value.toLowerCase();
  const allListItems = ulTag.querySelectorAll("li");
  
  allListItems.forEach(item => {
    const songName = item.querySelector(".row span").textContent.toLowerCase();
    const artistName = item.querySelector(".row p").textContent.toLowerCase();
    
    if (songName.includes(searchTerm) || artistName.includes(searchTerm)) {
      item.style.display = "flex";
    } else {
      item.style.display = "none";
    }
  });
}

// Call initial sort to ensure correct order
window.addEventListener("load", () => {
  loadMusic(musicIndex);
  updatePlayingSong();
  sortSongs(); // Initialize with default order
});

// Enhanced volume control with smooth adjustments
const volumeIcon = wrapper.querySelector("#volume-icon");
const volumeBar = wrapper.querySelector(".volume-bar");
const volumeProgress = wrapper.querySelector(".volume-progress");

// Initialize volume (default to 100%)
let currentVolume = 1;
mainAudio.volume = currentVolume;

// Update volume progress bar
function updateVolumeProgress() {
  volumeProgress.style.width = `${currentVolume * 100}%`;
  
  // Update volume icon based on volume level
  if (currentVolume === 0) {
    volumeIcon.innerText = "volume_off";
  } else if (currentVolume < 0.4) {
    volumeIcon.innerText = "volume_down";
  } else {
    volumeIcon.innerText = "volume_up";
  }
}

// Add smooth dragging for volume control
let isDraggingVolume = false;

// Set up volume drag events
volumeBar.addEventListener("mousedown", (e) => {
  isDraggingVolume = true;
  setVolumeFromPosition(e);
});

document.addEventListener("mousemove", (e) => {
  if (isDraggingVolume) {
    setVolumeFromPosition(e);
  }
});

document.addEventListener("mouseup", () => {
  isDraggingVolume = false;
});

// Handle touch events for mobile
volumeBar.addEventListener("touchstart", (e) => {
  isDraggingVolume = true;
  setVolumeFromTouchPosition(e);
});

document.addEventListener("touchmove", (e) => {
  if (isDraggingVolume) {
    setVolumeFromTouchPosition(e);
    e.preventDefault(); // Prevent scrolling while adjusting volume
  }
});

document.addEventListener("touchend", () => {
  isDraggingVolume = false;
});

// Set volume based on mouse position
function setVolumeFromPosition(e) {
  const rect = volumeBar.getBoundingClientRect();
  let clickPosition = (e.clientX - rect.left) / rect.width;
  
  // Ensure volume is between 0 and 1
  clickPosition = Math.max(0, Math.min(1, clickPosition));
  
  // Apply the volume
  currentVolume = clickPosition;
  mainAudio.volume = currentVolume;
  updateVolumeProgress();
}

// Set volume based on touch position
function setVolumeFromTouchPosition(e) {
  if (e.touches && e.touches[0]) {
    const rect = volumeBar.getBoundingClientRect();
    let touchPosition = (e.touches[0].clientX - rect.left) / rect.width;
    
    // Ensure volume is between 0 and 1
    touchPosition = Math.max(0, Math.min(1, touchPosition));
    
    // Apply the volume
    currentVolume = touchPosition;
    mainAudio.volume = currentVolume;
    updateVolumeProgress();
  }
}

// Toggle mute when clicking on volume icon
volumeIcon.addEventListener("click", () => {
  if (mainAudio.volume > 0) {
    // Store the current volume before muting
    mainAudio.dataset.prevVolume = mainAudio.volume;
    mainAudio.volume = 0;
    currentVolume = 0;
    volumeProgress.style.width = "0%";
    volumeIcon.innerText = "volume_off";
  } else {
    // Restore to previous volume
    currentVolume = parseFloat(mainAudio.dataset.prevVolume || 1);
    mainAudio.volume = currentVolume;
    updateVolumeProgress();
  }
});

// Show/hide music list
moreMusicBtn.addEventListener("click", () => {
  musicList.classList.toggle("show");
});

closeMoreMusic.addEventListener("click", () => {
  musicList.classList.remove("show");
});

// Generate song list dynamically
allMusic.forEach((song, index) => {
  const liTag = `
    <li li-index="${index + 1}">
      <div class="row">
        <span>${song.name}</span>
        <p>${song.artist}</p>
      </div>
      <span id="${song.src}" class="audio-duration">3:40</span>
      <audio class="${song.src}" src="songs/${song.src}.mp3"></audio>
    </li>`;
  ulTag.insertAdjacentHTML("beforeend", liTag);

  const liAudioTag = ulTag.querySelector(`.${song.src}`);
  liAudioTag.addEventListener("loadeddata", () => {
    const duration = liAudioTag.duration;
    const totalMin = Math.floor(duration / 60);
    const totalSec = Math.floor(duration % 60)
      .toString()
      .padStart(2, "0");
    const durationTag = ulTag.querySelector(`#${song.src}`);
    durationTag.innerText = `${totalMin}:${totalSec}`;
    durationTag.setAttribute("t-duration", `${totalMin}:${totalSec}`);
  });

  // Add click event listener to each list item
  const liItem = ulTag.querySelector(`li[li-index="${index + 1}"]`);
  liItem.addEventListener("click", () => selectSong(liItem));
});

// Update the song that is currently playing in the list
function updatePlayingSong() {
  const allLiTags = ulTag.querySelectorAll("li");

  // Remove 'playing' class from all list items
  allLiTags.forEach((li) => {
    li.classList.remove("playing");
    const audioTag = li.querySelector(".audio-duration");
    const songDuration = audioTag.getAttribute("t-duration");
    audioTag.innerText = songDuration; // Reset to original duration
  });

  // Add 'playing' class to the current song
  const currentLi = ulTag.querySelector(`li[li-index="${musicIndex + 1}"]`);
  currentLi.classList.add("playing");

  // Update the duration text to "Playing"
  const currentAudioTag = currentLi.querySelector(".audio-duration");
  currentAudioTag.innerText = "Playing";
}

// Dark Mode Toggle
const darkModeToggle = wrapper.querySelector("#dark-mode-toggle");
const body = document.body;

// Check for saved theme preference or use system preference
const prefersDarkScheme = window.matchMedia("(prefers-color-scheme: dark)");
const currentTheme = localStorage.getItem("theme");

// Set initial theme based on saved preference or system preference
if (currentTheme === "dark" || (!currentTheme && prefersDarkScheme.matches)) {
  body.classList.add("dark-mode");
  darkModeToggle.innerText = "brightness_7"; // Sun icon
} else {
  body.classList.remove("dark-mode");
  darkModeToggle.innerText = "brightness_4"; // Moon icon
}

// Toggle dark mode on button click
darkModeToggle.addEventListener("click", () => {
  // Toggle dark mode class
  body.classList.toggle("dark-mode");
  
  // Update button icon
  if (body.classList.contains("dark-mode")) {
    darkModeToggle.innerText = "brightness_7"; // Sun icon
    localStorage.setItem("theme", "dark");
  } else {
    darkModeToggle.innerText = "brightness_4"; // Moon icon
    localStorage.setItem("theme", "light");
  }
});

// Handle file uploads
const uploadSongInput = document.querySelector("#upload-song");
const userUploadedSongs = []; // Array to store user uploaded songs

uploadSongInput.addEventListener("change", handleFileUpload);

function handleFileUpload(e) {
  const files = e.target.files;
  if (!files.length) return;
  
  // Process each uploaded file
  Array.from(files).forEach(file => {
    // Only process audio files
    if (!file.type.includes('audio')) {
      alert(`File "${file.name}" is not an audio file.`);
      return;
    }
    
    // Create object URL for the file
    const audioUrl = URL.createObjectURL(file);
    
    // Extract file name without extension as song name
    let songName = file.name.replace(/\.[^/.]+$/, "");
    
    // Create temporary audio element to get duration
    const audio = new Audio(audioUrl);
    
    audio.addEventListener('loadedmetadata', () => {
      // Create a new song object
      const newSong = {
        name: songName,
        artist: "User Upload", // Default artist name
        src: `user_${Date.now()}`, // Unique identifier
        audioUrl: audioUrl // Store the object URL
      };
      
      // Add to user uploaded songs array
      userUploadedSongs.push(newSong);
      
      // Add to the main music list
      allMusic.push(newSong);
      
      // Add to the UI
      addSongToUI(newSong, allMusic.length);
      
      // Refresh the list and apply current filters
      updatePlayingSong();
      if (searchInput.value.trim() !== '') {
        filterSongs();
      }
      sortSongs();
    });
  });
  
  // Reset the file input for future uploads
  e.target.value = '';
}

// Function to add a new song to the UI
function addSongToUI(song, index) {
  const liTag = `
    <li li-index="${index}">
      <div class="row">
        <span>${song.name}</span>
        <p>${song.artist}</p>
      </div>
      <span id="${song.src}" class="audio-duration">Loading...</span>
    </li>`;
  ulTag.insertAdjacentHTML("beforeend", liTag);
  
  const liItem = ulTag.querySelector(`li[li-index="${index}"]`);
  liItem.addEventListener("click", () => selectSong(liItem));
  
  // Get duration for user uploaded songs
  if (song.audioUrl) {
    const tempAudio = new Audio(song.audioUrl);
    tempAudio.addEventListener("loadeddata", () => {
      const duration = tempAudio.duration;
      const totalMin = Math.floor(duration / 60);
      const totalSec = Math.floor(duration % 60).toString().padStart(2, "0");
      const durationTag = liItem.querySelector(".audio-duration");
      durationTag.innerText = `${totalMin}:${totalSec}`;
      durationTag.setAttribute("t-duration", `${totalMin}:${totalSec}`);
    });
  }
}

// Update the loadMusic function to handle user uploaded songs
const originalLoadMusic = loadMusic;
function loadMusic(index) {
  const song = allMusic[index];
  
  musicName.innerText = song.name;
  musicArtist.innerText = song.artist;
  
  // Use default image for user uploaded songs
  if (song.audioUrl) {
    musicImg.src = 'images/default.jpg'; // Create a default.jpg image in your images folder
    mainAudio.src = song.audioUrl;
  } else {
    // Use the original logic for pre-loaded songs
    musicImg.src = `images/${song.src}.jpg`;
    mainAudio.src = `songs/${song.src}.mp3`;
  }
}

// Update the generateSongList function if you have one, to account for user uploads
// If you don't have this function, you can ignore this part

// When the page loads, ensure there's a default image available
window.addEventListener("load", () => {
  // ... existing code ...
  
  // Create a default image if one doesn't exist yet
  const defaultImg = new Image();
  defaultImg.src = 'images/default.jpg';
  defaultImg.onerror = () => {
    console.warn('Default image not found. User uploaded songs will not have album art.');
  };
});

// Add these variables after other const declarations at the top
const skipBackward = wrapper.querySelector("#skip-backward"),
      skipForward = wrapper.querySelector("#skip-forward");

// Add a constant for the skip time amount (5 seconds)
const SKIP_TIME = 5;

// Add event listeners for skip buttons
skipBackward.addEventListener("click", () => {
  // Skip backward 5 seconds with boundary check
  if (mainAudio.currentTime <= SKIP_TIME) {
    mainAudio.currentTime = 0;
  } else {
    mainAudio.currentTime -= SKIP_TIME;
  }
  
  // Ensure the progress bar updates immediately
  const progressWidth = (mainAudio.currentTime / mainAudio.duration) * 100;
  progressBar.style.width = `${progressWidth}%`;
  
  // Update current time display
  updateCurrentTime(mainAudio.currentTime);
  
  // If music was paused, keep it paused
  if (isMusicPaused) {
    // Don't start playing, just update display
  } else {
    // Music was already playing, ensure it continues
    playMusic();
  }
});

skipForward.addEventListener("click", () => {
  // Skip forward 5 seconds with boundary check
  if (mainAudio.currentTime + SKIP_TIME >= mainAudio.duration) {
    // If skipping would exceed song duration, go to the end
    mainAudio.currentTime = mainAudio.duration - 0.1;
  } else {
    mainAudio.currentTime += SKIP_TIME;
  }
  
  // Ensure the progress bar updates immediately
  const progressWidth = (mainAudio.currentTime / mainAudio.duration) * 100;
  progressBar.style.width = `${progressWidth}%`;
  
  // Update current time display
  updateCurrentTime(mainAudio.currentTime);
  
  // If music was paused, keep it paused
  if (isMusicPaused) {
    // Don't start playing, just update display
  } else {
    // Music was already playing, ensure it continues
    playMusic();
  }
});
