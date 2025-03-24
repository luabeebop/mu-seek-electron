const { ipcRenderer } = require('electron');
const path = require('path');


// DOM Elements
const volumeSlider = document.getElementById('volume-slider');
const volumeIcon = document.getElementById('volume-icon');
const audioPlayer = document.getElementById('audio-player');
const playButton = document.getElementById('play-button');
const prevButton = document.getElementById('prev-button');
const nextButton = document.getElementById('next-button');
const menuButton = document.querySelector('.menu-button');
const daggers = document.querySelectorAll('.daggers-container i')
const progressBar = document.getElementById('progress');
const progressContainer = document.querySelector('.progress-bar');
const currentTimeDisplay = document.getElementById('current-time');
const totalTimeDisplay = document.getElementById('total-time');
const albumTitle = document.querySelector('.album-title');
const trackArtist = document.querySelector('.track-artist');
const albumDetails = document.querySelector('.album-details');
const playlistElement = document.getElementById('playlist');
const menuOverlay = document.getElementById('menu-overlay');
const closeMenuBtn = document.getElementById('close-menu');
const loadFolderBtn = document.getElementById('load-folder-btn');
const toggleShuffleBtn = document.getElementById('toggle-shuffle-btn');
const toggleRepeatBtn = document.getElementById('toggle-repeat-btn');
const exitButton = document.getElementById('exit-button');
const minimizeButton = document.getElementById('minimize-button');

// Music player state
let musicFiles = [];
let currentTrackIndex = 0;
let isPlaying = false;
let isShuffle = false;
let isRepeat = false;

// Initialize audio player
audioPlayer.addEventListener('timeupdate', updateProgress);
audioPlayer.addEventListener('ended', handleTrackEnd);
audioPlayer.addEventListener('loadedmetadata', updateTotalTime);

// Window controls
exitButton.addEventListener('click', () => {
  ipcRenderer.send('exit-app');
});

minimizeButton.addEventListener('click', () => {
  ipcRenderer.send('minimize-app');
});

// Control buttons
playButton.addEventListener('click', togglePlay);
prevButton.addEventListener('click', playPreviousTrack);
nextButton.addEventListener('click', playNextTrack);

// Menu controls
menuButton.addEventListener('click', () => {
  menuOverlay.classList.remove('hidden');
});

closeMenuBtn.addEventListener('click', () => {
  menuOverlay.classList.add('hidden');
});

loadFolderBtn.addEventListener('click', async () => {
  const result = await ipcRenderer.invoke('open-folder-dialog');
  
  if (result.success && result.files.length > 0) {
    musicFiles = result.files;
    currentTrackIndex = 0;
    updatePlaylist();
    loadTrack(currentTrackIndex);
    togglePlay();
    albumDetails.textContent = `${musicFiles.length} tracks loaded from folder`;
    menuOverlay.classList.add('hidden');
  } else if (result.success && result.files.length === 0) {
    albumDetails.textContent = 'No audio files found in the selected folder';
  }
});

toggleShuffleBtn.addEventListener('click', () => {
  isShuffle = !isShuffle;
  toggleShuffleBtn.innerHTML = isShuffle 
    ? '<i class="fas fa-random"></i> Shuffle: On' 
    : '<i class="fas fa-random"></i> Shuffle: Off';
});

toggleRepeatBtn.addEventListener('click', () => {
  isRepeat = !isRepeat;
  toggleRepeatBtn.innerHTML = isRepeat 
    ? '<i class="fas fa-redo"></i> Repeat: On' 
    : '<i class="fas fa-redo"></i> Repeat: Off';
});

volumeSlider.addEventListener('input', () => {
    const volume = volumeSlider.value;
    audioPlayer.volume = volume;
    updateVolumeIcon(volume);
  });
  
  volumeIcon.addEventListener('click', toggleMute);

// Progress bar interaction
progressContainer.addEventListener('click', (e) => {
  const width = progressContainer.clientWidth;
  const clickPosition = e.offsetX;
  const duration = audioPlayer.duration;
  
  audioPlayer.currentTime = (clickPosition / width) * duration;
});

// Daggers (rating) functionality
daggers.forEach((dagger, index) => {
    dagger.addEventListener('click', () => {
      // Set rating
      for (let i = 0; i < daggers.length; i++) {
        if (i <= index) {
          daggers[i].classList.add('dagger-filled');
          daggers[i].classList.remove('dagger-empty');
        } else {
          daggers[i].classList.add('dagger-empty');
          daggers[i].classList.remove('dagger-filled');
        }
      }
    });
  });

