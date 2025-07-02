const canvas = document.getElementById('spiralCanvas')
const ctx    = canvas.getContext('2d')

// spiral settings
let scale = 3
let maxN = 20000
let spiralCoeff = 100
let points = []
let showPrimes = true
let showClusters = false
let showRotation = false
let rotationSpeed = 1.0
let currentRotation = 0
let useSquares = false
let dotSize = 2.0
let primeSize = 2.0
let isFullscreen = false

// cluster settings
let clusterCount = 100
const clusterRadius = 200
const sizeBoost     = 1
const liftHeight    = 10
const trailAlpha    = 0.25

const clusters = []

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

function enterFullscreen() {
  const element = document.documentElement
  if (element.requestFullscreen) {
    element.requestFullscreen()
  } else if (element.webkitRequestFullscreen) {
    element.webkitRequestFullscreen()
  } else if (element.msRequestFullscreen) {
    element.msRequestFullscreen()
  }
}

function exitFullscreen() {
  if (document.exitFullscreen) {
    document.exitFullscreen()
  } else if (document.webkitExitFullscreen) {
    document.webkitExitFullscreen()
  } else if (document.msExitFullscreen) {
    document.msExitFullscreen()
  }
}

function toggleFullscreen() {
  if (!isFullscreen) {
    enterFullscreen()
  } else {
    exitFullscreen()
  }
}

