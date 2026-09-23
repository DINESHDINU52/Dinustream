# DinuStream — Jellyfin Google Drive SSD Cache Architecture

## 1. Executive Summary & Goals

DinuStream employs **Jellyfin as the core media backend** and a custom **Next.js frontend**. The media library is permanently hosted on **Google Drive**, while the server runs on Oracle Cloud (or local development) equipped with fast local NVMe SSD storage.

```text
[ Google Drive (Master Storage) ]
              │ (HTTP Range Requests: 32MB Chunks)
              ▼
  [ DinuStream.CacheCore (SSD) ]
  ├── ChunkStore (chunk_000000.bin, ...)
  ├── Single-Flight Deduplication Lock
  ├── Background Prefetch Coordinator
  └── LRU Cache Eviction Manager
              │
      ┌───────┴──────────────────┐
      ▼                          ▼
[ Direct Play ]        [ Transcoding / Remux ]
(ASP.NET Core Stream)  (FFmpeg -i MediaPath / HTTP)
      │                          │
      └───────┬──────────────────┘
              ▼
     [ DinuStream Client / UI ]
```

### Core Requirements
1. **No full file pre-downloading**: A 10 GB file must never be downloaded in its entirety when a user hits Play.
2. **Fixed-Size Chunking**: Sliced into 32 MB chunks on-demand.
3. **Multi-User Deduplication**: If multiple users stream the same media, concurrent chunk requests coalesce into a single Google Drive download.
4. **Prefetching**: Look-ahead prefetching of upcoming chunks (e.g. 10 minutes ahead) to ensure zero buffering.
5. **LRU Cache Eviction**: Oldest unaccessed chunks are removed when cache exceeds maximum configured size.
6. **Dual Playback Support**: Must seamlessly support **both Direct Play and FFmpeg Transcoding/Remuxing**.

---

## 2. The Critical FFmpeg / Filesystem Compatibility Analysis

In Phase 1 analysis of the Jellyfin playback pipeline, we identified how Jellyfin delivers media:
- **Direct Play**: ASP.NET Core `PhysicalFileResult` or `FileStreamResult` handles HTTP byte-range requests directly from C#.
- **Transcoding / Direct Stream**: Jellyfin spawns an **external native C binary (`ffmpeg`)** via `Process.Start`.

### The Problem
FFmpeg is not a C# library. It cannot accept an in-memory C# `Stream` or arbitrary C# object. It requires a valid input target passed to `-i <input>`.

### Evaluation of Approaches

| Approach | Compatibility | Complexity | Maintenance & Portability |
| :--- | :--- | :--- | :--- |
| **1. Kernel FUSE / WinFsp File System** | Native file paths (`/mnt/vfs/movie.mkv`) | High (requires native C kernel drivers, root/admin rights) | OS-dependent; difficult on Docker and Windows dev. |
| **2. Local Sparse File on SSD** | Native file paths (`/mnt/cache/movie.mkv`) | Moderate (requires OS sparse file support) | Linux `fallocate`/`truncate` supports sparse files natively; Windows NTFS supports sparse files via `FSCTL_SET_SPARSE`. |
| **3. Local HTTP Cache Stream Endpoint (`http://127.0.0.1:port/stream`)** | Full FFmpeg HTTP demuxer support | Low / Native | **100% portable**. Jellyfin already has `MediaProtocol.Http` built into `EncodingHelper` and `TranscodeManager`! FFmpeg natively seeks and reads ranges over HTTP with `-i http://...`. |

### The Architectural Decision

DinuStream Cache Core implements a **Dual-Mode Serving Strategy**:

1. **Chunk Storage on SSD**:
   Chunks are stored as discrete 32 MB block files under:
   `<CachePath>/<MediaId>/chunk_{index:D6}.bin`
   accompanied by an indexed `metadata.json` / SQLite registry.

2. **Direct Play (In-Process Stream)**:
   A custom `DinuStreamChunkedStream` is provided to ASP.NET Core that presents a seekable, readable stream of the entire file length, fetching and caching chunks on-demand as byte ranges are requested.

3. **FFmpeg Transcoding & Progressive Streaming**:
   When FFmpeg is invoked, DinuStream exposes the media either via:
   - **Internal Local HTTP Range Endpoint** (`http://127.0.0.1:8096/...` or loopback cache proxy), where FFmpeg utilizes its built-in HTTP range-seeking demuxer (`MediaProtocol.Http`).
   - Or an assembled local file/sparse container on SSD when the active playback window is cached.

This guarantees that **neither Direct Play nor FFmpeg transcoding are compromised**, with zero reliance on unstable third-party kernel drivers.

---

## 3. Mathematical Chunk Grid Specification

For a file of total size $L$ bytes and chunk size $C$ bytes (default: $32 \times 1024 \times 1024 = 33,554,432$ bytes):

- **Total Chunks**:
  $$N = \lceil L / C \rceil$$
- **Chunk Index for Byte Offset $P$**:
  $$Index(P) = \lfloor P / C \rfloor$$
- **Offset within Chunk**:
  $$OffsetInChunk(P) = P \pmod C$$
- **Byte Range for Chunk $i$**:
  $$StartByte(i) = i \times C$$
  $$EndByte(i) = \min((i + 1) \times C - 1, L - 1)$$
- **Chunk Size for Chunk $i$**:
  $$Size(i) = EndByte(i) - StartByte(i) + 1$$

---

## 4. Single-Flight Multi-User Deduplication

To prevent thundering herds and duplicate Google Drive API rate-limiting:
- `ChunkLockManager` maintains an in-flight dictionary:
  `ConcurrentDictionary<(string MediaId, long ChunkIndex), Task<string>>`
- When multiple requests ask for the same chunk simultaneously:
  1. The first caller initiates the range download task from Google Drive to SSD.
  2. Subsequent callers receive the existing `Task<string>`, awaiting the same file write.
  3. Upon task completion (or cancellation/failure), the lock entry is removed so future requests either read from SSD (on success) or retry cleanly (on error).

---

## 5. Prefetching & LRU Eviction

- **Prefetch Coordinator**:
  Whenever chunk $k$ is read, an asynchronous worker schedules chunks $k+1, \dots, k+M$ (where $M = \text{PrefetchChunkCount}$, derived from bitrate and prefetch duration).
- **LRU Eviction**:
  A thread-safe metadata tracker records `LastAccessedUtc`. When disk usage crosses `MaximumCacheSizeBytes`, the oldest unaccessed chunks are pruned until disk usage falls below $85\%$ of the limit. Actively locked chunks (currently being read or downloaded) are skipped during eviction.
