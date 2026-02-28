// ============================================================
// main.js — Shared utilities, auth helpers, UI components
// ============================================================

import {
  auth, db, googleProvider,
  signInWithPopup, signOut, onAuthStateChanged,
  collection, doc, getDoc, getDocs, setDoc, serverTimestamp,
} from "./firebase.js";

// ============================================================
// TOAST NOTIFICATION SYSTEM
// ============================================================
let toastContainer = null;

function getToastContainer() {
  if (!toastContainer) {
    toastContainer = document.createElement("div");
    toastContainer.className = "toast-container";
    document.body.appendChild(toastContainer);
  }
  return toastContainer;
}

export function showToast(message, type = "info", duration = 3500) {
  const container = getToastContainer();
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add("exit");
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ============================================================
// LOADING OVERLAY
// ============================================================
let loadingOverlay = null;

export function showLoading(text = "Loading...") {
  if (!loadingOverlay) {
    loadingOverlay = document.createElement("div");
    loadingOverlay.className = "loading-overlay";
    document.body.appendChild(loadingOverlay);
  }
  loadingOverlay.innerHTML = `
    <div class="spinner"></div>
    <p class="loading-text">${text}</p>
  `;
  loadingOverlay.style.display = "flex";
}

export function hideLoading() {
  if (loadingOverlay) loadingOverlay.style.display = "none";
}

// ============================================================
// AUTHENTICATION HELPERS
// ============================================================

export async function signInWithGoogle() {
  try {
    showLoading("Signing in...");
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    await ensureUserDoc(user);
    hideLoading();
    return user;
  } catch (err) {
    hideLoading();
    if (err.code !== "auth/popup-closed-by-user") {
      showToast("Sign-in failed: " + err.message, "error");
    }
    throw err;
  }
}

export async function signOutUser() {
  try {
    await signOut(auth);
    showToast("Signed out successfully", "success");
    window.location.href = "/";
  } catch (err) {
    showToast("Sign-out failed: " + err.message, "error");
  }
}

export async function ensureUserDoc(user) {
  try {
    const userRef = doc(db, "users", user.uid);
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      await setDoc(userRef, {
        uid: user.uid,
        name: user.displayName || "User",
        email: user.email || "",
        photoURL: user.photoURL || "",
        role: "user",
        createdAt: serverTimestamp(),
      });
      return {};
    }
    return snap.data() || {};
  } catch (err) {
    // Firestore rules may not be deployed yet — fail silently
    console.warn("ensureUserDoc:", err.message);
    return {};
  }
}

export async function getUserRole(uid) {
  try {
    const snap = await getDoc(doc(db, "users", uid));
    if (snap.exists()) return snap.data().role || "user";
    return "user";
  } catch (_) {
    // Rules not deployed or insufficient permissions — default to user
    return "user";
  }
}

export async function getUserData(uid) {
  try {
    const snap = await getDoc(doc(db, "users", uid));
    if (snap.exists()) return snap.data();
    return null;
  } catch (_) {
    return null;
  }
}

// ============================================================
// NAVBAR — with user dropdown + role-based links
// ============================================================

