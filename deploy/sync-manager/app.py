# DinuStream Sync Manager - Google Drive -> local SSD cache daemon.
#
# Runs on the VM (127.0.0.1:8787). nginx maps /api/sync/* onto this service with
# the prefix stripped:
#   /api/sync/sync/movie        -> /sync/movie         {filename, kind?}
#   /api/sync/sync/status/<f>   -> /sync/status/<f>
#   /api/sync/cache/list        -> /cache/list         [?kind=]
#   /api/sync/cache/delete      -> /cache/delete       {filename, kind?}
#   /api/sync/health            -> /health
#
# `kind` is "movie" or "show" (default "movie"). Source/dest paths can be
# overridden with env vars so the daemon survives folder renames:
#   DRIVE_MOVIES / DRIVE_SHOWS     (rclone remote:path)
#   CACHE_MOVIES / CACHE_SHOWS     (local SSD folders)
#
# Deploy: copy to /opt/dinustream/sync-manager/app.py and restart the service.

from datetime import datetime, timezone
from flask import Flask, request, jsonify
import subprocess
import os
import threading
import json

app = Flask(__name__)

DRIVE_MOVIES = os.getenv("DRIVE_MOVIES", "dinustream-drive:DinuStream/Movies")
DRIVE_SHOWS = os.getenv("DRIVE_SHOWS", "dinustream-drive:DinuStream/Shows")
CACHE_MOVIES = os.getenv("CACHE_MOVIES", "/opt/dinustream/cache/movies")
CACHE_SHOWS = os.getenv("CACHE_SHOWS", "/opt/dinustream/cache/shows")

# kind -> (remote source, local cache dir)
KINDS = {
    "movie": (DRIVE_MOVIES, CACHE_MOVIES),
    "show": (DRIVE_SHOWS, CACHE_SHOWS),
}

sync_status = {}
_status_lock = threading.Lock()


def _set_status(key, **fields):
    with _status_lock:
        current = sync_status.get(key, {})
        current.update(fields)
        sync_status[key] = current


def _safe_name(filename):
    """Safe relative path, allowing media files inside Drive subfolders."""
    if not filename:
        return None
    normalized = str(filename).replace("\\", "/")
    parts = normalized.split("/")
    if normalized.startswith("/") or any(part in ("", ".", "..") for part in parts):
        return None
    if any(part.startswith(".") for part in parts):
        return None
    return "/".join(parts)


def _resolve(kind, filename):
    """Return (status_key, source, destination) or None if invalid."""
    safe = _safe_name(filename)
    if not safe:
        return None
    source_root, cache_dir = KINDS.get(kind, KINDS["movie"])
    destination = os.path.join(cache_dir, *safe.split("/"))
    return f"{kind}:{safe}", f"{source_root}/{safe}", destination


def sync_movie(kind, filename):
    resolved = _resolve(kind, filename)
    if not resolved:
        return
    key, source, destination = resolved
    _set_status(key, status="syncing", progress=0)

    try:
        os.makedirs(os.path.dirname(destination), exist_ok=True)

        command = [
            "rclone", "copyto", source, destination,
            "--stats-one-line-json", "--stats", "1s",
        ]
        process = subprocess.Popen(
            command, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True
        )
        for line in process.stdout:
            line = line.strip()
            print(line)
            try:
                stats = json.loads(line)
            except (TypeError, ValueError):
                continue
            if not isinstance(stats, dict):
                continue
            # rclone's JSON stats fields are stable, but keep aliases for
            # versions that spell percentage/bytes differently.
            transferred = stats.get("bytes", stats.get("transferred", 0)) or 0
            total = stats.get("totalBytes", stats.get("total", 0)) or 0
            percentage = stats.get("percentage", stats.get("percent", 0)) or 0
            speed = stats.get("speed", stats.get("speedBytesPerSec", 0)) or 0
            eta = stats.get("eta", stats.get("etaSeconds", 0)) or 0
            _set_status(
                key,
                status="syncing",
                progress=float(percentage),
                transferredBytes=int(transferred),
                totalBytes=int(total),
                speedBytesPerSec=float(speed),
                etaSeconds=float(eta),
            )
        process.wait()

        if process.returncode == 0:
            _set_status(key, status="ready", progress=100)
        else:
            _set_status(key, status="error", progress=0)
    except Exception as e:
        _set_status(key, status="error", progress=0, message=str(e))


@app.route("/sync/movie", methods=["POST"])
def sync():
    data = request.get_json(silent=True) or {}
    filename = data.get("filename")
    kind = data.get("kind", "movie")

    resolved = _resolve(kind, filename)
    if not resolved:
        return jsonify({"error": "a valid filename is required"}), 400

    key, _source, destination = resolved

    if os.path.exists(destination):
        return jsonify({"status": "ready", "progress": 100, "message": "Already cached"})

    with _status_lock:
        existing = sync_status.get(key)
    if existing and existing.get("status") in ("starting", "syncing"):
        return jsonify(existing)

    _set_status(key, status="starting", progress=0)
    thread = threading.Thread(target=sync_movie, args=(kind, filename), daemon=True)
    thread.start()

    return jsonify({"status": "syncing", "progress": 0})


@app.route("/sync/status/<path:filename>", methods=["GET"])
def status(filename):
    kind = request.args.get("kind", "movie")
    resolved = _resolve(kind, filename)
    if not resolved:
        return jsonify({"status": "not_cached", "progress": 0})

    key, _source, destination = resolved
    if os.path.exists(destination):
        return jsonify({"status": "ready", "progress": 100})

    with _status_lock:
        current = sync_status.get(key)
    return jsonify(current or {"status": "not_cached", "progress": 0})


def _scan_dir(cache_dir, kind):
    items = []
    if not os.path.isdir(cache_dir):
        return items
    for entry in sorted(os.listdir(cache_dir)):
        path = os.path.join(cache_dir, entry)
        if not os.path.isfile(path):
            continue
        if entry.startswith(".") or entry.endswith(".partial"):
            continue
        try:
            st = os.stat(path)
        except OSError:
            continue
        items.append(
            {
                "filename": entry,
                "kind": kind,
                "sizeBytes": st.st_size,
                "modifiedAt": datetime.fromtimestamp(st.st_mtime, timezone.utc).isoformat(),
            }
        )
    return items


@app.route("/cache/list", methods=["GET"])
def cache_list():
    """Every movie/show currently sitting in the local SSD cache."""
    kind = request.args.get("kind")
    items = []
    for k, (_src, cache_dir) in KINDS.items():
        if kind and kind != k:
            continue
        items.extend(_scan_dir(cache_dir, k))
    return jsonify(
        {"count": len(items), "totalBytes": sum(i["sizeBytes"] for i in items), "items": items}
    )


@app.route("/cache/delete", methods=["POST", "DELETE"])
def cache_delete():
    data = request.get_json(silent=True) or {}
    filename = data.get("filename") or request.args.get("filename")
    kind = data.get("kind") or request.args.get("kind", "movie")

    resolved = _resolve(kind, filename)
    if not resolved:
        return jsonify({"error": "a valid filename is required"}), 400

    key, _source, destination = resolved
    if not os.path.exists(destination):
        return jsonify({"status": "not_found", "filename": filename}), 404

    try:
        os.remove(destination)
    except OSError as e:
        return jsonify({"error": str(e)}), 500

    with _status_lock:
        sync_status.pop(key, None)
    return jsonify({"status": "deleted", "filename": filename, "kind": kind})


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"service": "DinuStream Sync Manager", "status": "online"})


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=8787)
