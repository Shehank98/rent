// ============================================================
// main.js — Shared utilities, auth helpers, UI components
// ============================================================

import {
  auth, db, googleProvider,
  signInWithPopup, signOut, onAuthStateChanged,
  collection, doc, getDoc, setDoc, serverTimestamp,
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
  const icons = { success: "✓", error: "✕", warning: "⚠", info: "ℹ" };
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${icons[type] || icons.info}</span><span>${message}</span>`;
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

/** Sign in with Google popup */
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

/** Sign out */
export async function signOutUser() {
  try {
    await signOut(auth);
    showToast("Signed out successfully", "success");
    window.location.href = "index.html";
  } catch (err) {
    showToast("Sign-out failed: " + err.message, "error");
  }
}

/** Create or update user document in Firestore */
export async function ensureUserDoc(user) {
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
  }
  return snap.data() || {};
}

/** Get current user role from Firestore */
export async function getUserRole(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  if (snap.exists()) return snap.data().role || "user";
  return "user";
}

/** Get full user data from Firestore */
export async function getUserData(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  if (snap.exists()) return snap.data();
  return null;
}

// ============================================================
// AUTH STATE — Navbar & Session
// ============================================================

/**
 * Initialise navbar based on auth state.
 * Looks for elements: #nav-login-btn, #nav-user-menu, #nav-user-name,
 * #nav-user-avatar, #nav-logout-btn, #nav-dashboard-link, #nav-admin-link
 */
export function initNavbar() {
  const loginBtn = document.getElementById("nav-login-btn");
  const userMenu = document.getElementById("nav-user-menu");
  const userName = document.getElementById("nav-user-name");
  const userAvatar = document.getElementById("nav-user-avatar");
  const logoutBtn = document.getElementById("nav-logout-btn");
  const dashboardLink = document.getElementById("nav-dashboard-link");
  const adminLink = document.getElementById("nav-admin-link");
  const hamburger = document.getElementById("hamburger");
  const mobileNav = document.getElementById("mobile-nav");

  if (hamburger && mobileNav) {
    hamburger.addEventListener("click", () => {
      mobileNav.classList.toggle("open");
    });
  }

  onAuthStateChanged(auth, async (user) => {
    if (user) {
      if (loginBtn) loginBtn.classList.add("hidden");
      if (userMenu) userMenu.classList.remove("hidden");
      if (userName) userName.textContent = user.displayName?.split(" ")[0] || "User";
      if (userAvatar && user.photoURL) userAvatar.src = user.photoURL;
      if (dashboardLink) dashboardLink.classList.remove("hidden");

      // Show admin link if admin
      const role = await getUserRole(user.uid);
      if (adminLink && role === "admin") adminLink.classList.remove("hidden");
    } else {
      if (loginBtn) loginBtn.classList.remove("hidden");
      if (userMenu) userMenu.classList.add("hidden");
      if (dashboardLink) dashboardLink?.classList.add("hidden");
      if (adminLink) adminLink?.classList.add("hidden");
    }
  });

  if (logoutBtn) {
    logoutBtn.addEventListener("click", signOutUser);
  }

  if (loginBtn) {
    loginBtn.addEventListener("click", async () => {
      try {
        await signInWithGoogle();
        window.location.href = "dashboard.html";
      } catch (_) {}
    });
  }
}

/**
 * Require authentication — redirect to index.html if not logged in.
 * Returns the Firebase user.
 */
export function requireAuth(callback) {
  showLoading("Checking session...");
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      unsubscribe();
      hideLoading();
      if (!user) {
        showToast("Please sign in to continue", "warning");
        window.location.href = "index.html";
        return;
      }
      if (callback) await callback(user);
      resolve(user);
    });
  });
}

/**
 * Require admin role — redirect to index.html if not admin.
 */
export function requireAdmin(callback) {
  showLoading("Verifying access...");
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      unsubscribe();
      if (!user) {
        hideLoading();
        showToast("Please sign in to continue", "warning");
        window.location.href = "index.html";
        return;
      }
      const role = await getUserRole(user.uid);
      hideLoading();
      if (role !== "admin") {
        showToast("Access denied: Admin only", "error");
        window.location.href = "index.html";
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

/** Format price display */
export function formatPrice(price, priceType = "day") {
  const num = parseFloat(price);
  if (isNaN(num)) return price;
  return `R ${num.toLocaleString("en-ZA", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} / ${priceType}`;
}

/** Format date from Firestore Timestamp or JS Date */
export function formatDate(timestamp) {
  if (!timestamp) return "—";
  let date;
  if (timestamp.toDate) date = timestamp.toDate();
  else if (timestamp instanceof Date) date = timestamp;
  else date = new Date(timestamp);
  return date.toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" });
}

/** Get relative time string */
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

/** Check if featured badge is still valid */
export function isFeaturedActive(featuredUntil) {
  if (!featuredUntil) return false;
  const until = featuredUntil.toDate ? featuredUntil.toDate() : new Date(featuredUntil);
  return until > new Date();
}

/** Get remaining featured days */
export function featuredDaysLeft(featuredUntil) {
  if (!featuredUntil) return 0;
  const until = featuredUntil.toDate ? featuredUntil.toDate() : new Date(featuredUntil);
  const diff = until - new Date();
  if (diff <= 0) return 0;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/** Build ad card HTML */
export function buildAdCard(ad, id) {
  const featured = isFeaturedActive(ad.featuredUntil);
  const img = (ad.imageUrls && ad.imageUrls[0]) || "https://placehold.co/400x250/e2e8f0/94a3b8?text=No+Image";
  const price = formatPrice(ad.price, ad.priceType || "day");
  const ago = timeAgo(ad.createdAt);

  return `
    <a href="ad.html?id=${id}" class="card ${featured ? "featured-card" : ""}" style="display:block; text-decoration:none;">
      <div class="card-img-wrap">
        <img src="${img}" alt="${escapeHtml(ad.title)}" loading="lazy" onerror="this.src='https://placehold.co/400x250/e2e8f0/94a3b8?text=No+Image'">
        <div class="card-badges">
          <span class="badge badge-category">${escapeHtml(ad.category || "Other")}</span>
        </div>
        ${featured ? `<div class="featured-badge-overlay">⭐ Featured</div>` : ""}
      </div>
      <div class="card-body">
        <div class="card-title">${escapeHtml(ad.title)}</div>
        <div class="card-price">${price}</div>
        <div class="card-meta">
          <span>📍 ${escapeHtml(ad.location || "")}</span>
          <span>🕐 ${ago}</span>
        </div>
      </div>
    </a>
  `;
}

/** Escape HTML to prevent XSS */
export function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Get URL search param */
export function getParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

/** Debounce function */
export function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/** Render skeleton cards */
export function renderSkeletons(container, count = 4) {
  container.innerHTML = Array.from({ length: count }, () => `
    <div class="skeleton skeleton-card"></div>
  `).join("");
}

/** Category icons map */
export const CATEGORY_ICONS = {
  "Van": "🚐",
  "Car": "🚗",
  "Wedding": "💍",
  "Construction": "🏗️",
  "Party": "🎉",
  "Other": "📦",
};

export const CATEGORIES = ["Van", "Car", "Wedding", "Construction", "Party", "Other"];

/** Category icon helper */
export function categoryIcon(cat) {
  return CATEGORY_ICONS[cat] || "📦";
}
