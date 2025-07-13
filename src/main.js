// Polyfill for requestIdleCallback in environments where it's not available
if (typeof requestIdleCallback === 'undefined') {
  window.requestIdleCallback = function(callback, options) {
    const start = Date.now();
    return setTimeout(function() {
      callback({
        didTimeout: false,
        timeRemaining: function() {
          return Math.max(0, 50 - (Date.now() - start));
        }
      });
    }, 1);
  };
}

if (typeof cancelIdleCallback === 'undefined') {
  window.cancelIdleCallback = function(id) {
    clearTimeout(id);
  };
}

const canvas = document.getElementById('spiralCanvas')
const ctx    = canvas.getContext('2d')

// spiral settings
let scale = 5
let maxN = 5000
let spiralCoeff = 2
let points = []
let showPrimes = true
let showClusters = true
let showRotation = true
let rotationSpeed = 0.1
let currentRotation = 0
let useSquares = true
let dotSize = 0.1
let primeSize = 10.0
let isFullscreen = false
let wasFullscreenBefore = false // Track if window was fullscreen before entering current fullscreen session
let menuVisible = true // Track menu visibility state
let interfaceVisibleInFullscreen = false // Track if interface is currently visible while in fullscreen
let instantRender = false

// Spiral coefficient animation settings
let animateSpiralCoeff = false
let spiralAnimationSpeed = 100 // milliseconds
let spiralAnimationIncrement = 0.1
let spiralAnimationMin = 1
let spiralAnimationMax = 500
let spiralAnimationDirection = 1 // 1 for incrementing, -1 for decrementing
let spiralAnimationInterval = null

// Cursor auto-hide functionality for fullscreen
let cursorTimeout = null
let cursorHidden = false
const CURSOR_HIDE_DELAY = 2000 // 2 seconds

// cluster settings
let clusterCount = 100
const clusterRadius = 200
const sizeBoost     = 1
const liftHeight    = 10
const trailAlpha    = 0.25

const clusters = []

// Cursor auto-hide functionality
function hideCursor() {
  if (isFullscreen && !cursorHidden) {
    document.body.style.cursor = 'none'
    cursorHidden = true
  }
}

function showCursor() {
  if (cursorHidden) {
    document.body.style.cursor = 'auto'
    cursorHidden = false
  }
}

function resetCursorTimer() {
  // Clear existing timer
  if (cursorTimeout) {
    clearTimeout(cursorTimeout)
  }

  // Only start timer if in fullscreen
  if (isFullscreen) {
    // Show cursor immediately
    showCursor()

    // Set new timer to hide cursor after delay
    cursorTimeout = setTimeout(hideCursor, CURSOR_HIDE_DELAY)
  }
}

// Fullscreen functionality
let toastTimeout = null

function showFullscreenToast() {
  const toast = document.getElementById('fullscreenToast')
  toast.classList.add('show')

  // Clear existing timeout
  if (toastTimeout) {
    clearTimeout(toastTimeout)
  }

  // Hide toast after 3 seconds
  toastTimeout = setTimeout(() => {
    toast.classList.remove('show')
  }, 3000)
}

async function enterFullscreen() {
  // Check if we're in Tauri environment
  if (window.__TAURI__) {
    try {
      // Use Tauri's window API
      await window.__TAURI__.window.getCurrentWindow().setFullscreen(true)
    } catch (error) {
      console.error('Failed to enter fullscreen:', error)
    }
  } else {
    // Browser fullscreen API
    const element = document.documentElement
    try {
      if (element.requestFullscreen) {
        await element.requestFullscreen()
      } else if (element.webkitRequestFullscreen) {
        await element.webkitRequestFullscreen()
      } else if (element.msRequestFullscreen) {
        await element.msRequestFullscreen()
      }
    } catch (error) {
      console.error('Failed to enter fullscreen:', error)
    }
  }

  // Start cursor auto-hide timer when entering fullscreen
  resetCursorTimer()
}

async function exitFullscreen() {
  // Stop cursor auto-hide when exiting fullscreen
  if (cursorTimeout) {
    clearTimeout(cursorTimeout)
    cursorTimeout = null
  }
  showCursor()

  // Check if we're in Tauri environment
  if (window.__TAURI__) {
    try {
      // Use Tauri's window API
      await window.__TAURI__.window.getCurrentWindow().setFullscreen(false)
    } catch (error) {
      console.error('Failed to exit fullscreen:', error)
    }
  } else {
    // Browser fullscreen API
    try {
      if (document.exitFullscreen) {
        await document.exitFullscreen()
      } else if (document.webkitExitFullscreen) {
        await document.webkitExitFullscreen()
      } else if (document.msExitFullscreen) {
        await document.msExitFullscreen()
      }
    } catch (error) {
      console.error('Failed to exit fullscreen:', error)
    }
  }
}

async function toggleMenuVisibility() {
  // Check if we're in Tauri environment
  if (window.__TAURI__) {
    try {
      menuVisible = !menuVisible
      console.log('Menu visibility toggled:', menuVisible ? 'visible' : 'hidden')

      // Show a toast to indicate menu state change
      const toast = document.getElementById('fullscreenToast')
      toast.textContent = menuVisible ? 'Menu restored (ESC to exit fullscreen)' : 'Menu hidden (ESC to restore menu)'
      toast.classList.add('show')

      // Clear existing timeout
      if (toastTimeout) {
        clearTimeout(toastTimeout)
      }

      // Hide toast after 3 seconds
      toastTimeout = setTimeout(() => {
        toast.classList.remove('show')
        // Restore original toast text
        toast.textContent = 'Press ESC to exit fullscreen'
      }, 3000)

    } catch (error) {
      console.error('Failed to toggle menu visibility:', error)
    }
  }
}

async function showInterfaceInFullscreen() {
  // When in fullscreen mode but wanting to show interface (for users who were already fullscreen)
  console.log('Showing interface in fullscreen mode')

  // Force show the interface elements temporarily
  const sidebar = document.getElementById('sidebar')
  const sidebarToggle = document.getElementById('sidebarToggle')
  const fullscreenToggle = document.getElementById('fullscreenToggle')

  sidebar.style.display = 'flex'
  sidebarToggle.style.display = 'flex'
  fullscreenToggle.style.display = 'flex'

  // Show cursor when interface is shown and stop auto-hide
  if (cursorTimeout) {
    clearTimeout(cursorTimeout)
    cursorTimeout = null
  }
  showCursor()

  // Show informative toast
  const toast = document.getElementById('fullscreenToast')
  toast.textContent = 'Interface restored - Use macOS fullscreen controls to exit, or ESC to hide interface'
  toast.classList.add('show')

  // Clear existing timeout
  if (toastTimeout) {
    clearTimeout(toastTimeout)
  }

  // Hide toast after 4 seconds (longer since it has more text)
  toastTimeout = setTimeout(() => {
    toast.classList.remove('show')
    toast.textContent = 'Press ESC to exit fullscreen'
  }, 4000)
}

function hideInterfaceInFullscreen() {
  // When in fullscreen mode and wanting to hide interface again
  console.log('Hiding interface in fullscreen mode')

  // Hide the interface elements
  const sidebar = document.getElementById('sidebar')
  const sidebarToggle = document.getElementById('sidebarToggle')
  const fullscreenToggle = document.getElementById('fullscreenToggle')

  sidebar.style.display = 'none'
  sidebarToggle.style.display = 'none'
  fullscreenToggle.style.display = 'none'

  // Restart cursor auto-hide when interface is hidden
  resetCursorTimer()

  // Show informative toast
  const toast = document.getElementById('fullscreenToast')
  toast.textContent = 'Interface hidden - Press ESC to show interface'
  toast.classList.add('show')

  // Clear existing timeout
  if (toastTimeout) {
    clearTimeout(toastTimeout)
  }

  // Hide toast after 3 seconds
  toastTimeout = setTimeout(() => {
    toast.classList.remove('show')
  }, 3000)
}

