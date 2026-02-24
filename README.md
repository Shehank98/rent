# RentHub — Rental Marketplace

A modern, fully client-side rental marketplace built with HTML, CSS, Vanilla JavaScript, and Firebase.

## Features

- Google Sign-In authentication
- Post rental ads (Vans, Cars, Wedding, Construction, Party, Other)
- Image upload to Firebase Storage
- Admin review + approve/reject system
- Featured ad system with expiry
- Search by keyword, category, and location
- WhatsApp contact integration
- Fully responsive, mobile-first design
- GitHub Pages compatible (100% static)

---

## Project Structure

```
/
├── index.html          # Homepage (hero, search, categories, featured & latest ads)
├── listings.html       # Browse all listings with filters & sort
├── ad.html             # Single ad detail page with gallery & contact
├── dashboard.html      # User dashboard (post ad, my ads)
├── admin.html          # Admin panel (review, approve, reject, feature)
├── style.css           # All styles (CSS custom properties, responsive)
├── main.js             # Shared utilities, auth helpers, toast system
├── firebase.js         # Firebase SDK initialization & exports
├── firestore.rules     # Firestore security rules
├── storage.rules       # Firebase Storage security rules
└── README.md
```

---

## Setup Guide

### Step 1 — Create Firebase Project

1. Go to [https://console.firebase.google.com](https://console.firebase.google.com)
2. Click **Add project** → name it (e.g. `renthub`) → Continue
3. Disable Google Analytics if not needed → **Create project**

---

### Step 2 — Enable Firebase Authentication

1. In the Firebase console, click **Authentication** → **Get started**
2. Click **Sign-in method** tab
3. Enable **Google** as a sign-in provider
4. Set your project's **support email**
5. Click **Save**

---

### Step 3 — Create Firestore Database

1. Click **Firestore Database** → **Create database**
2. Choose **Start in production mode**
3. Select your preferred region → **Enable**

---

### Step 4 — Enable Firebase Storage

1. Click **Storage** → **Get started**
2. Start in production mode → choose same region → **Done**

---

### Step 5 — Get Your Firebase Config

1. Click the **gear icon** (Project settings)
2. Under **Your apps**, click **</>** (Web)
3. Register your app with a nickname (e.g. `renthub-web`)
4. Copy the `firebaseConfig` object

---

### Step 6 — Update `firebase.js`

Open `firebase.js` and replace the placeholder config:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
};
```

---

### Step 7 — Add Authorized Domain for Auth

1. Firebase Console → **Authentication** → **Settings** → **Authorized domains**
2. Add your GitHub Pages domain: `YOUR_USERNAME.github.io`

---

### Step 8 — Deploy Firestore Security Rules

Install the Firebase CLI:
```bash
npm install -g firebase-tools
firebase login
firebase init firestore
```

Copy the contents of `firestore.rules` into your project's rules file, then:
```bash
firebase deploy --only firestore:rules
```

Or paste the rules directly in **Firestore → Rules** tab in the Firebase console.

---

### Step 9 — Deploy Storage Security Rules

Paste the contents of `storage.rules` into **Storage → Rules** tab in the Firebase console, or:
```bash
firebase deploy --only storage
```

---

### Step 10 — Set Admin Role

To make a user an admin:

1. Sign in to the site once with Google (this creates their user document)
2. Go to **Firebase Console → Firestore → users** collection
3. Find the document for your user (by UID or email)
4. Edit the `role` field from `"user"` to `"admin"`
5. That user can now access `/admin.html`

> **Security note:** The admin role is enforced both client-side (redirect) and server-side (Firestore rules). Users cannot self-assign the admin role.

---

## GitHub Pages Deployment

### Option A — Deploy from root (simplest)

1. Push all files to the `main` branch of your GitHub repo
2. Go to **Settings → Pages**
3. Source: **Deploy from a branch** → branch: `main` / folder: `/ (root)`
4. Click **Save**
5. Your site will be live at `https://YOUR_USERNAME.github.io/REPO_NAME/`

### Option B — Deploy from `/docs` folder

1. Create a `/docs` folder and move all files into it
2. In GitHub Pages settings, set source folder to `/docs`

### Notes
- No build step required — pure static HTML/CSS/JS
- All Firebase calls happen client-side via the Firebase Web SDK (CDN)
- CORS is handled automatically by Firebase Storage

---

## Firestore Database Structure

```
Collection: users
  Document: {uid}
    - uid: string
    - name: string
    - email: string
    - photoURL: string
    - role: "user" | "admin"
    - createdAt: timestamp

Collection: ads
  Document: {auto-id}
    - userId: string        (UID of creator)
    - userName: string
    - userEmail: string
    - title: string
    - category: "Van" | "Car" | "Wedding" | "Construction" | "Party" | "Other"
    - price: number
    - priceType: "day" | "km" | "week" | "month" | "event"
    - location: string
    - phone: string
    - description: string
    - imageUrls: string[]   (Firebase Storage URLs)
    - status: "pending" | "approved" | "rejected"
    - featured: boolean
    - featuredUntil: timestamp | null
    - rejectionReason: string (optional)
    - createdAt: timestamp
    - updatedAt: timestamp
```

---

## Ad Workflow

```
User posts ad
     ↓
status = "pending"
     ↓
Admin reviews in admin.html
     ↓
   Approve → status = "approved" → visible on public site
   Reject  → status = "rejected" → user sees rejection in dashboard
     ↓
Admin can optionally "Feature" an approved ad
   → featured = true
   → featuredUntil = now + N days
   → Ad appears in Featured section on homepage
   → Featured badge shown on listing card and ad page
   → Automatically hides after expiry (client-side date check)
```

---

## Customisation Tips

| What to change | Where |
|---|---|
| Site name "RentHub" | All HTML files (nav-brand), README |
| Colors | `style.css` → `:root` CSS variables |
| Categories | `main.js` → `CATEGORIES` array + all dropdowns |
| Currency symbol (R) | `main.js` → `formatPrice()` |
| WhatsApp country code | `ad.html` → `formatWhatsApp()` |
| Max images per ad | `dashboard.html` → `MAX` constant |
| Max image size | `dashboard.html` → `5 * 1024 * 1024` |

---

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | HTML5, CSS3, Vanilla JavaScript (ES Modules) |
| Auth | Firebase Authentication (Google) |
| Database | Firebase Firestore |
| Storage | Firebase Storage |
| Hosting | GitHub Pages (static) |
| SDK | Firebase Web SDK v10 (CDN ESM) |

---

## License

MIT — free to use and modify for personal and commercial projects.
