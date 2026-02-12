// Global map and state
let map;
let infoWindow;
let landmarks = []; // in-memory storage

// Expose initMap globally for Google Maps callback
window.initMap = initMap;

// Initialize Google Maps
function initMap() {
  // Rough default center on McMaster University
  const mapCenter = { lat: 43.2615047, lng: -79.9195802 };

  map = new google.maps.Map(document.getElementById("map"), {
    center: mapCenter,
    zoom: 14,
  });

  // Creates an info window that all markers use
  infoWindow = new google.maps.InfoWindow();

  // Use browser geolocation for initial map view (Extra Feature #1)
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const loc = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        map.setCenter(loc);
      },
      () => {
        // If user denies geolocation or it fails we keep McMasters location
        console.warn("Geolocation failed or denied.");
      }
    );
  }

  // Once map is ready we can call to set up DOM and event listeners
  setupFormHandlers();
}

// Create a DOM element
function createElement(tag, className, text) {
  const memory = document.createElement(tag);
  if (className) memory.className = className;
  if (text) memory.textContent = text;
  return memory;
}

// Read image file as Data URL (for in-memory storage)
function readImageFile(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      resolve(null);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Failed to read image file."));
    reader.readAsDataURL(file);
  });
}

// Setup form and buttons
function setupFormHandlers() {
  const form = document.getElementById("landmark-form");
  const useMyLocationBtn = document.getElementById("use-my-location");
  const latInput = document.getElementById("latitude");
  const lngInput = document.getElementById("longitude");

  // "Use my current location" button for setting coordinates
  useMyLocationBtn.addEventListener("click", () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported in this browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        latInput.value = position.coords.latitude.toFixed(6);
        lngInput.value = position.coords.longitude.toFixed(6);
      },
      () => {
        alert("Unable to retrieve your location.");
      }
    );
  });
  
// Ensuring that the form is filled out correctly before submitting (Extra Feature #5)
function validateForm({ title, description, imageFile, lat, lng }) {
  const error = document.getElementById("form-error");
  error.textContent = "";

  if (!title.trim()) {
    error.textContent = "Please enter a landmark title.";
    return false;
  }
  if (!description.trim()) {
    error.textContent = "Please enter a short description (1–3 sentences).";
    return false;
  }
  if (!imageFile) {
    error.textContent = "Please choose an image for this landmark.";
    return false;
  }
  if (typeof lat !== "number" || Number.isNaN(lat) ||
      typeof lng !== "number" || Number.isNaN(lng)) {
    error.textContent = "Please provide valid coordinates or use your current location.";
    return false;
  }
  return true;
}

  // Handle landmark form submission
  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const title = document.getElementById("title").value;
    const description = document.getElementById("description").value;
    const imageInput = document.getElementById("image");
    const imageFile = imageInput.files[0];

    const latValue = parseFloat(latInput.value);
    const lngValue = parseFloat(lngInput.value);

    if (!validateForm({ title, description, imageFile, lat: latValue, lng: lngValue })) {
      return;
    }

    try {
      const imageDataUrl = await readImageFile(imageFile);

      addLandmark({
        title,
        description,
        lat: latValue,
        lng: lngValue,
        imageDataUrl,
      });

      form.reset();
      document.getElementById("form-error").textContent = "";
    } catch (err) {
      console.error(err);
      document.getElementById("form-error").textContent =
        "There was a problem reading the image. Please try again.";
    }
  });
}

// This is how we will make the delete and show logic work. This initializes it
let nextLandmarkId = 1;

// Add a landmark object and marker
function addLandmark({ title, description, lat, lng, imageDataUrl }) {
  const id = String(nextLandmarkId++); //This will increment the nextLandmarkID  everytime a landmark is added so its unique

  const marker = new google.maps.Marker({
    position: { lat, lng },
    map,
    title,
  });

  const landmark = {
    id,
    title,
    description,
    lat,
    lng,
    imageDataUrl,
    visible: true,
    marker,
  };

  // Click the marker and show info window and highlight functions get called with the landmark being passed through it
  marker.addListener("click", () => {
    showLandmarkInfo(landmark);
    highlightLandmarkItem(landmark.id);
  });

  landmarks.push(landmark);
  renderLandmarkList();
}