function updateFullscreenState() {
  const wasFullscreen = isFullscreen
  isFullscreen = !!(document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement)

  const sidebar = document.getElementById('sidebar')
  const sidebarToggle = document.getElementById('sidebarToggle')
  const fullscreenToggle = document.getElementById('fullscreenToggle')

  if (isFullscreen) {
    // Hide all UI elements in fullscreen for screensaver experience
    sidebar.style.display = 'none'
    sidebarToggle.style.display = 'none'
    fullscreenToggle.style.display = 'none'

    // Show toast when entering fullscreen
    if (!wasFullscreen) {
      showFullscreenToast()
    }
  } else {
    // Show all UI elements when exiting fullscreen
    sidebar.style.display = 'flex'
    sidebarToggle.style.display = 'flex'
    fullscreenToggle.style.display = 'flex'
    fullscreenToggle.textContent = '⛶'
    fullscreenToggle.title = 'Toggle Fullscreen'

    // Hide toast when exiting fullscreen
    document.getElementById('fullscreenToast').classList.remove('show')
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
      } else {
        // Sidebar is open, so show close icon
        toggle.textContent = '✕';
      }
    } else {
      // No saved state, sidebar is open by default, show close icon
      document.getElementById('sidebarToggle').textContent = '✕';
    }
  };

  // Load spiral coefficient
  objectStore.get('spiralCoeff').onsuccess = (event) => {
    if (event.target.result) {
      spiralCoeff = event.target.result.value;
      document.getElementById('spiralSlider').value = spiralCoeff;
      document.getElementById('spiralNumber').value = spiralCoeff;
      computePoints();
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
      primeToggle.textContent = showPrimes ? 'Default Prime Numbers' : 'Highlight Prime Numbers';
    }
  };

  // Load show clusters
  objectStore.get('showClusters').onsuccess = (event) => {
    if (event.target.result !== undefined) {
      showClusters = event.target.result.value;
      const clusterToggle = document.getElementById('clusterToggle');
      clusterToggle.classList.toggle('active', showClusters);
      clusterToggle.textContent = showClusters ? 'Stop Animation' : 'Start Animation';
    }
  };

  // Load show rotation
  objectStore.get('showRotation').onsuccess = (event) => {
    if (event.target.result !== undefined) {
      showRotation = event.target.result.value;
      const rotationToggle = document.getElementById('rotationToggle');
      rotationToggle.classList.toggle('active', showRotation);
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
      shapeToggle.textContent = useSquares ? 'Use Circles' : 'Use Squares';
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
}

// Prime number checking function
function isPrime(n) {
  if (n < 2) return false
  if (n === 2) return true
  if (n % 2 === 0) return false
  for (let i = 3; i * i <= n; i += 2) {
    if (n % i === 0) return false
  }
  return true
}

function resize() {
  canvas.width  = innerWidth
  canvas.height = innerHeight
  computePoints()
  initClusters()
}

function computePoints() {
  const W = canvas.width, H = canvas.height, cx = W/2, cy = H/2
  points = []

  // Performance safety: limit computation for very large values
  const effectiveMaxN = Math.min(maxN, 2000000) // Hard cap at 2M points

  // Calculate diagonal to ensure rotated content covers entire screen
  const diagonal = Math.sqrt(W * W + H * H)
  const margin = diagonal / 2

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

  for (const p of points) {
    let factor = 0
    if (showClusters) {
      for (const c of clusters) {
        const dx = p.x - c.x, dy = p.y - c.y
        if (Math.abs(dx) < clusterRadius && Math.abs(dy) < clusterRadius) {
          const fx = 1 - Math.abs(dx) / clusterRadius
          const fy = 1 - Math.abs(dy) / clusterRadius
          const squareFalloff = Math.min(fx, fy)
          factor = Math.max(factor, squareFalloff)
        }
      }
    }

    // Calculate size based on base size, prime multiplier, and cluster effect
    let baseSize = dotSize
    if (showPrimes && p.isPrime) {
      baseSize *= primeSize
    }
    const size = baseSize + factor * sizeBoost
    const offsetY = -factor * liftHeight

    // Set color based on prime status and toggle state
    if (showPrimes && p.isPrime) {
      ctx.fillStyle = '#00ff00' // Green for primes
    } else {
      ctx.fillStyle = '#009900' // Darker green for non-primes or when toggle is off
    }

    // Draw either circle or square based on toggle
    if (useSquares) {
      ctx.fillRect(p.x - size/2, p.y + offsetY - size/2, size, size)
    } else {
      ctx.beginPath()
      ctx.arc(p.x, p.y + offsetY, size/2, 0, 2*Math.PI)
      ctx.fill()
    }
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

// scroll-to-zoom
function clamp(v,min,max){ return Math.max(min, Math.min(max, v)) }
window.addEventListener('wheel', e => {
  e.preventDefault()
  scale = clamp(scale * (e.deltaY>0 ? 1.05 : 0.95), 2, 200)
  savePreference('scale', scale)
  computePoints()
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
  savePreference('sidebarCollapsed', isCollapsed)
})

// Prime toggle functionality
const primeToggle = document.getElementById('primeToggle')
primeToggle.addEventListener('click', () => {
  showPrimes = !showPrimes
  primeToggle.classList.toggle('active', showPrimes)
  primeToggle.textContent = showPrimes ? 'Default Prime Numbers' : 'Highlight Prime Numbers'
  savePreference('showPrimes', showPrimes)
})

// Cluster toggle functionality
const clusterToggle = document.getElementById('clusterToggle')
clusterToggle.addEventListener('click', () => {
  showClusters = !showClusters
  clusterToggle.classList.toggle('active', showClusters)
  clusterToggle.textContent = showClusters ? 'Stop Animation' : 'Start Animation'
  savePreference('showClusters', showClusters)
})

// Rotation toggle functionality
const rotationToggle = document.getElementById('rotationToggle')
rotationToggle.addEventListener('click', () => {
  showRotation = !showRotation
  rotationToggle.classList.toggle('active', showRotation)
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
  shapeToggle.textContent = useSquares ? 'Use Circles' : 'Use Squares'
  savePreference('useSquares', useSquares)
})

// Spiral coefficient slider functionality
const spiralSlider = document.getElementById('spiralSlider')
const spiralNumber = document.getElementById('spiralNumber')

spiralSlider.addEventListener('input', (e) => {
  spiralCoeff = parseFloat(e.target.value)
  spiralNumber.value = spiralCoeff
  savePreference('spiralCoeff', spiralCoeff)
  computePoints()
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
    computePoints()
  }
})

// Max N slider functionality
const maxNSlider = document.getElementById('maxNSlider')
const maxNNumber = document.getElementById('maxNNumber')

maxNSlider.addEventListener('input', (e) => {
  maxN = parseInt(e.target.value)
  maxNNumber.value = maxN
  savePreference('maxN', maxN)
  computePoints()
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
    computePoints()
  }
})

// Cluster count slider functionality
const clusterCountSlider = document.getElementById('clusterCountSlider')
const clusterCountNumber = document.getElementById('clusterCountNumber')

clusterCountSlider.addEventListener('input', (e) => {
  clusterCount = parseInt(e.target.value)
  clusterCountNumber.value = clusterCount
  savePreference('clusterCount', clusterCount)
  initClusters()
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
    initClusters()
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

window.addEventListener('resize', resize)
initDB()
resize()
requestAnimationFrame(drawFrame)