async function toggleFullscreen() {
  if (window.__TAURI__) {
    if (isFullscreen) {
      // We're currently in fullscreen, check if we should exit or just toggle interface
      if (wasFullscreenBefore) {
        // Window was fullscreen before entering current fullscreen session
        // Just toggle interface visibility instead of exiting fullscreen
        console.log('Toggling interface visibility instead of exiting fullscreen (was fullscreen before)')
        if (interfaceVisibleInFullscreen) {
          hideInterfaceInFullscreen()
          interfaceVisibleInFullscreen = false
        } else {
          showInterfaceInFullscreen()
          interfaceVisibleInFullscreen = true
        }
      } else {
        // Window was not fullscreen before, so actually exit fullscreen
        console.log('Exiting fullscreen (was not fullscreen before)')
        isFullscreen = false
        wasFullscreenBefore = false
        menuVisible = true // Reset menu state when exiting fullscreen
        interfaceVisibleInFullscreen = false // Reset interface visibility state
        await exitFullscreen()
        // Update UI immediately for Tauri
        updateFullscreenState()
        // Save fullscreen state
        savePreference('isFullscreen', isFullscreen)
        // Save window state after a short delay to capture correct windowed dimensions
        setTimeout(() => {
          saveWindowState()
        }, 500)
      }
    } else {
      // We're not in fullscreen, so enter fullscreen
      // First, record the current fullscreen state as "before" state
      console.log('Entering fullscreen (was fullscreen before:', isFullscreen, ')')
      wasFullscreenBefore = isFullscreen
      isFullscreen = true
      menuVisible = true // Reset menu visibility when entering fullscreen
      interfaceVisibleInFullscreen = false // Start with interface hidden in fullscreen
      await enterFullscreen()
      // Update UI immediately for Tauri
      updateFullscreenState()
      // Save fullscreen state
      savePreference('isFullscreen', isFullscreen)
    }
  } else {
    // Browser fullscreen - state will be updated by event listeners
    if (!isFullscreen) {
      wasFullscreenBefore = isFullscreen
      await enterFullscreen()
    } else {
      if (wasFullscreenBefore) {
        // In browser, we can't toggle menu visibility, so just show a toast
        showFullscreenToast()
        return
      } else {
        await exitFullscreen()
        wasFullscreenBefore = false
        interfaceVisibleInFullscreen = false
        // Save window state after a short delay to capture correct windowed dimensions
        setTimeout(() => {
          saveWindowState()
        }, 500)
      }
    }
  }
}

function updateFullscreenState() {
  const wasFullscreen = isFullscreen

  // Check fullscreen state based on environment
  if (window.__TAURI__) {
    // For Tauri, we need to track this manually since there's no direct API
    // The state will be updated when we call setFullscreen
    // isFullscreen is already set correctly in toggleFullscreen
  } else {
    // Browser fullscreen detection
    isFullscreen = !!(document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement)
  }

  const sidebar = document.getElementById('sidebar')
  const sidebarToggle = document.getElementById('sidebarToggle')
  const fullscreenToggle = document.getElementById('fullscreenToggle')

  if (isFullscreen) {
    // Hide all UI elements in fullscreen for screensaver experience
    sidebar.style.display = 'none'
    sidebarToggle.style.display = 'none'
    fullscreenToggle.style.display = 'none'

    // Start cursor auto-hide timer when entering fullscreen
    if (!wasFullscreen) {
      resetCursorTimer()
    }

    // Show toast when entering fullscreen
    if (!wasFullscreen) {
      const toast = document.getElementById('fullscreenToast')
      if (wasFullscreenBefore) {
        toast.textContent = 'Fullscreen mode - Press ESC to toggle menu'
      } else {
        toast.textContent = 'Fullscreen mode - Press ESC to exit fullscreen'
      }
      showFullscreenToast()
    }
  } else {
    // Show all UI elements when exiting fullscreen
    sidebar.style.display = 'flex'
    sidebarToggle.style.display = 'flex'
    fullscreenToggle.style.display = 'flex'
    fullscreenToggle.textContent = '⛶'
    fullscreenToggle.title = 'Toggle Fullscreen'

    // Stop cursor auto-hide and show cursor when exiting fullscreen
    if (wasFullscreen) {
      if (cursorTimeout) {
        clearTimeout(cursorTimeout)
        cursorTimeout = null
      }
      showCursor()
    }

    // Hide toast when exiting fullscreen
    const toast = document.getElementById('fullscreenToast')
    toast.classList.remove('show')
    // Reset toast text to default
    toast.textContent = 'Press ESC to exit fullscreen'
  }
}

// IndexedDB storage for user preferences
let db;
const DB_NAME = 'SpiralPrefs';
const DB_VERSION = 1;
const STORE_NAME = 'preferences';

// Initialize IndexedDB
function initDB() {
  const request = indexedDB.open(DB_NAME, DB_VERSION);

  request.onerror = () => console.warn('IndexedDB not available');

  request.onsuccess = (event) => {
    db = event.target.result;
    loadPreferences();
    // Load window state after a short delay to ensure Tauri APIs are ready
    if (window.__TAURI__) {
      setTimeout(() => {
        loadWindowState();
      }, 200);
    }
  };

  request.onupgradeneeded = (event) => {
    db = event.target.result;
    const objectStore = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
  };
}

// Save preference to IndexedDB
function savePreference(key, value) {
  if (!db) return;

  const transaction = db.transaction([STORE_NAME], 'readwrite');
  const objectStore = transaction.objectStore(STORE_NAME);
  objectStore.put({ id: key, value: value });
}

// Save window state (Tauri only)
async function saveWindowState() {
  if (!window.__TAURI__) return;

  try {
    const currentWindow = window.__TAURI__.window.getCurrentWindow();
    const size = await currentWindow.innerSize();
    const position = await currentWindow.innerPosition();
    const isMaximized = await currentWindow.isMaximized();

    // Don't save window dimensions when in fullscreen mode to prevent
    // ultra-wide window issues when exiting fullscreen
    if (!isFullscreen) {
      // Save window dimensions and position only when not in fullscreen
      savePreference('windowWidth', size.width);
      savePreference('windowHeight', size.height);
      savePreference('windowX', position.x);
      savePreference('windowY', position.y);
      savePreference('windowMaximized', isMaximized);

      console.log('Window state saved:', { width: size.width, height: size.height, fullscreen: isFullscreen });
    } else {
      console.log('Skipping window size save (in fullscreen mode)');
    }

    // Always save fullscreen state regardless
    savePreference('isFullscreen', isFullscreen);

  } catch (error) {
    console.error('Failed to save window state:', error);
  }
}

// Load and apply window state (Tauri only)
async function loadWindowState() {
  if (!window.__TAURI__ || !db) {
    console.log('Skipping window state load - Tauri not available or DB not ready');
    return;
  }

  console.log('Loading window state...');

  try {
    const currentWindow = window.__TAURI__.window.getCurrentWindow();

    // Wait a bit more to ensure window is fully ready
    await new Promise(resolve => setTimeout(resolve, 100));

    const transaction = db.transaction([STORE_NAME], 'readonly');
    const objectStore = transaction.objectStore(STORE_NAME);

    // Helper function to get values from IndexedDB
    const getValue = (key) => new Promise(resolve => {
      const request = objectStore.get(key);
      request.onsuccess = () => resolve(request.result?.value);
      request.onerror = () => resolve(null);
    });

    // Load all window state values
    const [width, height, x, y, maximized, fullscreen] = await Promise.all([
      getValue('windowWidth'),
      getValue('windowHeight'),
      getValue('windowX'),
      getValue('windowY'),
      getValue('windowMaximized'),
      getValue('isFullscreen')
    ]);

    console.log('Loaded window state:', { width, height, x, y, maximized, fullscreen });

    // Apply window size if saved
    if (width && height && width > 200 && height > 200) {
      // Add additional validation to prevent ultra-wide windows
      const maxReasonableWidth = 3840; // 4K width
      const maxReasonableHeight = 2160; // 4K height

      if (width <= maxReasonableWidth && height <= maxReasonableHeight) {
        try {
          await currentWindow.setSize(new window.__TAURI__.window.LogicalSize(width, height));
          console.log('✅ Window size restored:', width, 'x', height);
        } catch (error) {
          console.error('❌ Failed to restore window size:', error);
        }
      } else {
        console.log('❌ Saved window size too large, skipping restore:', width, 'x', height);
        // Clear the invalid saved dimensions
        savePreference('windowWidth', null);
        savePreference('windowHeight', null);
      }
    } else {
      console.log('❌ No valid window size to restore');
    }

    // Apply window position if saved (validate it's reasonable)
    if (x !== null && y !== null && x >= -1000 && y >= -1000) {
      try {
        await currentWindow.setPosition(new window.__TAURI__.window.LogicalPosition(x, y));
        console.log('✅ Window position restored:', x, ',', y);
      } catch (error) {
        console.error('❌ Failed to restore window position:', error);
      }
    } else {
      console.log('❌ No valid window position to restore');
    }

    // Apply maximized state if saved
    if (maximized) {
      try {
        await currentWindow.maximize();
        console.log('✅ Window maximized state restored');
      } catch (error) {
        console.error('❌ Failed to restore maximized state:', error);
      }
    }

    // Apply fullscreen state if saved (with additional delay and better handling)
    if (fullscreen) {
      setTimeout(async () => {
        try {
          console.log('⚠️  Restoring fullscreen state...');
          // DISABLE fullscreen restoration during development - set to true to enable
          const shouldRestoreFullscreen = false; // Change to true when you want fullscreen restored

          if (shouldRestoreFullscreen) {
            // When restoring fullscreen, mark it as "was fullscreen before"
            wasFullscreenBefore = true
            isFullscreen = true
            menuVisible = true
            interfaceVisibleInFullscreen = false // Start with interface hidden
            await currentWindow.setFullscreen(true);
            updateFullscreenState();
            console.log('✅ Fullscreen state restored (marked as was fullscreen before)');
          } else {
            console.log('⏭️  Skipping fullscreen restoration (disabled for development)');
            // Clear the saved fullscreen state so it doesn't keep trying
            isFullscreen = false
            wasFullscreenBefore = false
            interfaceVisibleInFullscreen = false
            savePreference('isFullscreen', false);
          }
        } catch (error) {
          console.error('❌ Failed to restore fullscreen state:', error);
          // If fullscreen restoration fails, clear the saved state
          isFullscreen = false
          wasFullscreenBefore = false
          interfaceVisibleInFullscreen = false
          savePreference('isFullscreen', false);
        }
      }, 300);
    }

  } catch (error) {
    console.error('❌ Failed to load window state:', error);
  }
}