// Show info window on the map
function showLandmarkInfo(landmark) {
  const content = document.createElement("div");
  const title = createElement("h3", null, landmark.title);
  const description = createElement("p", null, landmark.description);

  content.appendChild(title);
  content.appendChild(description);

  if (landmark.imageDataUrl) {
    const img = document.createElement("img");
    img.src = landmark.imageDataUrl;
    img.alt = landmark.title;
    img.style.maxWidth = "200px"; // Makes it not go beyond the borders of the window
    img.style.display = "block"; // Makes it so its in its own line and not next to the text
    img.style.marginTop = "8px"; // Adds a little space between the text and the image
    content.appendChild(img);
  }

  infoWindow.setContent(content);
  infoWindow.open({
    anchor: landmark.marker,
    map,
    shouldFocus: false,
  });
}

// Render the list of landmarks in the sidebar
function renderLandmarkList() {
  const list = document.getElementById("landmark-list");
  list.innerHTML = "";

  landmarks.forEach((lm) => {
    const li = createElement("li", "landmark-item");
    li.dataset.id = lm.id;

    const header = createElement("div", "landmark-item-header");
    const title = createElement("span", "landmark-item-title", lm.title);

    const controls = createElement("div", "landmark-item-controls");

    // Show/hide checkbox (Extra Feature #3)
    const toggleLabel = createElement("label", "landmark-toggle");
    const toggleCheckbox = document.createElement("input");
    toggleCheckbox.type = "checkbox";
    toggleCheckbox.checked = lm.visible;
    toggleCheckbox.addEventListener("change", () => {
      lm.visible = toggleCheckbox.checked;
      if (lm.visible) {
        lm.marker.setMap(map);
      } else {
        lm.marker.setMap(null);
      }
    });
    const toggleText = document.createTextNode("Show on map");
    toggleLabel.appendChild(toggleCheckbox);
    toggleLabel.appendChild(toggleText);

    // Delete button
    const deleteBtn = createElement("button", "landmark-delete-btn", "Delete");
    deleteBtn.addEventListener("click", () => {
      deleteLandmark(lm.id);
    });

    controls.appendChild(toggleLabel);
    controls.appendChild(deleteBtn);

    header.appendChild(title);
    header.appendChild(controls);

    const desc = createElement("p", "landmark-item-desc", lm.description);
    const meta = createElement(
      "p",
      "landmark-item-meta",
      `Lat: ${lm.lat.toFixed(5)}, Lng: ${lm.lng.toFixed(5)}`
    );

    li.appendChild(header);
    li.appendChild(desc);
    li.appendChild(meta);

    // Clicking list item recenters map and opens info
    li.addEventListener("click", (event) => {
      // Make Sure we're not centering if we're clicking the delete button or the toggle checkbox
      if (event.target === deleteBtn || event.target === toggleCheckbox) return;
      map.panTo({ lat: lm.lat, lng: lm.lng });
      showLandmarkInfo(lm);
      highlightLandmarkItem(lm.id);
    });

    list.appendChild(li);
  });
}

// Delete a landmark and remove its marker (Extra Feature #4)
function deleteLandmark(id) {
  const index = landmarks.findIndex((lm) => lm.id === id);
  if (index === -1) return;

  const [removed] = landmarks.splice(index, 1);
  if (removed.marker) {
    removed.marker.setMap(null);
  }

  renderLandmarkList();
}

// Highlight the corresponding list item when marker clicked (Extra Feature #2)
function highlightLandmarkItem(id) {
  const list = document.getElementById("landmark-list");
  const items = list.querySelectorAll(".landmark-item");
  items.forEach((item) => {
    if (item.dataset.id === id) {
      item.classList.add("landmark-item-active");
      item.scrollIntoView({ behavior: "smooth", block: "nearest" });
    } else {
      item.classList.remove("landmark-item-active");
    }
  });
}