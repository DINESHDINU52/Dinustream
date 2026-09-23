# DinuStream ➔ Jellyfin Integration & SSD Cache Guide

This folder contains the complete, production-ready assets to connect **Google Drive to Oracle Cloud NVMe SSD Cache**, apply the **DinuStream Theme & Branding** to Jellyfin, and integrate **Jellyfin Native SyncPlay**.

---

## 📁 Files Included

| File | Purpose |
| :--- | :--- |
| [`sync-manager-daemon.js`](./sync-manager-daemon.js) | Standalone Node.js daemon running on port `8787` that transfers movies from Google Drive to local SSD cache with progress tracking and LRU eviction. |
| [`dinustream-sync-manager.service`](./dinustream-sync-manager.service) | Systemd unit file to run the SSD Cache Manager daemon on Linux / Oracle Cloud automatically on boot. |
| [`rclone-gdrive.service`](./rclone-gdrive.service) | High-performance `rclone` mount service with `--vfs-cache-mode full` on SSD. |
| [`jellyfin-dinustream-theme.css`](./jellyfin-dinustream-theme.css) | Custom CSS stylesheet that transforms Jellyfin Web into the DinuStream Disney+ Hotstar / Netflix aesthetic with custom logo and glassmorphism. |

---

## 🚀 1. Google Drive to Oracle SSD Cache Setup

### Step A: Configure rclone Mount Service
Copy `rclone-gdrive.service` to `/etc/systemd/system/rclone-gdrive.service`:
```bash
sudo cp rclone-gdrive.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now rclone-gdrive.service
```

### Step B: Run the DinuStream SSD Cache Manager Daemon
Deploy `sync-manager-daemon.js`:
```bash
sudo mkdir -p /opt/dinustream/server
sudo cp sync-manager-daemon.js /opt/dinustream/server/
sudo cp dinustream-sync-manager.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now dinustream-sync-manager.service
```

Verify it is running:
```bash
curl http://127.0.0.1:8787/health
# Output: {"status":"online","service":"dinustream-ssd-sync-manager",...}
```

---

## 🎨 2. Applying DinuStream Theme & Logo to Jellyfin

To merge DinuStream's design directly into Jellyfin:

1. Open your Jellyfin Web Admin (`http://<server-ip>:8096` or `https://jellyfin.yourdomain.com`).
2. Go to **Dashboard** ➔ **General**.
3. Scroll down to **Custom CSS code**.
4. Paste the entire content of [`jellyfin-dinustream-theme.css`](./jellyfin-dinustream-theme.css).
5. Click **Save**.
6. Refresh your browser — Jellyfin will immediately render with DinuStream's midnight glassmorphism, glowing card hovers, Disney+/Hotstar colors, and the **DINUSTREAM** gradient brand logo in the navigation bar!

---

## 🍿 3. Jellyfin Native SyncPlay Integration

1. In Jellyfin Dashboard:
   - Go to **Users** ➔ Select user (e.g. `Dinu` or `Kanmani`).
   - Under **Feature Access**, ensure **"Allow SyncPlay"** is enabled.
2. In DinuStream:
   - When a Watch Together group is created or joined, DinuStream coordinates with Jellyfin's `/SyncPlay/New`, `/SyncPlay/Join`, `/SyncPlay/Unpause`, `/SyncPlay/Pause`, and `/SyncPlay/Seek`.

---

## 🌐 4. Connecting DinuStream Frontend to Jellyfin

In your DinuStream `.env.local`:

```env
# Public Address (for now):
JELLYFIN_SERVER_URL=http://<YOUR_ORACLE_PUBLIC_IP>:8096
# Or https://jellyfin.yourdomain.com

# Later (when DinuStream and Jellyfin run on the same VM):
# JELLYFIN_SERVER_URL=http://127.0.0.1:8096

JELLYFIN_API_KEY=your_api_key_from_dashboard
JELLYFIN_USER_ID=your_user_id_from_dashboard
NEXT_PUBLIC_JELLYFIN_PROXY_URL=/api/jellyfin
```