export function initNavbar() {
  const loginBtn      = document.getElementById("nav-login-btn");
  const userWrap      = document.getElementById("nav-user-wrap");
  const userBtn       = document.getElementById("nav-user-btn");
  const userDropdown  = document.getElementById("nav-user-dropdown");
  const userName      = document.getElementById("nav-user-name");
  const userAvatar    = document.getElementById("nav-user-avatar");
  const logoutBtn     = document.getElementById("nav-logout-btn");
  const mobLogoutBtn  = document.getElementById("mob-logout-btn");
  const dropAdminLink = document.getElementById("dropdown-admin-link");
  const navAdminLink  = document.getElementById("nav-admin-link");
  const mobAdminLink  = document.getElementById("mob-admin-link");
  const dropEmail     = document.getElementById("dropdown-user-email");
  const hamburger     = document.getElementById("hamburger");
  const mobileNav     = document.getElementById("mobile-nav");

  // Hamburger
  if (hamburger && mobileNav) {
    hamburger.addEventListener("click", () => mobileNav.classList.toggle("open"));
  }

  // Dropdown toggle
  if (userBtn && userDropdown) {
    userBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      userDropdown.classList.toggle("open");
    });
    document.addEventListener("click", (e) => {
      if (userWrap && !userWrap.contains(e.target)) {
        userDropdown.classList.remove("open");
      }
    });
  }

  // Logout handlers
  if (logoutBtn)    logoutBtn.addEventListener("click", signOutUser);
  if (mobLogoutBtn) mobLogoutBtn.addEventListener("click", signOutUser);

  // Login handler
  if (loginBtn) {
    loginBtn.addEventListener("click", async () => {
      try {
        await signInWithGoogle();
        window.location.href = "/dashboard/";
      } catch (_) {}
    });
  }

  // Auth state observer
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      if (loginBtn)     loginBtn.classList.add("hidden");
      if (userWrap)     userWrap.classList.remove("hidden");
      if (mobLogoutBtn) mobLogoutBtn.classList.remove("hidden");
      if (userName)     userName.textContent = user.displayName?.split(" ")[0] || "User";
      if (userAvatar && user.photoURL) userAvatar.src = user.photoURL;
      if (dropEmail)    dropEmail.textContent = user.email || "";

      // getUserRole is already try-caught — will not throw
      const role = await getUserRole(user.uid);
      if (role === "admin") {
        if (dropAdminLink) dropAdminLink.classList.remove("hidden");
        if (navAdminLink)  navAdminLink.classList.remove("hidden");
        if (mobAdminLink)  mobAdminLink.classList.remove("hidden");
      }
    } else {
      if (loginBtn)     loginBtn.classList.remove("hidden");
      if (userWrap)     userWrap.classList.add("hidden");
      if (mobLogoutBtn) mobLogoutBtn?.classList.add("hidden");
    }
  });
}

// ============================================================
// AUTH GUARDS
// ============================================================

export function requireAuth(callback) {
  showLoading("Verifying session...");
  return new Promise((resolve) => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      unsub();
      hideLoading();
      if (!user) {
        showToast("Please sign in to continue", "warning");
        window.location.href = "/";
        return;
      }
      if (callback) await callback(user);
      resolve(user);
    });
  });
}

export function requireAdmin(callback) {
  showLoading("Verifying access...");
  return new Promise((resolve) => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      unsub();
      if (!user) {
        hideLoading();
        showToast("Please sign in to continue", "warning");
        window.location.href = "/";
        return;
      }
      const role = await getUserRole(user.uid);
      hideLoading();
      if (role !== "admin") {
        showToast("Access denied: Admins only", "error");
        window.location.href = "/";
        return;
      }
      if (callback) await callback(user);
      resolve(user);
    });
  });
}

// ============================================================
// UTILITIES
// ============================================================

export function formatPrice(price, priceType = "day") {
  const num = parseFloat(price);
  if (isNaN(num)) return price || "-";
  const labels = { day: "Day", km: "KM", week: "Week", month: "Month", event: "Event", hour: "Hour" };
  return `Rs. ${num.toLocaleString("en-LK")} / ${labels[priceType] || priceType}`;
}

export function formatDate(timestamp) {
  if (!timestamp) return "-";
  let date;
  if (timestamp.toDate) date = timestamp.toDate();
  else if (timestamp instanceof Date) date = timestamp;
  else date = new Date(timestamp);
  return date.toLocaleDateString("en-LK", { day: "numeric", month: "short", year: "numeric" });
}

export function timeAgo(timestamp) {
  if (!timestamp) return "";
  let date;
  if (timestamp.toDate) date = timestamp.toDate();
  else date = new Date(timestamp);
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(timestamp);
}

export function isFeaturedActive(featuredUntil) {
  if (!featuredUntil) return false;
  const until = featuredUntil.toDate ? featuredUntil.toDate() : new Date(featuredUntil);
  return until > new Date();
}

