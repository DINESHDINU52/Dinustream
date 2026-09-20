# DinuStream Production Environment & Integration Setup Guide

This guide details the environment variables, networking topology, and credentials required to operate **DinuStream** in both local development and Oracle Cloud Infrastructure (OCI) production.

---

## 1. Security Rules & Boundary Invariants

> [!CAUTION]
> **NEVER COMMIT `.env.local` OR PRIVATE KEYS TO VERSION CONTROL**  
> `.env.local` is explicitly excluded in `.gitignore`. Any credentials placed in `.env.local` remain strictly local to your server/development workstation.

- **Server-Only Isolation**: Variables without the `NEXT_PUBLIC_` prefix are read exclusively by the Next.js Node.js server runtime (`process.env`). They are never bundled into client JavaScript or accessible to the browser.
- **Client-Safe Parameters**: Only variables prefixed with `NEXT_PUBLIC_` are delivered to the browser runtime. These are limited to internal API proxy paths and public Firebase client configuration.

---

## 2. Environment Variables Specification

### A. Server-Only Variables (Confidential)

| Variable Name | Default / Example Value | Description |
| :--- | :--- | :--- |
| `SYNC_MANAGER_API_URL` | `http://127.0.0.1:8787` | Address of the private Oracle Cloud Sync Manager service. In development, defaults to port `8787`. In production, set to your internal Oracle VPC endpoint (e.g. `http://10.0.0.x:8787`). |
| `SYNC_MANAGER_API_KEY` | *(Secret Token)* | Private bearer token required by the Sync Manager for authorizing media download and caching requests. |
| `JELLYFIN_SERVER_URL` | `http://127.0.0.1:8096` | Internal address of the Jellyfin Media Server on Oracle Cloud. Handled exclusively via the `/api/jellyfin` proxy. |
| `JELLYFIN_API_KEY` | *(Secret Token)* | Administrative or API user token for authenticating queries against the Jellyfin media catalog. |
| `JELLYFIN_USER_ID` | *(User UUID)* | Target Jellyfin user identifier for tracking playback state, resume timestamps, and user favorites. |
| `ADMIN_MASTER_PIN` | `1337` | Secure master PIN used by `/api/auth/verify-pin` to authorize access to the DinuStream Operations Center. |

### B. Client-Safe Variables (`NEXT_PUBLIC_`)

| Variable Name | Default Value | Description |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_SYNC_MANAGER_BASE_URL` | `/api/sync` | Internal relative proxy path used by the browser to initiate sync jobs and poll cache status. |
| `NEXT_PUBLIC_JELLYFIN_PROXY_URL` | `/api/jellyfin` | Internal relative proxy path used by the browser to fetch media metadata and stream playback info. |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | *(Firebase Web Key)* | Public Firebase Web API Key for initializing the client-side real-time database SDK. |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | `your-app.firebaseapp.com` | Firebase authorization domain for the real-time project. |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | `your-project-id` | Firebase Google Cloud project identifier. |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | `your-app.appspot.com` | Firebase storage bucket endpoint. |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`| `your-sender-id` | Firebase Cloud Messaging sender identifier. |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | `1:...:web:...` | Unique application ID for the Firebase Web Client. |

---

## 3. Proxy Architecture & Networking

The browser client **never** makes direct connections to private backend infrastructure:

```
[ Browser / Public Client ]
             │
             ├── /api/sync/* ───────► [ Next.js Server ] ──► [ Sync Manager (8787) ] ──► [ rclone / Google Drive ]
             │                                                    │
             │                                                    └──► [ Oracle NVMe SSD Cache ]
             │
             ├── /api/jellyfin/* ───► [ Next.js Server ] ──► [ Jellyfin Server (8096) ]
             │
             └── Firebase Realtime ─► [ Firestore / RTDB ] (Watch Together Chat, Reactions & Presence Only)
```

- **Sync Manager Port**: `8787` is strictly an internal port. The browser communicates through `/api/sync/movie`, `/api/sync/status/<filename>`, and `/api/sync/health`.
- **Jellyfin Port**: `8096` is guarded behind `/api/jellyfin/[...path]`. All administrative endpoints outside the media allowlist return HTTP 403.
- **Fail-Safe Fallback**: If either backend is temporarily unreachable, the frontend seamlessly utilizes structured fallback states without crashing or exposing raw connection errors.

---

## 4. Setup Instructions

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
2. Populate `.env.local` with your private Oracle Cloud server IP, API keys, and Firebase project credentials.
3. Start the Next.js server:
   ```bash
   npm run dev
   ```
4. Build for production deployment:
   ```bash
   npm run build
   npm run start
   ```
