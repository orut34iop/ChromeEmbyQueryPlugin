# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ChromeEmbyQueryPlugin is a Chrome extension that lets users select movie or TV show names on any web page and query a local Emby/Jellyfin media server to see if the content already exists in the library. It consists of a Manifest V3 Chrome extension and a small local Python Flask server that proxies and formats requests to the media server API.

## Common Development Commands

All Python commands assume you have [uv](https://docs.astral.sh/uv/) installed. The project uses `pyproject.toml` as the source of truth for dependencies.

### Build the extension for Chrome

Chrome refuses to load an unpacked extension if the directory contains files or folders whose names start with `_` (such as Python's `__pycache__`). Always build a clean `dist/` folder and load that in Chrome:

```bash
uv run python build.py
```

This creates `dist/` containing only the extension files (`manifest.json`, `background.js`, `content.js`, `options.js`, `options.html`, and `images/`).

### Install / sync Python dependencies

```bash
uv sync
```

This creates a `.venv/` in the project root and installs dependencies from `pyproject.toml`.

### Start the local backend server

```bash
uv run python server.py
```

Or use the launcher wrapper:

```bash
python3 run_server.py
```

`run_server.py` prefers `uv run` when `uv` is available, and falls back to `.venv/bin/python` otherwise. The server binds to `127.0.0.1:3000` (localhost only) by default; change `EMBY_QUERY_PORT` or edit `config.py` to use a different port.

### Set up auto-start (install-time step)

- **macOS / Ubuntu / Linux:** `./server.sh`
  - Requires `uv`.
  - macOS: creates `~/Library/LaunchAgents/com.embyquery.server.plist` and loads it with `launchctl`.
  - Ubuntu/Linux: creates `~/.config/systemd/user/embyquery.service`, then enables and starts it.
- **Windows:** `server.bat` is a legacy helper and is not updated for uv. On Windows, run `uv run python server.py` manually or create a scheduled task that runs the same command.

After setup, the server starts on boot. Check status with:

- macOS: `launchctl list | grep embyquery`
- Ubuntu: `systemctl --user status embyquery`
- Windows: look for a Python process in Task Manager, or in PowerShell run `Get-WmiObject Win32_Process -Filter "Name='python.exe'" | Select-Object ProcessId, CommandLine`.

### Load the extension in Chrome

1. Build the extension: `uv run python build.py`
2. Open `chrome://extensions/`.
3. Enable **Developer mode**.
4. Click **Load unpacked** and select the **`dist/`** directory (not the project root).
5. Right-click the extension icon → **Options**, then enter the Emby/Jellyfin server URL and API Key.

### Run tests

```bash
uv run python -m unittest discover -v
```

There is no build step for the JavaScript files; the extension is loaded directly from source.

## Architecture

### Chrome extension (`manifest.json`)

- **Content script (`content.js`)**: injected into all URLs (`<all_urls>`). On text selection it positions a floating icon next to the selection, caches the selection, and sends it to the background script via `chrome.runtime.sendMessage({ action: 'processText', text: ... })`.
- **Background service worker (`background.js`)**: handles three triggers:
  1. Right-click context menu item **"查询Emby媒体库"** (`chrome.contextMenus`).
  2. Clicking the extension toolbar icon (`chrome.action.onClicked`).
  3. Messages from the content script.
  In all cases it reads `embyHost` and `apiKey` from `chrome.storage.local` (migrating legacy values from `chrome.storage.sync`), validates that they are configured, POSTs `{ text, embyHost, apiKey }` to `http://localhost:3000/process` with the `X-Emby-Query-Client: chrome-extension` header, and opens a popup window displaying the returned plain-text result.
- **Options page (`options.html` / `options.js`)**: stores `embyHost` and `apiKey` in `chrome.storage.local`.

### Local Flask backend (`server.py`)

- Loads settings from `config.py` (host, port, timeouts, search fields).
- `GET /health`: health check endpoint.
- `POST /process`: validates that the request is local, carries the `X-Emby-Query-Client: chrome-extension` header, and originates from a `chrome-extension://` Origin; then queries the configured media server.
- Queries the Jellyfin/Emby `/Items` endpoint for `Movie` and `Series` by name.
- For each movie: returns name, production year, and file path.
- For each series: returns name, year, and every season plus the first episode path of each season.
- Returns a plain-text `result` string that the extension displays in a popup.

### Server startup helpers

- `config.py`: central configuration file for the backend.
- `run_server.py`: launcher that prefers `uv run python server.py`, falling back to `.venv/bin/python` if uv is not installed.
- `server.sh`: install-time script that registers an auto-start service using `uv` and immediately starts the server in the background.
- `server.bat`: legacy Windows helper (not updated for uv).
- `pyproject.toml`: uv project metadata and dependency list.
- `requirements.txt`: pip-compatible dependency fallback.
- `tests/`: unit tests for the backend.

## Configuration Notes

- Default Emby host and API key are no longer hardcoded; first use requires configuration in the extension options page.
- The backend runs on port **3000** by default to avoid macOS AirPlay's use of port 5000.
- The extension requests broad host permissions (`http://*/*`, `https://*/*`) plus `http://localhost/*` so it can inject the content script on any page and call the local server.
- Emby/Jellyfin API Key is stored only in the browser's local storage; the backend receives it with each request and does not persist it.
- The `/process` endpoint rejects requests that lack the extension header or originate from non-extension sources.

## Important Files

- `manifest.json`: extension permissions and entry points.
- `background.js`: central request dispatcher and result renderer.
- `content.js`: floating-icon UX and text capture.
- `options.js` / `options.html`: user settings UI.
- `server.py`: Flask backend that talks to Jellyfin/Emby.
- `config.py`: backend configuration.
- `run_server.py`: uv-aware launcher with `.venv` fallback.
- `server.sh` / `server.bat`: platform-specific auto-start installers.
- `pyproject.toml`: uv project configuration and dependencies.
- `requirements.txt`: pip-compatible fallback dependency list.
- `build.py`: cross-platform builder that creates a clean `dist/` for Chrome.
- `tests/`: backend unit tests.

## Known Caveats

- `server.bat` is encoded in a non-UTF-8 code page; editing it in a UTF-8 editor will corrupt the Chinese text.
- The backend returns formatted plain text, not structured JSON, so any UI changes must also update the rendering logic in `background.js`.
- The `/process` endpoint and the background script assume the local server is reachable at `http://localhost:3000`.
- On macOS, port 5000 is used by AirPlay Receiver; the default port is therefore 3000.