export function featuredDaysLeft(featuredUntil) {
  if (!featuredUntil) return 0;
  const until = featuredUntil.toDate ? featuredUntil.toDate() : new Date(featuredUntil);
  const diff = until - new Date();
  if (diff <= 0) return 0;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function buildAdCard(ad, id) {
  const featured = isFeaturedActive(ad.featuredUntil);
  const img = (ad.imageUrls && ad.imageUrls[0]) || "https://placehold.co/400x250/e2e8f0/94a3b8?text=No+Image";
  const price = formatPrice(ad.price, ad.priceType || "day");
  const ago = timeAgo(ad.createdAt);
  const verifiedBadge = ad.userVerified
    ? `<span class="card-verified-badge"><i class="bi bi-patch-check-fill"></i> Verified</span>`
    : "";
  const negotiableBadge = ad.negotiable
    ? `<span class="card-negotiable-badge"><i class="bi bi-chat-dots-fill"></i> Negotiable</span>`
    : "";
  const videoBadge = ad.youtubeUrl
    ? `<span class="card-video-badge"><i class="bi bi-play-circle-fill"></i> Video</span>`
    : "";

  return `
    <a href="/ad/?id=${id}" class="card ${featured ? "featured-card" : ""}" style="text-decoration:none;">
      ${featured ? `<div class="featured-ribbon"><i class="bi bi-star-fill"></i> Featured</div>` : ""}
      <div class="card-img-wrap">
        <img src="${img}" alt="${escapeHtml(ad.title)}" loading="lazy"
             onerror="this.src='https://placehold.co/400x250/e2e8f0/94a3b8?text=No+Image'">
        <div class="card-badges">
          <span class="badge badge-category">${escapeHtml(ad.category || "Other")}</span>
          ${videoBadge}
        </div>
      </div>
      <div class="card-body">
        <div class="card-title">${escapeHtml(ad.title)}</div>
        <div class="card-price">${price}</div>
        <div class="card-meta">
          <span><i class="bi bi-geo-alt"></i> ${escapeHtml(ad.location || "")}</span>
          <span><i class="bi bi-clock"></i> ${ago}</span>
        </div>
        <div class="card-badge-row">${verifiedBadge}${negotiableBadge}</div>
      </div>
    </a>
  `;
}

export function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

export function getParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

export function debounce(fn, delay = 300) {
  let timer;
  return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), delay); };
}

export function renderSkeletons(container, count = 4) {
  container.innerHTML = Array.from({ length: count }, () =>
    `<div class="skeleton skeleton-card"></div>`).join("");
}

// ============================================================
// CATEGORIES — Comprehensive rental categories
// ============================================================

export const CATEGORY_GROUPS = {
  "Vehicles":           ["Car", "Van", "Motorcycle", "Truck / Lorry", "Bus / Coach", "Tuk Tuk", "Boat"],
  "Wedding & Events":   ["Wedding Car", "Wedding Decor", "Sound & Lighting", "Event Tent / Marquee", "DJ Equipment"],
  "Construction":       ["Heavy Machinery", "Construction Equipment", "Generator", "Power Tools", "Scaffolding"],
  "Property":           ["House / Villa", "Apartment / Room", "Commercial Space"],
  "Electronics & Media":["Camera & Photography", "Video Equipment", "AV Equipment", "Computer & IT"],
  "Party & Leisure":    ["Party Items", "Bouncy Castle", "Sports Equipment", "Bicycle", "Camping Gear"],
  "Clothing":           ["Formal Wear", "Costume & Theatrical"],
  "Other":              ["Other"],
};

export const CATEGORIES = Object.values(CATEGORY_GROUPS).flat();