// Load all preferences from IndexedDB
function loadPreferences() {
  if (!db) return;

  const transaction = db.transaction([STORE_NAME], 'readonly');
  const objectStore = transaction.objectStore(STORE_NAME);

  // Load sidebar state
  objectStore.get('sidebarCollapsed').onsuccess = (event) => {
    if (event.target.result) {
      const sidebar = document.getElementById('sidebar');
      const toggle = document.getElementById('sidebarToggle');
      if (event.target.result.value) {
        sidebar.classList.add('collapsed');
        toggle.textContent = '☰';
        toggle.setAttribute('aria-expanded', 'false');
      } else {
        // Sidebar is open, so show close icon
        toggle.textContent = '✕';
        toggle.setAttribute('aria-expanded', 'true');
      }
    } else {
      // No saved state, sidebar is open by default, show close icon
      const toggle = document.getElementById('sidebarToggle');
      toggle.textContent = '✕';
      toggle.setAttribute('aria-expanded', 'true');
    }
  };

  // Load spiral coefficient
  objectStore.get('spiralCoeff').onsuccess = (event) => {
    if (event.target.result && event.target.result.value !== undefined) {
      const loadedValue = parseFloat(event.target.result.value);
      // Validate the loaded value
      if (!isNaN(loadedValue) && isFinite(loadedValue) && loadedValue > 0) {
        spiralCoeff = loadedValue;
        document.getElementById('spiralSlider').value = spiralCoeff;
        document.getElementById('spiralNumber').value = spiralCoeff;
        computePoints();
      } else {
        // Invalid value, reset to default
        console.warn('Invalid spiralCoeff value loaded, resetting to default (2)');
        spiralCoeff = 2;
        document.getElementById('spiralSlider').value = spiralCoeff;
        document.getElementById('spiralNumber').value = spiralCoeff;
        savePreference('spiralCoeff', spiralCoeff);
        computePoints();
      }
    }
  };

  // Load maxN
  objectStore.get('maxN').onsuccess = (event) => {
    if (event.target.result) {
      maxN = event.target.result.value;
      document.getElementById('maxNSlider').value = maxN;
      document.getElementById('maxNNumber').value = maxN;
      computePoints();
    }
  };

  // Load cluster count
  objectStore.get('clusterCount').onsuccess = (event) => {
    if (event.target.result) {
      clusterCount = event.target.result.value;
      document.getElementById('clusterCountSlider').value = clusterCount;
      document.getElementById('clusterCountNumber').value = clusterCount;
      initClusters();
    }
  };

  // Load show primes
  objectStore.get('showPrimes').onsuccess = (event) => {
    if (event.target.result !== undefined) {
      showPrimes = event.target.result.value;
      const primeToggle = document.getElementById('primeToggle');
      primeToggle.classList.toggle('active', showPrimes);
      primeToggle.setAttribute('aria-checked', showPrimes.toString());
      primeToggle.textContent = showPrimes ? 'Defocus Prime Numbers' : 'Focus Prime Numbers';
    }
  };

  // Load show clusters
  objectStore.get('showClusters').onsuccess = (event) => {
    if (event.target.result !== undefined) {
      showClusters = event.target.result.value;
      const clusterToggle = document.getElementById('clusterToggle');
      clusterToggle.classList.toggle('active', showClusters);
      clusterToggle.setAttribute('aria-checked', showClusters.toString());
      clusterToggle.textContent = showClusters ? 'Stop Animation' : 'Start Animation';
    }
  };

  // Load show rotation
  objectStore.get('showRotation').onsuccess = (event) => {
    if (event.target.result !== undefined) {
      showRotation = event.target.result.value;
      const rotationToggle = document.getElementById('rotationToggle');
      rotationToggle.classList.toggle('active', showRotation);
      rotationToggle.setAttribute('aria-checked', showRotation.toString());
      rotationToggle.textContent = showRotation ? 'Stop Rotation' : 'Start Rotation';
    }
  };

  // Load rotation speed
  objectStore.get('rotationSpeed').onsuccess = (event) => {
    if (event.target.result) {
      rotationSpeed = event.target.result.value;
      document.getElementById('rotationSpeedSlider').value = rotationSpeed;
      document.getElementById('rotationSpeedNumber').value = rotationSpeed;
    }
  };

  // Load shape preference
  objectStore.get('useSquares').onsuccess = (event) => {
    if (event.target.result !== undefined) {
      useSquares = event.target.result.value;
      const shapeToggle = document.getElementById('shapeToggle');
      shapeToggle.classList.toggle('active', useSquares);
      shapeToggle.setAttribute('aria-checked', useSquares.toString());
      shapeToggle.textContent = useSquares ? 'Use Circles' : 'Use Squares';
    }
  };

  // Load instant render preference
  objectStore.get('instantRender').onsuccess = (event) => {
    if (event.target.result !== undefined) {
      instantRender = event.target.result.value;
      const instantRenderToggle = document.getElementById('instantRenderToggle');
      instantRenderToggle.classList.toggle('active', instantRender);
      instantRenderToggle.setAttribute('aria-checked', instantRender.toString());
      instantRenderToggle.textContent = instantRender ? 'Disable Instant Render' : 'Enable Instant Render';
    }
  };

  // Load dot size
  objectStore.get('dotSize').onsuccess = (event) => {
    if (event.target.result) {
      dotSize = event.target.result.value;
      document.getElementById('dotSizeSlider').value = dotSize;
      document.getElementById('dotSizeNumber').value = dotSize;
    }
  };

  // Load prime size
  objectStore.get('primeSize').onsuccess = (event) => {
    if (event.target.result) {
      primeSize = event.target.result.value;
      document.getElementById('primeSizeSlider').value = primeSize;
      document.getElementById('primeSizeNumber').value = primeSize;
    }
  };

  // Load scale
  objectStore.get('scale').onsuccess = (event) => {
    if (event.target.result) {
      scale = event.target.result.value;
      computePoints();
    }
  };

  // Load spiral animation preference
  objectStore.get('animateSpiralCoeff').onsuccess = (event) => {
    if (event.target.result !== undefined) {
      animateSpiralCoeff = event.target.result.value;
      const spiralAnimationToggle = document.getElementById('spiralAnimationToggle');
      spiralAnimationToggle.classList.toggle('active', animateSpiralCoeff);
      spiralAnimationToggle.setAttribute('aria-checked', animateSpiralCoeff.toString());
      spiralAnimationToggle.textContent = animateSpiralCoeff ? 'Stop Spiral Animation' : 'Animate Spiral Coefficient';

      // Show/hide controls based on saved state
      const controls = document.getElementById('spiralAnimationControls');
      controls.style.display = animateSpiralCoeff ? 'block' : 'none';

      if (animateSpiralCoeff) {
        startSpiralCoeffAnimation();
      }
    }
  };

  // Load spiral animation speed
  objectStore.get('spiralAnimationSpeed').onsuccess = (event) => {
    if (event.target.result && event.target.result.value !== undefined) {
      const loadedValue = parseInt(event.target.result.value);
      if (!isNaN(loadedValue) && isFinite(loadedValue) && loadedValue >= 10 && loadedValue <= 2000) {
        spiralAnimationSpeed = loadedValue;
        document.getElementById('spiralAnimationSpeedSlider').value = spiralAnimationSpeed;
        document.getElementById('spiralAnimationSpeedNumber').value = spiralAnimationSpeed;
      } else {
        console.warn('Invalid spiralAnimationSpeed value, using default (100)');
        spiralAnimationSpeed = 100;
      }
    }
  };

  // Load spiral animation increment
  objectStore.get('spiralAnimationIncrement').onsuccess = (event) => {
    if (event.target.result && event.target.result.value !== undefined) {
      const loadedValue = parseFloat(event.target.result.value);
      if (!isNaN(loadedValue) && isFinite(loadedValue) && loadedValue > 0 && loadedValue <= 10) {
        spiralAnimationIncrement = loadedValue;
        document.getElementById('spiralAnimationIncrementSlider').value = spiralAnimationIncrement;
        document.getElementById('spiralAnimationIncrementNumber').value = spiralAnimationIncrement;
      } else {
        console.warn('Invalid spiralAnimationIncrement value, using default (0.1)');
        spiralAnimationIncrement = 0.1;
      }
    }
  };

  // Load spiral animation min
  objectStore.get('spiralAnimationMin').onsuccess = (event) => {
    if (event.target.result && event.target.result.value !== undefined) {
      const loadedValue = parseFloat(event.target.result.value);
      if (!isNaN(loadedValue) && isFinite(loadedValue) && loadedValue > 0) {
        spiralAnimationMin = loadedValue;
        document.getElementById('spiralAnimationMinSlider').value = spiralAnimationMin;
        document.getElementById('spiralAnimationMinNumber').value = spiralAnimationMin;
      } else {
        console.warn('Invalid spiralAnimationMin value, using default (1)');
        spiralAnimationMin = 1;
      }
    }
  };

  // Load spiral animation max
  objectStore.get('spiralAnimationMax').onsuccess = (event) => {
    if (event.target.result && event.target.result.value !== undefined) {
      const loadedValue = parseFloat(event.target.result.value);
      if (!isNaN(loadedValue) && isFinite(loadedValue) && loadedValue > spiralAnimationMin) {
        spiralAnimationMax = loadedValue;
        document.getElementById('spiralAnimationMaxSlider').value = spiralAnimationMax;
        document.getElementById('spiralAnimationMaxNumber').value = spiralAnimationMax;
      } else {
        console.warn('Invalid spiralAnimationMax value, using default (500)');
        spiralAnimationMax = 500;
      }
    }
  };
}