// Player functions
function togglePlay() {
  if (!musicFiles.length) {
    albumTitle.textContent = 'No music loaded';
    trackArtist.textContent = 'Please load a folder first';
    return;
  }
  
  if (audioPlayer.paused) {
    audioPlayer.play();
    playButton.innerHTML = '<i class="fas fa-pause"></i>';
    isPlaying = true;
  } else {
    audioPlayer.pause();
    playButton.innerHTML = '<i class="fas fa-play"></i>';
    isPlaying = false;
  }
}

function toggleMute() {
    if (audioPlayer.volume > 0) {
      audioPlayer.dataset.prevVolume = audioPlayer.volume;
      audioPlayer.volume = 0;
      volumeSlider.value = 0;
      volumeIcon.className = 'fas fa-volume-mute';
    } else {
      const prevVolume = audioPlayer.dataset.prevVolume || 0.7;
      audioPlayer.volume = prevVolume;
      volumeSlider.value = prevVolume;
      updateVolumeIcon(prevVolume);
    }
  }

  function updateVolumeIcon(volume) {
    if (volume > 0.5) {
      volumeIcon.className = 'fas fa-volume-up';
    } else if (volume > 0) {
      volumeIcon.className = 'fas fa-volume-down';
    } else {
      volumeIcon.className = 'fas fa-volume-mute';
    }
  }

function loadTrack(index) {
  if (!musicFiles.length) return;
  
  const track = musicFiles[index];
  audioPlayer.src = track.path;
  
  // Extract file name without extension
  const fileName = path.basename(track.name, path.extname(track.name));
  albumTitle.textContent = fileName;
  
  // Could extract artist from metadata in a more complete app
  trackArtist.textContent = 'Now Playing';
  
  // Update playlist highlighting
  const playlistItems = document.querySelectorAll('#playlist li');
  playlistItems.forEach((item, i) => {
    if (i === index) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });
  
  // Reset progress
  progressBar.style.width = '0%';
  currentTimeDisplay.textContent = '0:00';
}

function playNextTrack() {
  if (!musicFiles.length) return;
  
  if (isShuffle) {
    let randomIndex;
    do {
      randomIndex = Math.floor(Math.random() * musicFiles.length);
    } while (randomIndex === currentTrackIndex && musicFiles.length > 1);
    
    currentTrackIndex = randomIndex;
  } else {
    currentTrackIndex = (currentTrackIndex + 1) % musicFiles.length;
  }
  
  loadTrack(currentTrackIndex);
  
  if (isPlaying) {
    audioPlayer.play();
  }
}

function playPreviousTrack() {
  if (!musicFiles.length) return;
  
  currentTrackIndex = (currentTrackIndex - 1 + musicFiles.length) % musicFiles.length;
  loadTrack(currentTrackIndex);
  
  if (isPlaying) {
    audioPlayer.play();
  }
}

function handleTrackEnd() {
  if (isRepeat) {
    audioPlayer.currentTime = 0;
    audioPlayer.play();
  } else {
    playNextTrack();
  }
}

function updateProgress() {
  const { currentTime, duration } = audioPlayer;
  if (duration) {
    // Update progress bar
    const progressPercent = (currentTime / duration) * 100;
    progressBar.style.width = `${progressPercent}%`;
    
    // Update time display
    currentTimeDisplay.textContent = formatTime(currentTime);
  }
}

function updateTotalTime() {
  totalTimeDisplay.textContent = formatTime(audioPlayer.duration);
}

function formatTime(time) {
  if (isNaN(time)) return '0:00';
  
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function updatePlaylist() {
  playlistElement.innerHTML = '';
  
  musicFiles.forEach((file, index) => {
    const li = document.createElement('li');
    li.textContent = path.basename(file.name, path.extname(file.name));
    li.addEventListener('click', () => {
      currentTrackIndex = index;
      loadTrack(currentTrackIndex);
      if (isPlaying) {
        audioPlayer.play();
      } else {
        togglePlay();
      }
      menuOverlay.classList.add('hidden');
    });
    
    if (index === currentTrackIndex) {
      li.classList.add('active');
    }
    
    playlistElement.appendChild(li);
  });
}

// Initial setup
audioPlayer.volume = volumeSlider.value;
menuOverlay.classList.add('hidden');