export const CATEGORY_ICONS = {
  "Car":                   "bi-car-front",
  "Van":                   "bi-truck",
  "Motorcycle":            "bi-bicycle",
  "Truck / Lorry":         "bi-truck-front-fill",
  "Bus / Coach":           "bi-bus-front",
  "Tuk Tuk":               "bi-taxi-front",
  "Boat":                  "bi-water",
  "Wedding Car":           "bi-heart",
  "Wedding Decor":         "bi-flower1",
  "Sound & Lighting":      "bi-speaker-fill",
  "Event Tent / Marquee":  "bi-umbrella",
  "DJ Equipment":          "bi-music-note-beamed",
  "Heavy Machinery":       "bi-gear-wide-connected",
  "Construction Equipment":"bi-tools",
  "Generator":             "bi-lightning-charge-fill",
  "Power Tools":           "bi-wrench-adjustable-circle",
  "Scaffolding":           "bi-ladder",
  "House / Villa":         "bi-house-door",
  "Apartment / Room":      "bi-building",
  "Commercial Space":      "bi-shop",
  "Camera & Photography":  "bi-camera",
  "Video Equipment":       "bi-camera-video",
  "AV Equipment":          "bi-display",
  "Computer & IT":         "bi-laptop",
  "Party Items":           "bi-gift",
  "Bouncy Castle":         "bi-balloon",
  "Sports Equipment":      "bi-trophy",
  "Bicycle":               "bi-bicycle",
  "Camping Gear":          "bi-tree",
  "Formal Wear":           "bi-person-badge",
  "Costume & Theatrical":  "bi-mask",
  "Other":                 "bi-box2",
};

/** Populate a <select> element with grouped category options (synchronous, defaults only) */
export function buildCategorySelect(selectEl, includeAll = false) {
  let html = includeAll
    ? `<option value="">All Categories</option>`
    : `<option value="">Select a category</option>`;
  Object.entries(CATEGORY_GROUPS).forEach(([group, cats]) => {
    html += `<optgroup label="${group}">`;
    cats.forEach(cat => { html += `<option value="${escapeHtml(cat)}">${escapeHtml(cat)}</option>`; });
    html += `</optgroup>`;
  });
  selectEl.innerHTML = html;
}

/**
 * Populate a <select> with default + custom Firestore categories (async).
 * Preserves current value if still valid after rebuild.
 */
export async function buildCategorySelectAsync(selectEl, includeAll = false) {
  const groups = {};
  // Copy defaults
  Object.entries(CATEGORY_GROUPS).forEach(([g, cats]) => { groups[g] = [...cats]; });
  // Merge custom categories from Firestore
  try {
    const snap = await getDocs(collection(db, "categories"));
    snap.forEach(d => {
      const { name, group } = d.data();
      if (name && group) {
        if (!groups[group]) groups[group] = [];
        if (!groups[group].includes(name)) groups[group].push(name);
      }
    });
  } catch (_) {}

  const prev = selectEl.value;
  let html = includeAll
    ? `<option value="">All Categories</option>`
    : `<option value="">Select a category</option>`;
  Object.entries(groups).forEach(([group, cats]) => {
    html += `<optgroup label="${escapeHtml(group)}">`;
    cats.forEach(cat => { html += `<option value="${escapeHtml(cat)}">${escapeHtml(cat)}</option>`; });
    html += `</optgroup>`;
  });
  selectEl.innerHTML = html;
  if (prev) selectEl.value = prev;
}

// ============================================================
// SRI LANKA — Cities & Provinces
// ============================================================

export const SL_CITIES = [
  "Colombo", "Kandy", "Galle", "Jaffna", "Negombo", "Batticaloa",
  "Trincomalee", "Matara", "Kurunegala", "Ratnapura", "Badulla",
  "Anuradhapura", "Polonnaruwa", "Ampara", "Vavuniya", "Mannar",
  "Hambantota", "Nuwara Eliya", "Kegalle", "Puttalam", "Kalutara",
  "Dambulla", "Matale", "Kalmunai", "Kilinochchi", "Mullaitivu",
  "Monaragala", "Avissawella", "Panadura", "Moratuwa", "Dehiwala",
  "Wattala", "Kelaniya", "Gampaha", "Chilaw", "Kuliyapitiya",
  "Mawanella", "Hatton", "Bandarawela", "Haputale", "Welimada",
  "Tangalle", "Tissamaharama", "Embilipitiya", "Balangoda",
  "Peradeniya", "Kaduwela", "Horana", "Piliyandala", "Kottawa",
  "Sri Jayawardenepura Kotte", "Ja-Ela", "Homagama", "Maharagama",
  "Nugegoda", "Boralesgamuwa", "Ragama", "Katunayake", "Seeduwa",
];

/** Build a datalist element with Sri Lanka cities */
export function buildLocationDatalist(datalistEl) {
  datalistEl.innerHTML = SL_CITIES.map(c => `<option value="${escapeHtml(c)}">`).join("");
}