// Prime number checking function with memoization
const primeCache = new Map();
function isPrime(n) {
  if (primeCache.has(n)) return primeCache.get(n);

  if (n < 2) {
    primeCache.set(n, false);
    return false;
  }
  if (n === 2) {
    primeCache.set(n, true);
    return true;
  }
  if (n % 2 === 0) {
    primeCache.set(n, false);
    return false;
  }

  for (let i = 3; i * i <= n; i += 2) {
    if (n % i === 0) {
      primeCache.set(n, false);
      return false;
    }
  }

  primeCache.set(n, true);
  return true;
}

function resize() {
  canvas.width  = window.innerWidth
  canvas.height = window.innerHeight
  computePoints()
  initClusters()
}

function computePoints() {
  const W = canvas.width, H = canvas.height, cx = W/2, cy = H/2
  points = []

  // Cancel any ongoing computation
  if (window.currentComputationId) {
    cancelIdleCallback(window.currentComputationId)
    window.currentComputationId = null
  }

  // Performance safety: limit computation for very large values
  const effectiveMaxN = Math.min(maxN, 2000000) // Hard cap at 2M points

  // Calculate diagonal to ensure rotated content covers entire screen
  const diagonal = Math.sqrt(W * W + H * H)
  const margin = diagonal / 2

  if (instantRender) {
    // Instant computation - compute all points immediately without chunking
    for (let n = 1; n <= effectiveMaxN; n++) {
      const r = Math.sqrt(n) * scale
      const θ = spiralCoeff * Math.PI * Math.sqrt(n)
      const x = cx + r * Math.cos(θ)
      const y = cy + r * Math.sin(θ)

      // Use expanded bounds when rotation is enabled to prevent clipping
      const bounds = showRotation ? margin : 0
      if (x < -bounds || x > W + bounds || y < -bounds || y > H + bounds) continue

      points.push({x, y, n, isPrime: isPrime(n)})
    }

    if (maxN > effectiveMaxN) {
      console.warn(`Capped point calculation at ${effectiveMaxN} for performance`)
    }
  } else {
    // Progressive computation with chunking for animation effect
    const chunkSize = 1000;
    let currentN = 1;

    function computeChunk() {
      const endN = Math.min(currentN + chunkSize, effectiveMaxN);

      for (let n = currentN; n <= endN; n++) {
        const r = Math.sqrt(n) * scale
        const θ = spiralCoeff * Math.PI * Math.sqrt(n)
        const x = cx + r * Math.cos(θ)
        const y = cy + r * Math.sin(θ)

        // Use expanded bounds when rotation is enabled to prevent clipping
        const bounds = showRotation ? margin : 0
        if (x < -bounds || x > W + bounds || y < -bounds || y > H + bounds) continue

        points.push({x, y, n, isPrime: isPrime(n)})
      }

      currentN = endN + 1;

      if (currentN <= effectiveMaxN) {
        // Continue with next chunk on next frame
        window.currentComputationId = requestIdleCallback(computeChunk, { timeout: 50 });
      } else {
        // Computation complete
        window.currentComputationId = null
        if (maxN > effectiveMaxN) {
          console.warn(`Capped point calculation at ${effectiveMaxN} for performance`)
        }
      }
    }

    // Schedule the first chunk
    window.currentComputationId = requestIdleCallback(computeChunk, { timeout: 50 });
  }
}

function initClusters() {
  clusters.length = 0
  const W = canvas.width, H = canvas.height

  // Performance safety: limit clusters for very large values
  const effectiveClusterCount = Math.min(clusterCount, 1000) // Hard cap at 1000 clusters

  for (let i = 0; i < effectiveClusterCount; i++) {
    const x = Math.random()*W
    const y = Math.random()*H
    clusters.push({
      x, y,
      targetX: Math.random()*W,
      targetY: Math.random()*H,
      speed: 2 + Math.random()*1.0  // px per frame
    })
  }

  if (clusterCount > effectiveClusterCount) {
    console.warn(`Capped cluster count at ${effectiveClusterCount} for performance`)
  }
}

function updateClusters() {
  const W = canvas.width, H = canvas.height
  clusters.forEach(c => {
    const dx = c.targetX - c.x
    const dy = c.targetY - c.y
    const d  = Math.hypot(dx, dy)
    if (d < c.speed) {
      // reached target → pick a new one
      c.targetX = Math.random() * W
      c.targetY = Math.random() * H
    } else {
      // move toward target
      c.x += (dx / d) * c.speed
      c.y += (dy / d) * c.speed
    }
  })
}

