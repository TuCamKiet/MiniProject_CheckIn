let map;
let marker;
let currentLat = null;
let currentLng = null;
let currentImageData = null;

// Initialize Map
function initMap() {
    // Default location (Hanoi, Vietnam)
    const defaultLocation = [21.0285, 105.8542];
    
    map = L.map('map').setView(defaultLocation, 13);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    marker = L.marker(defaultLocation, { draggable: true }).addTo(map);
    
    updateCoordinates(defaultLocation[0], defaultLocation[1]);

    // Handle marker drag
    marker.on('dragend', function(e) {
        const position = marker.getLatLng();
        updateCoordinates(position.lat, position.lng);
    });

    // Handle map click
    map.on('click', function(e) {
        marker.setLatLng(e.latlng);
        updateCoordinates(e.latlng.lat, e.latlng.lng);
    });
}

function updateCoordinates(lat, lng) {
    currentLat = lat;
    currentLng = lng;
    document.getElementById('latDisplay').textContent = lat.toFixed(6);
    document.getElementById('lngDisplay').textContent = lng.toFixed(6);
}

// Handle Current Location
document.getElementById('btnCurrentLocation').addEventListener('click', () => {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                map.setView([lat, lng], 15);
                marker.setLatLng([lat, lng]);
                updateCoordinates(lat, lng);
            },
            (error) => {
                alert('Unable to retrieve your location. Please check permissions.');
            }
        );
    } else {
        alert('Geolocation is not supported by your browser.');
    }
});

// Handle Location Search (using Nominatim API)
document.getElementById('btnSearch').addEventListener('click', async () => {
    const query = document.getElementById('locationSearch').value;
    if (!query) return;

    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`);
        const data = await response.json();
        
        if (data && data.length > 0) {
            const lat = parseFloat(data[0].lat);
            const lng = parseFloat(data[0].lon);
            map.setView([lat, lng], 15);
            marker.setLatLng([lat, lng]);
            updateCoordinates(lat, lng);
        } else {
            alert('Location not found.');
        }
    } catch (error) {
        console.error('Error searching location:', error);
        alert('Error searching location.');
    }
});

// Handle File Upload Button
document.getElementById('btnUploadClick').addEventListener('click', () => {
    document.getElementById('imageUpload').click();
});

// Handle Image Upload
document.getElementById('imageUpload').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {
            currentImageData = event.target.result;
            const preview = document.getElementById('imagePreview');
            preview.style.backgroundImage = `url(${currentImageData})`;
            preview.textContent = '';
        };
        reader.readAsDataURL(file);
    }
});

let cameraStreamTrack = null;

// Open Camera
document.getElementById('btnOpenCamera').addEventListener('click', async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        const video = document.getElementById('cameraStream');
        video.srcObject = stream;
        cameraStreamTrack = stream.getTracks()[0];
        
        document.getElementById('cameraContainer').style.display = 'block';
        document.getElementById('imagePreview').style.display = 'none';
    } catch (err) {
        alert('Could not access camera: ' + err.message);
    }
});

// Capture Photo
document.getElementById('btnCapture').addEventListener('click', () => {
    const video = document.getElementById('cameraStream');
    const canvas = document.getElementById('cameraCanvas');
    
    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const context = canvas.getContext('2d');
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Convert to image data
    currentImageData = canvas.toDataURL('image/jpeg', 0.8);
    
    // Stop camera
    stopCamera();
    
    // Show preview
    const preview = document.getElementById('imagePreview');
    preview.style.display = 'flex';
    preview.style.backgroundImage = `url(${currentImageData})`;
    preview.textContent = '';
});

// Cancel Camera
document.getElementById('btnCancelCamera').addEventListener('click', () => {
    stopCamera();
    document.getElementById('imagePreview').style.display = 'flex';
});

function stopCamera() {
    if (cameraStreamTrack) {
        cameraStreamTrack.stop();
        cameraStreamTrack = null;
    }
    document.getElementById('cameraContainer').style.display = 'none';
}

// Handle Save
document.getElementById('btnSave').addEventListener('click', () => {
    if (!currentImageData) {
        alert('Please upload an image first.');
        return;
    }

    const note = document.getElementById('noteInput').value;
    
    const checkin = {
        id: Date.now(),
        image: currentImageData,
        lat: currentLat,
        lng: currentLng,
        note: note,
        date: new Date().toLocaleString()
    };

    saveCheckin(checkin);
    renderCheckins();
    
    // Reset form
    document.getElementById('imageUpload').value = '';
    currentImageData = null;
    document.getElementById('imagePreview').style.backgroundImage = 'none';
    document.getElementById('imagePreview').textContent = 'No Image Selected';
    document.getElementById('noteInput').value = '';
});

// Local Storage operations
function getCheckins() {
    const data = localStorage.getItem('checkins');
    return data ? JSON.parse(data) : [];
}

function saveCheckin(checkin) {
    const checkins = getCheckins();
    checkins.unshift(checkin);
    // Limit to prevent local storage quota exceeded if images are large
    if(checkins.length > 20) checkins.pop(); 
    localStorage.setItem('checkins', JSON.stringify(checkins));
}

// Make deleteCheckin available globally for inline onclick handlers
window.deleteCheckin = function(id) {
    let checkins = getCheckins();
    checkins = checkins.filter(c => c.id !== id);
    localStorage.setItem('checkins', JSON.stringify(checkins));
    renderCheckins();
}

function renderCheckins() {
    const checkins = getCheckins();
    const list = document.getElementById('checkinList');
    list.innerHTML = '';

    checkins.forEach(checkin => {
        const card = document.createElement('div');
        card.className = 'checkin-card';
        
        card.innerHTML = `
            <img src="${checkin.image}" alt="Check-in Image">
            <div class="checkin-info">
                <p class="checkin-note">${checkin.note || 'No note'}</p>
                <p>📍 ${checkin.lat.toFixed(4)}, ${checkin.lng.toFixed(4)}</p>
                <p>📅 ${checkin.date}</p>
                <button class="btn-delete" onclick="deleteCheckin(${checkin.id})">Delete</button>
            </div>
        `;
        list.appendChild(card);
    });
}

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    initMap();
    renderCheckins();
    document.getElementById('imagePreview').textContent = 'No Image Selected';
});