function drawFrame() {
  if (showClusters) {
    updateClusters()
  }

  // Update rotation if enabled
  if (showRotation) {
    currentRotation += rotationSpeed * 0.01 // Convert to radians per frame
  }

  // fading trail
  ctx.fillStyle = `rgba(0,0,0,${trailAlpha})`
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  // Save canvas state for rotation
  ctx.save()

  // Apply rotation to the entire canvas
  if (showRotation) {
    ctx.translate(canvas.width / 2, canvas.height / 2)
    ctx.rotate(currentRotation)
    ctx.translate(-canvas.width / 2, -canvas.height / 2)
  }

  // Batch drawing operations for better performance
  // Dynamic render batch size based on instant render setting and performance needs
  let renderBatchSize;
  if (instantRender) {
    renderBatchSize = points.length; // Render all points instantly when enabled
  } else {
    // Progressive rendering for the nice animation effect
    if (points.length <= 10000) {
      renderBatchSize = points.length; // Render all points for smaller datasets
    } else if (points.length <= 50000) {
      renderBatchSize = Math.min(points.length, 2000); // Medium batch size
    } else {
      renderBatchSize = Math.min(points.length, 5000); // Larger batch size for big datasets
    }
  }

  let currentColor = '';

  // Group points by color and shape to reduce state changes
  const primePoints = [];
  const normalPoints = [];

  for (let i = 0; i < renderBatchSize; i++) {
    const p = points[i % points.length];

    let factor = 0;
    if (showClusters) {
      for (const c of clusters) {
        const dx = p.x - c.x, dy = p.y - c.y;
        if (Math.abs(dx) < clusterRadius && Math.abs(dy) < clusterRadius) {
          const fx = 1 - Math.abs(dx) / clusterRadius;
          const fy = 1 - Math.abs(dy) / clusterRadius;
          const squareFalloff = Math.min(fx, fy);
          factor = Math.max(factor, squareFalloff);
        }
      }
    }

    // Calculate size based on base size, prime multiplier, and cluster effect
    let baseSize = dotSize;
    if (showPrimes && p.isPrime) {
      baseSize *= primeSize;
    }
    const size = baseSize + factor * sizeBoost;
    const offsetY = -factor * liftHeight;

    const pointData = { ...p, size, offsetY };

    if (showPrimes && p.isPrime) {
      primePoints.push(pointData);
    } else {
      normalPoints.push(pointData);
    }
  }

  // Draw normal points in batch
  if (normalPoints.length > 0) {
    ctx.fillStyle = '#009900';
    normalPoints.forEach(p => {
      if (useSquares) {
        ctx.fillRect(p.x - p.size/2, p.y + p.offsetY - p.size/2, p.size, p.size);
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y + p.offsetY, p.size/2, 0, 2*Math.PI);
        ctx.fill();
      }
    });
  }

  // Draw prime points in batch
  if (primePoints.length > 0) {
    ctx.fillStyle = '#00ff00';
    primePoints.forEach(p => {
      if (useSquares) {
        ctx.fillRect(p.x - p.size/2, p.y + p.offsetY - p.size/2, p.size, p.size);
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y + p.offsetY, p.size/2, 0, 2*Math.PI);
        ctx.fill();
      }
    });
  }

  // Restore canvas state
  ctx.restore()

  requestAnimationFrame(drawFrame)
}

function randomizeRGB() {
  return '0,0,0'
    .split(',')
    .map(() => Math.floor(Math.random() * 256))
    .join(',');
}

// scroll-to-zoom with debouncing
// function clamp(v,min,max){ return Math.max(min, Math.min(max, v)) }
const debouncedSaveScale = debounce((scale) => savePreference('scale', scale), 200);

window.addEventListener('wheel', e => {
  e.preventDefault()
  scale = clamp(scale * (e.deltaY>0 ? 1.05 : 0.95), 2, 200)
  debouncedSaveScale(scale)

  // Use instant computation if instant render is enabled, otherwise debounce
  if (instantRender) {
    computePoints()
  } else {
    debouncedComputePoints()
  }
}, { passive: false })

// Prevent canvas zoom when scrolling over sidebar
const sidebarElement = document.getElementById('sidebar')
sidebarElement.addEventListener('wheel', e => {
  // Stop wheel events from propagating to the window listener
  e.stopPropagation()
}, { passive: true })

// Fullscreen toggle functionality
const fullscreenToggle = document.getElementById('fullscreenToggle')
fullscreenToggle.addEventListener('click', toggleFullscreen)

// Listen for fullscreen changes
document.addEventListener('fullscreenchange', updateFullscreenState)
document.addEventListener('webkitfullscreenchange', updateFullscreenState)
document.addEventListener('msfullscreenchange', updateFullscreenState)

// Canvas click to show toast in fullscreen
canvas.addEventListener('click', () => {
  if (isFullscreen) {
    showFullscreenToast()
  }
})

// Sidebar toggle functionality
const sidebar = document.getElementById('sidebar')
const sidebarToggle = document.getElementById('sidebarToggle')

sidebarToggle.addEventListener('click', () => {
  const isCollapsed = sidebar.classList.toggle('collapsed')
  sidebarToggle.textContent = isCollapsed ? '☰' : '✕'
  sidebarToggle.setAttribute('aria-expanded', (!isCollapsed).toString())
  savePreference('sidebarCollapsed', isCollapsed)
})

// Prime toggle functionality
const primeToggle = document.getElementById('primeToggle')
primeToggle.addEventListener('click', () => {
  showPrimes = !showPrimes
  primeToggle.classList.toggle('active', showPrimes)
  primeToggle.setAttribute('aria-checked', showPrimes.toString())
  primeToggle.textContent = showPrimes ? 'Defocus Prime Numbers' : 'Focus Prime Numbers'
  savePreference('showPrimes', showPrimes)
})

// Cluster toggle functionality
const clusterToggle = document.getElementById('clusterToggle')
clusterToggle.addEventListener('click', () => {
  showClusters = !showClusters
  clusterToggle.classList.toggle('active', showClusters)
  clusterToggle.setAttribute('aria-checked', showClusters.toString())
  clusterToggle.textContent = showClusters ? 'Stop Animation' : 'Start Animation'
  savePreference('showClusters', showClusters)
})

// Rotation toggle functionality
const rotationToggle = document.getElementById('rotationToggle')
rotationToggle.addEventListener('click', () => {
  showRotation = !showRotation
  rotationToggle.classList.toggle('active', showRotation)
  rotationToggle.setAttribute('aria-checked', showRotation.toString())
  rotationToggle.textContent = showRotation ? 'Stop Rotation' : 'Start Rotation'
  savePreference('showRotation', showRotation)
  // Recompute points when rotation state changes to adjust clipping bounds
  computePoints()
})

// Shape toggle functionality
const shapeToggle = document.getElementById('shapeToggle')
shapeToggle.addEventListener('click', () => {
  useSquares = !useSquares
  shapeToggle.classList.toggle('active', useSquares)
  shapeToggle.setAttribute('aria-checked', useSquares.toString())
  shapeToggle.textContent = useSquares ? 'Use Circles' : 'Use Squares'
  savePreference('useSquares', useSquares)
})

// Instant render toggle functionality
const instantRenderToggle = document.getElementById('instantRenderToggle')
instantRenderToggle.addEventListener('click', () => {
  instantRender = !instantRender
  instantRenderToggle.classList.toggle('active', instantRender)
  instantRenderToggle.setAttribute('aria-checked', instantRender.toString())
  instantRenderToggle.textContent = instantRender ? 'Disable Instant Render' : 'Enable Instant Render'
  savePreference('instantRender', instantRender)
})

// Spiral coefficient animation logic
function startSpiralCoeffAnimation() {
  if (spiralAnimationInterval) return; // Already animating

  spiralAnimationInterval = setInterval(() => {
    // Validate all animation parameters before using them
    if (isNaN(spiralCoeff) || !isFinite(spiralCoeff)) {
      spiralCoeff = 2; // Reset to default
    }
    if (isNaN(spiralAnimationIncrement) || !isFinite(spiralAnimationIncrement) || spiralAnimationIncrement <= 0) {
      spiralAnimationIncrement = 0.1; // Reset to default
    }
    if (isNaN(spiralAnimationMin) || !isFinite(spiralAnimationMin) || spiralAnimationMin <= 0) {
      spiralAnimationMin = 1; // Reset to default
    }
    if (isNaN(spiralAnimationMax) || !isFinite(spiralAnimationMax) || spiralAnimationMax <= spiralAnimationMin) {
      spiralAnimationMax = 500; // Reset to default
    }

    // Calculate new value
    const newValue = spiralCoeff + (spiralAnimationIncrement * spiralAnimationDirection);

    // Validate the new value before assigning
    if (isNaN(newValue) || !isFinite(newValue)) {
      console.warn('Invalid spiral coefficient calculated, resetting to safe value');
      spiralCoeff = clamp(2, spiralAnimationMin, spiralAnimationMax);
    } else {
      spiralCoeff = newValue;
    }

    // Reverse direction if out of bounds
    if (spiralCoeff <= spiralAnimationMin || spiralCoeff >= spiralAnimationMax) {
      spiralAnimationDirection *= -1;
      // Clamp to bounds to prevent going beyond
      spiralCoeff = clamp(spiralCoeff, spiralAnimationMin, spiralAnimationMax);
    }

    // Update UI with validated value
    document.getElementById('spiralSlider').value = spiralCoeff;
    document.getElementById('spiralNumber').value = spiralCoeff;

    // Save preference
    savePreference('spiralCoeff', spiralCoeff);

    // Recompute points
    computePoints();
  }, spiralAnimationSpeed);
}

function stopSpiralCoeffAnimation() {
  if (spiralAnimationInterval) {
    clearInterval(spiralAnimationInterval);
    spiralAnimationInterval = null;
  }
}

// Toggle spiral coefficient animation
const spiralAnimationToggle = document.getElementById('spiralAnimationToggle');
spiralAnimationToggle.addEventListener('click', () => {
  animateSpiralCoeff = !animateSpiralCoeff;
  spiralAnimationToggle.classList.toggle('active', animateSpiralCoeff);
  spiralAnimationToggle.setAttribute('aria-checked', animateSpiralCoeff.toString());
  spiralAnimationToggle.textContent = animateSpiralCoeff ? 'Stop Spiral Animation' : 'Animate Spiral Coefficient';

  // Show/hide the animation controls
  const controls = document.getElementById('spiralAnimationControls');
  controls.style.display = animateSpiralCoeff ? 'block' : 'none';

  if (animateSpiralCoeff) {
    startSpiralCoeffAnimation();
  } else {
    stopSpiralCoeffAnimation();
  }

  savePreference('animateSpiralCoeff', animateSpiralCoeff);
});

// Update spiral coefficient animation speed
const spiralAnimationSpeedSlider = document.getElementById('spiralAnimationSpeedSlider');
const spiralAnimationSpeedNumber = document.getElementById('spiralAnimationSpeedNumber');

spiralAnimationSpeedSlider.addEventListener('input', (e) => {
  spiralAnimationSpeed = parseInt(e.target.value);
  spiralAnimationSpeedNumber.value = spiralAnimationSpeed;
  savePreference('spiralAnimationSpeed', spiralAnimationSpeed);

  // Restart animation with new speed
  if (animateSpiralCoeff) {
    stopSpiralCoeffAnimation();
    startSpiralCoeffAnimation();
  }
});

spiralAnimationSpeedNumber.addEventListener('input', (e) => {
  const value = parseInt(e.target.value);
  if (value >= 50 && value <= 500 && !isNaN(value)) {
    spiralAnimationSpeed = value;
    // Only update slider if value is within slider range
    if (value >= 100 && value <= 500) {
      spiralAnimationSpeedSlider.value = spiralAnimationSpeed;
    }
    savePreference('spiralAnimationSpeed', spiralAnimationSpeed);

    // Restart animation with new speed
    if (animateSpiralCoeff) {
      stopSpiralCoeffAnimation();
      startSpiralCoeffAnimation();
    }
  }
});

// Spiral animation increment controls
const spiralAnimationIncrementSlider = document.getElementById('spiralAnimationIncrementSlider');
const spiralAnimationIncrementNumber = document.getElementById('spiralAnimationIncrementNumber');

spiralAnimationIncrementSlider.addEventListener('input', (e) => {
  spiralAnimationIncrement = parseFloat(e.target.value);
  spiralAnimationIncrementNumber.value = spiralAnimationIncrement;
  savePreference('spiralAnimationIncrement', spiralAnimationIncrement);
});

spiralAnimationIncrementNumber.addEventListener('input', (e) => {
  const value = parseFloat(e.target.value);
  if (value >= 0.01 && value <= 10.0 && !isNaN(value)) {
    spiralAnimationIncrement = value;
    // Only update slider if value is within slider range
    if (value >= 0.01 && value <= 2.0) {
      spiralAnimationIncrementSlider.value = spiralAnimationIncrement;
    }
    savePreference('spiralAnimationIncrement', spiralAnimationIncrement);
  }
});

// Spiral animation min range controls
const spiralAnimationMinSlider = document.getElementById('spiralAnimationMinSlider');
const spiralAnimationMinNumber = document.getElementById('spiralAnimationMinNumber');

spiralAnimationMinSlider.addEventListener('input', (e) => {
  spiralAnimationMin = parseFloat(e.target.value);
  spiralAnimationMinNumber.value = spiralAnimationMin;
  savePreference('spiralAnimationMin', spiralAnimationMin);

  // Ensure min is less than max
  if (spiralAnimationMin >= spiralAnimationMax) {
    spiralAnimationMax = spiralAnimationMin + 10;
    document.getElementById('spiralAnimationMaxSlider').value = spiralAnimationMax;
    document.getElementById('spiralAnimationMaxNumber').value = spiralAnimationMax;
    savePreference('spiralAnimationMax', spiralAnimationMax);
  }
});

spiralAnimationMinNumber.addEventListener('input', (e) => {
  const value = parseFloat(e.target.value);
  if (value >= 0.1 && value <= 1000 && !isNaN(value)) {
    spiralAnimationMin = value;
    // Only update slider if value is within slider range
    if (value >= 0.1 && value <= 100) {
      spiralAnimationMinSlider.value = spiralAnimationMin;
    }
    savePreference('spiralAnimationMin', spiralAnimationMin);

    // Ensure min is less than max
    if (spiralAnimationMin >= spiralAnimationMax) {
      spiralAnimationMax = spiralAnimationMin + 10;
      document.getElementById('spiralAnimationMaxSlider').value = spiralAnimationMax;
      document.getElementById('spiralAnimationMaxNumber').value = spiralAnimationMax;
      savePreference('spiralAnimationMax', spiralAnimationMax);
    }
  }
});

// Spiral animation max range controls
const spiralAnimationMaxSlider = document.getElementById('spiralAnimationMaxSlider');
const spiralAnimationMaxNumber = document.getElementById('spiralAnimationMaxNumber');

spiralAnimationMaxSlider.addEventListener('input', (e) => {
  spiralAnimationMax = parseFloat(e.target.value);
  spiralAnimationMaxNumber.value = spiralAnimationMax;
  savePreference('spiralAnimationMax', spiralAnimationMax);

  // Ensure max is greater than min
  if (spiralAnimationMax <= spiralAnimationMin) {
    spiralAnimationMin = Math.max(0.1, spiralAnimationMax - 10);
    document.getElementById('spiralAnimationMinSlider').value = spiralAnimationMin;
    document.getElementById('spiralAnimationMinNumber').value = spiralAnimationMin;
    savePreference('spiralAnimationMin', spiralAnimationMin);
  }
});

spiralAnimationMaxNumber.addEventListener('input', (e) => {
  const value = parseFloat(e.target.value);
  if (value >= 10 && value <= 2000 && !isNaN(value)) {
    spiralAnimationMax = value;
    // Only update slider if value is within slider range
    if (value >= 10 && value <= 1000) {
      spiralAnimationMaxSlider.value = spiralAnimationMax;
    }
    savePreference('spiralAnimationMax', spiralAnimationMax);

    // Ensure max is greater than min
    if (spiralAnimationMax <= spiralAnimationMin) {
      spiralAnimationMin = Math.max(0.1, spiralAnimationMax - 10);
      document.getElementById('spiralAnimationMinSlider').value = spiralAnimationMin;
      document.getElementById('spiralAnimationMinNumber').value = spiralAnimationMin;
      savePreference('spiralAnimationMin', spiralAnimationMin);
    }
  }
});

// Clamp function for value mapping
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

// Map range function
function mapRange(value, inMin, inMax, outMin, outMax) {
  return outMin + (outMax - outMin) * clamp((value - inMin) / (inMax - inMin), 0, 1);
}

// Update spiral coefficient bounds based on UI inputs
function updateSpiralCoeffBounds() {
  const minInput = document.getElementById('spiralAnimationMinNumber');
  const maxInput = document.getElementById('spiralAnimationMaxNumber');

  const newMin = parseFloat(minInput.value);
  const newMax = parseFloat(maxInput.value);

  // Validate the new values
  if (!isNaN(newMin) && isFinite(newMin) && newMin > 0) {
    spiralAnimationMin = newMin;
  } else {
    spiralAnimationMin = 1; // Default fallback
    minInput.value = spiralAnimationMin;
  }

  if (!isNaN(newMax) && isFinite(newMax) && newMax > spiralAnimationMin) {
    spiralAnimationMax = newMax;
  } else {
    spiralAnimationMax = Math.max(500, spiralAnimationMin + 10); // Default fallback
    maxInput.value = spiralAnimationMax;
  }

  // Validate current spiralCoeff and clamp it to new bounds
  if (isNaN(spiralCoeff) || !isFinite(spiralCoeff)) {
    spiralCoeff = 2; // Reset to default if invalid
  }
  spiralCoeff = clamp(spiralCoeff, spiralAnimationMin, spiralAnimationMax);

  // Update UI with validated values
  document.getElementById('spiralSlider').value = spiralCoeff;
  document.getElementById('spiralNumber').value = spiralCoeff;

  // Save preferences
  savePreference('spiralCoeff', spiralCoeff);
  savePreference('spiralAnimationMin', spiralAnimationMin);
  savePreference('spiralAnimationMax', spiralAnimationMax);
}

// Initialize spiral coefficient bounds from preferences
function initSpiralCoeffBounds() {
  const minInput = document.getElementById('spiralAnimationMinNumber');
  const maxInput = document.getElementById('spiralAnimationMaxNumber');

  // Load from preferences or use defaults
  minInput.value = spiralAnimationMin = parseFloat(getPreference('spiralAnimationMin', 1));
  maxInput.value = spiralAnimationMax = parseFloat(getPreference('spiralAnimationMax', 500));

  // Update UI
  updateSpiralCoeffBounds();
}

// Load preference helper function
function getPreference(key, defaultValue) {
  if (!db) return defaultValue;

  const transaction = db.transaction([STORE_NAME], 'readonly');
  const objectStore = transaction.objectStore(STORE_NAME);

  return new Promise((resolve) => {
    const request = objectStore.get(key);
    request.onsuccess = () => resolve(request.result?.value || defaultValue);
    request.onerror = () => resolve(defaultValue);
  });
}

// On load, initialize spiral coefficient bounds from preferences
window.addEventListener('load', () => {
  initSpiralCoeffBounds();
});

// Debounce function to reduce excessive computations
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Debounced computation functions
const debouncedComputePoints = debounce(computePoints, 100);
const debouncedInitClusters = debounce(initClusters, 100);

// Spiral coefficient slider functionality
const spiralSlider = document.getElementById('spiralSlider')
const spiralNumber = document.getElementById('spiralNumber')

spiralSlider.addEventListener('input', (e) => {
  spiralCoeff = parseFloat(e.target.value)
  spiralNumber.value = spiralCoeff
  savePreference('spiralCoeff', spiralCoeff)

  // Use instant computation if instant render is enabled, otherwise debounce
  if (instantRender) {
    computePoints()
  } else {
    debouncedComputePoints()
  }
})

spiralNumber.addEventListener('input', (e) => {
  const value = parseFloat(e.target.value)
  if (value >= 0 && value <= 2000 && !isNaN(value)) {
    spiralCoeff = value
    // Only update slider if value is within slider range
    if (value >= 2 && value <= 200) {
      spiralSlider.value = spiralCoeff
    }
    savePreference('spiralCoeff', spiralCoeff)

    // Use instant computation if instant render is enabled, otherwise debounce
    if (instantRender) {
      computePoints()
    } else {
      debouncedComputePoints()
    }
  }
})

// Max N slider functionality
const maxNSlider = document.getElementById('maxNSlider')
const maxNNumber = document.getElementById('maxNNumber')

maxNSlider.addEventListener('input', (e) => {
  maxN = parseInt(e.target.value)
  maxNNumber.value = maxN
  savePreference('maxN', maxN)

  // Use instant computation if instant render is enabled, otherwise debounce
  if (instantRender) {
    computePoints()
  } else {
    debouncedComputePoints()
  }
})

maxNNumber.addEventListener('input', (e) => {
  const value = parseInt(e.target.value)
  if (value >= 1 && value <= 1900000 && !isNaN(value)) {
    maxN = value
    // Only update slider if value is within slider range
    if (value >= 20000 && value <= 190000) {
      maxNSlider.value = maxN
    }
    // Add performance warning for very large values
    if (value > 500000) {
      console.warn(`Warning: Using ${value} points may impact performance`)
    }
    savePreference('maxN', maxN)

    // Use instant computation if instant render is enabled, otherwise debounce
    if (instantRender) {
      computePoints()
    } else {
      debouncedComputePoints()
    }
  }
})

// Cluster count slider functionality
const clusterCountSlider = document.getElementById('clusterCountSlider')
const clusterCountNumber = document.getElementById('clusterCountNumber')

clusterCountSlider.addEventListener('input', (e) => {
  clusterCount = parseInt(e.target.value)
  clusterCountNumber.value = clusterCount
  savePreference('clusterCount', clusterCount)
  debouncedInitClusters()
})

clusterCountNumber.addEventListener('input', (e) => {
  const value = parseInt(e.target.value)
  if (value >= 0 && value <= 2000 && !isNaN(value)) {
    clusterCount = value
    // Only update slider if value is within slider range
    if (value >= 100 && value <= 200) {
      clusterCountSlider.value = clusterCount
    }
    // Add performance warning for very large values
    if (value > 500) {
      console.warn(`Warning: Using ${value} clusters may impact performance`)
    }
    savePreference('clusterCount', clusterCount)
    debouncedInitClusters()
  }
})

// Rotation speed slider functionality
const rotationSpeedSlider = document.getElementById('rotationSpeedSlider')
const rotationSpeedNumber = document.getElementById('rotationSpeedNumber')

rotationSpeedSlider.addEventListener('input', (e) => {
  rotationSpeed = parseFloat(e.target.value)
  rotationSpeedNumber.value = rotationSpeed
  savePreference('rotationSpeed', rotationSpeed)
})

rotationSpeedNumber.addEventListener('input', (e) => {
  const value = parseFloat(e.target.value)
  if (value >= 0.1 && value <= 10.0 && !isNaN(value)) {
    rotationSpeed = value
    // Only update slider if value is within slider range
    if (value >= 0.1 && value <= 5.0) {
      rotationSpeedSlider.value = rotationSpeed
    }
    savePreference('rotationSpeed', rotationSpeed)
  }
})

// Dot size slider functionality
const dotSizeSlider = document.getElementById('dotSizeSlider')
const dotSizeNumber = document.getElementById('dotSizeNumber')

dotSizeSlider.addEventListener('input', (e) => {
  dotSize = parseFloat(e.target.value)
  dotSizeNumber.value = dotSize
  savePreference('dotSize', dotSize)
})

dotSizeNumber.addEventListener('input', (e) => {
  const value = parseFloat(e.target.value)
  if (value >= 0.1 && value <= 20.0 && !isNaN(value)) {
    dotSize = value
    // Only update slider if value is within slider range
    if (value >= 0.5 && value <= 10.0) {
      dotSizeSlider.value = dotSize
    }
    savePreference('dotSize', dotSize)
  }
})

// Prime size slider functionality
const primeSizeSlider = document.getElementById('primeSizeSlider')
const primeSizeNumber = document.getElementById('primeSizeNumber')

primeSizeSlider.addEventListener('input', (e) => {
  primeSize = parseFloat(e.target.value)
  primeSizeNumber.value = primeSize
  savePreference('primeSize', primeSize)
})

primeSizeNumber.addEventListener('input', (e) => {
  const value = parseFloat(e.target.value)
  if (value >= 0.1 && value <= 10.0 && !isNaN(value)) {
    primeSize = value
    // Only update slider if value is within slider range
    if (value >= 0.5 && value <= 5.0) {
      primeSizeSlider.value = primeSize
    }
    savePreference('primeSize', primeSize)
  }
})

// Keyboard navigation support for accessibility
document.addEventListener('keydown', (e) => {
  // Reset cursor timer for any key activity
  resetCursorTimer()

  // Don't handle shortcuts if user is typing in input fields
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
    return
  }

  // ESC key to exit fullscreen or close sidebar
  if (e.key === 'Escape') {
    if (isFullscreen) {
      // Use the same logic as toggleFullscreen for ESC key
      if (window.__TAURI__) {
        if (wasFullscreenBefore) {
          // Window was fullscreen before, toggle interface visibility instead of exiting fullscreen
          console.log('ESC: Toggling interface visibility in fullscreen (was fullscreen before)')
          if (interfaceVisibleInFullscreen) {
            hideInterfaceInFullscreen()
            interfaceVisibleInFullscreen = false
          } else {
            showInterfaceInFullscreen()
            interfaceVisibleInFullscreen = true
          }
        } else {
          // Window was not fullscreen before, exit fullscreen
          console.log('ESC: Exiting fullscreen')
          isFullscreen = false
          wasFullscreenBefore = false
          menuVisible = true
          interfaceVisibleInFullscreen = false
          exitFullscreen()
          updateFullscreenState()
          savePreference('isFullscreen', isFullscreen)
          // Save window state after a short delay to capture correct windowed dimensions
          setTimeout(() => {
            saveWindowState()
          }, 500)
        }
      } else {
        // Browser behavior
        if (wasFullscreenBefore) {
          // In browser, show interface if hidden, hide if shown
          if (interfaceVisibleInFullscreen) {
            hideInterfaceInFullscreen()
            interfaceVisibleInFullscreen = false
          } else {
            showInterfaceInFullscreen()
            interfaceVisibleInFullscreen = true
          }
        } else {
          isFullscreen = false
          exitFullscreen()
          updateFullscreenState()
          wasFullscreenBefore = false
          interfaceVisibleInFullscreen = false
          // Save window state after a short delay to capture correct windowed dimensions
          setTimeout(() => {
            saveWindowState()
          }, 500)
        }
      }
    } else if (!sidebar.classList.contains('collapsed')) {
      sidebarToggle.click()
    }
  }

  // F11 or F key to toggle fullscreen
  if (e.key === 'F11' || (e.key === 'f' && !e.ctrlKey && !e.metaKey)) {
    e.preventDefault()

    // If in fullscreen and was fullscreen before, toggle interface instead
    if (isFullscreen && wasFullscreenBefore) {
      console.log('F key: Toggling interface visibility in fullscreen (was fullscreen before)')
      if (interfaceVisibleInFullscreen) {
        hideInterfaceInFullscreen()
        interfaceVisibleInFullscreen = false
      } else {
        showInterfaceInFullscreen()
        interfaceVisibleInFullscreen = true
      }
    } else {
      // Normal fullscreen toggle behavior
      toggleFullscreen()
    }
  }

  // S key to toggle sidebar
  if (e.key === 's' && !e.ctrlKey && !e.metaKey) {
    e.preventDefault()
    sidebarToggle.click()
  }

  // P key to toggle primes
  if (e.key === 'p' && !e.ctrlKey && !e.metaKey) {
    e.preventDefault()
    primeToggle.click()
  }

  // A key to toggle animation
  if (e.key === 'a' && !e.ctrlKey && !e.metaKey) {
    e.preventDefault()
    clusterToggle.click()
  }

  // R key to toggle rotation
  if (e.key === 'r' && !e.ctrlKey && !e.metaKey) {
    e.preventDefault()
    rotationToggle.click()
  }

  // C key to toggle circles/squares
  if (e.key === 'c' && !e.ctrlKey && !e.metaKey) {
    e.preventDefault()
    shapeToggle.click()
  }

  // I key to toggle instant render
  if (e.key === 'i' && !e.ctrlKey && !e.metaKey) {
    e.preventDefault()
    instantRenderToggle.click()
  }

  // M key to toggle spiral coefficient animation
  if (e.key === 'm' && !e.ctrlKey && !e.metaKey) {
    e.preventDefault()
    spiralAnimationToggle.click()
  }
})

// Add mouse move listener for cursor auto-hide functionality
document.addEventListener('mousemove', resetCursorTimer)
document.addEventListener('click', resetCursorTimer)
document.addEventListener('mousedown', resetCursorTimer)

window.addEventListener('resize', resize)

// Ensure window can receive keyboard focus
window.addEventListener('load', () => {
  // Make sure the window can receive keyboard focus
  if (document.body) {
    document.body.tabIndex = -1
    document.body.focus()
  }

  // For Tauri, try loading window state again on window load as a fallback
  if (window.__TAURI__) {
    setTimeout(() => {
      console.log('Attempting window state restore from window load event...');
      loadWindowState();
    }, 500);
  }
})

// Add window state saving listeners for Tauri
if (window.__TAURI__) {
  // Debounced function to save window state
  const debouncedSaveWindowState = debounce(saveWindowState, 500);

  // Listen for window resize events
  window.addEventListener('resize', debouncedSaveWindowState);

  // Listen for window move events (if available)
  // Note: Tauri doesn't have direct move events, but we can save on focus changes
  window.addEventListener('focus', debouncedSaveWindowState);
  window.addEventListener('blur', debouncedSaveWindowState);

  // Save window state when the page is about to unload
  window.addEventListener('beforeunload', () => {
    saveWindowState();
  });

  // Debug functions for manual testing
  window.debugSaveWindowState = saveWindowState;
  window.debugLoadWindowState = loadWindowState;

  console.log('Tauri window state persistence enabled');
  console.log('Debug commands available: debugSaveWindowState(), debugLoadWindowState()');
}

// Tooltip System
let tooltipsEnabled = true;

function createTooltip(element, text) {
  if (!text) return;

  // Create tooltip element
  const tooltip = document.createElement('div');
  tooltip.className = 'tooltip bottom';
  tooltip.textContent = text;
  element.appendChild(tooltip);

  // Create mobile info icon
  const icon = document.createElement('div');
  icon.className = 'tooltip-icon';
  icon.textContent = 'i';
  element.appendChild(icon);

  // Position tooltip based on available space
  function positionTooltip() {
    if (!tooltipsEnabled) return;

    const rect = element.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    // Reset classes
    tooltip.className = 'tooltip';

    // Determine best position
    if (rect.top > tooltipRect.height + 10) {
      tooltip.classList.add('top');
    } else if (rect.bottom + tooltipRect.height + 10 < viewportHeight) {
      tooltip.classList.add('bottom');
    } else if (rect.left > tooltipRect.width + 10) {
      tooltip.classList.add('left');
    } else {
      tooltip.classList.add('right');
    }
  }

  // Mobile tap handling
  let tapTimeout;
  icon.addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (!tooltipsEnabled) return;

    console.log('Tooltip icon clicked for:', text); // Debug log

    positionTooltip();
    tooltip.classList.add('show');

    // Clear existing timeout
    if (tapTimeout) {
      clearTimeout(tapTimeout);
    }

    // Auto-hide after 3 seconds
    tapTimeout = setTimeout(() => {
      tooltip.classList.remove('show');
    }, 3000);
  });

  // Prevent button clicks from interfering with tooltip display
  if (element.classList.contains('toggle-button')) {
    element.addEventListener('click', (e) => {
      // Don't interfere with the button's normal function
      // But also don't hide the tooltip
      e.stopPropagation();
    });
  }

  // Hide tooltip when tapping elsewhere
  document.addEventListener('click', (e) => {
    if (!element.contains(e.target)) {
      tooltip.classList.remove('show');
      if (tapTimeout) {
        clearTimeout(tapTimeout);
      }
    }
  });

  // Desktop hover handling
  let hoverTimeout;
  element.addEventListener('mouseenter', () => {
    if (!tooltipsEnabled) return;

    hoverTimeout = setTimeout(() => {
      positionTooltip();
      tooltip.classList.add('show');
    }, 500);
  });

  element.addEventListener('mouseleave', () => {
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
    }
    tooltip.classList.remove('show');
  });
}

function initTooltips() {
  // Find all elements with data-tooltip attribute
  const elementsWithTooltips = document.querySelectorAll('[data-tooltip]');

  elementsWithTooltips.forEach(element => {
    const tooltipText = element.getAttribute('data-tooltip');
    createTooltip(element, tooltipText);
  });
}

function updateTooltipVisibility() {
  const body = document.body;

  if (tooltipsEnabled) {
    body.classList.remove('tooltips-disabled');
  } else {
    body.classList.add('tooltips-disabled');
    // Hide any currently shown tooltips
    document.querySelectorAll('.tooltip.show').forEach(tooltip => {
      tooltip.classList.remove('show');
    });
  }
}

// Initialize tooltip toggle
function initTooltipToggle() {
  const disableTooltipsCheckbox = document.getElementById('disableTooltips');

  if (disableTooltipsCheckbox) {
    // Load saved preference
    if (db) {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const objectStore = transaction.objectStore(STORE_NAME);
      objectStore.get('tooltipsEnabled').onsuccess = (event) => {
        if (event.target.result !== undefined) {
          tooltipsEnabled = event.target.result.value;
          disableTooltipsCheckbox.checked = !tooltipsEnabled;
          updateTooltipVisibility();
        }
      };
    }

    disableTooltipsCheckbox.addEventListener('change', (e) => {
      tooltipsEnabled = !e.target.checked;
      updateTooltipVisibility();
      savePreference('tooltipsEnabled', tooltipsEnabled);
    });
  }
}

initDB()
resize()
requestAnimationFrame(drawFrame)

// Initialize tooltips after DOM is ready
setTimeout(() => {
  initTooltips();
  initTooltipToggle();
}, 100);
