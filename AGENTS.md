# Emby Query — AI Agent 项目指南

> 本文件面向 AI 编码助手。阅读者被假设对该项目一无所知。所有信息均基于实际代码与配置文件，未作臆测。

---

## 项目概述

**Emby Query** 是一个 Chrome 浏览器扩展 + Python 本地后端服务的组合项目，用于在任意网页上选中影视剧名称后，快速查询该名称是否已存在于用户的 Emby 媒体库中。

项目采用中文作为注释和文档的主要自然语言。

### 核心功能

- **划词浮标**：在网页上选中文字后，会在选区右侧显示浮动图标，点击即可查询。
- **右键菜单**：选中文本后右键选择「查询 Emby 媒体库」。
- **结果展示**：在新弹窗中以等宽字体文本形式展示查询结果：
  - **电影**：名称、年份、文件路径。
  - **电视剧**：名称、年份、各季信息、每季第一集的文件路径（用于判断是否已有该剧或新一季更新）。
- **可配置**：通过扩展的「选项」页面设置 Emby 服务器地址和 API Key。

### 技术栈

| 层级 | 技术 |
|------|------|
| 浏览器扩展 | Chrome Extension Manifest V3（纯 JavaScript，无框架） |
| 本地后端 | Python 3.8+，Flask，requests |
| 包管理器 | `uv`（现代 Python 包管理器） |
| 操作系统 | Windows 10/11（主要验证平台）、Ubuntu 20.04+、macOS 10.15+ |

---

## 项目结构

项目根目录采用扁平结构，没有复杂的子目录分层：

```
.
├── manifest.json          # Chrome 扩展清单（MV3）
├── background.js          # Service Worker：右键菜单、图标点击、与本地服务通信
├── content.js             # 内容脚本：注入所有页面，处理划词和浮标交互
├── options.html           # 扩展选项页面（配置 Emby 地址和 API Key）
├── options.js             # 选项页面的逻辑
├── server.py              # Flask 后端主程序
├── config.py              # 后端统一配置文件（端口、超时、缓存、日志等）
├── pyproject.toml         # uv 项目配置与依赖声明
├── requirements.txt       # 兼容 pip 的依赖列表（Flask、requests）
├── uv.lock                # uv 锁定文件
├── run.bat / run.sh       # 前台调试启动脚本（uv run python server.py）
├── server.bat / server.sh # 安装开机自启服务并立即启动
├── build_extension.ps1    # 生成可加载的干净 Chrome 扩展目录
├── how2run.txt            # 启动说明文档（中文）
├── tests/                 # 后端单元测试
├── images/                # 扩展图标（icon16/32/48/128.png）及生成脚本
├── intro/                 # 介绍截图（仅用于 README 展示）
└── .gitignore             # 忽略 Python 缓存、虚拟环境、IDE 配置等
```

### 关键文件职责

- **`manifest.json`**：声明了 `activeTab`、`scripting`、`contextMenus`、`storage`、`notifications` 权限；`host_permissions` 仅包含 `http://localhost:5000/*`。
- **`background.js`**：
  - 注册右键菜单项「查询 Emby 媒体库」。
  - 处理扩展图标点击事件。
  - 通过 `fetch('http://localhost:5000/process', ...)` 将选中文本 + 用户配置发给后端，并附带扩展请求标识头。
  - 负责结果弹窗的渲染（在 Service Worker 中通过 `chrome.windows.create` 打开转义后的 `data:text/html` 弹窗）。
  - 读取 `chrome.storage.local` 中的 Emby 配置，并兼容迁移旧的 `chrome.storage.sync` 配置。
- **`content.js`**：
  - 使用 IIFE 避免重复注入。
  - 监听鼠标选区变化，计算选区位置，在页面右侧显示固定定位的 48px 图标。
  - 点击图标后通过 `chrome.runtime.sendMessage` 将文本发送给 `background.js`。
- **`server.py`**：
  - 提供 `/process`（POST）和 `/health`（GET）两个端点。
  - `/process` 接收 `text`、`embyHost`、`apiKey`，调用 Emby `/emby/Items` API 搜索。
  - 对电视剧会进一步调用 `/emby/Shows/{id}/Seasons` 和 `/emby/Shows/{id}/Episodes` 获取季和集信息。
  - 仅限本地请求，并要求扩展请求标识头；普通网页 Origin 会被拒绝。
- **`config.py`**（36 行）：集中管理所有服务端配置项，支持通过环境变量覆盖默认值。
- **`tests/test_server.py`**：覆盖后端访问控制、CORS 行为、超时处理、电视剧详情请求超时和 console script 入口。

---

## 构建与运行命令

### 前置要求

- 安装 `uv`（Python 包管理器）：
  - Windows: `powershell -c "irm https://astral.sh/uv/install.ps1 | iex"`
  - macOS/Linux: `curl -LsSf https://astral.sh/uv/install.sh | sh`
- Chrome 浏览器（用于加载扩展）。
- 一个可访问的 Emby 服务器及其 API Key。

### 快速启动（前台调试）

```bash
# Windows
run.bat

# macOS / Linux
./run.sh
```

这会调用 `uv run python server.py` 在前台启动 Flask 服务，默认监听 `127.0.0.1:5000`。

### 安装开机自启服务

```bash
# Windows（双击即可）
server.bat

# macOS / Linux
chmod +x server.sh
./server.sh
```

- **Windows**：在 `%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\` 生成一个 VBS 脚本，实现无窗口后台启动；同时立即前台启动一次用于测试。
- **macOS**：在 `~/Library/LaunchAgents/` 生成 `com.embyquery.server.plist`，并通过 `launchctl load` 加载。
- **Ubuntu/Linux**：在 `~/.config/systemd/user/` 生成 `embyquery.service`，启用并启动用户级 systemd 服务。

### 加载 Chrome 扩展

1. 打开 Chrome，访问 `chrome://extensions/`。
2. 开启右上角「开发者模式」。
3. 运行 `.\build_extension.ps1` 生成 `dist\extension`。
4. 点击「加载已解压的扩展程序」，选择 `dist\extension`。
5. 右键扩展图标 → 「选项」，填入 Emby 服务器地址和 API Key。

不要直接加载项目根目录。项目根目录包含 `.venv`、测试文件和 Python 缓存，Chrome 会因为 `__pycache__` 等以下划线开头的目录拒绝加载。

### 健康检查

浏览器访问 `http://127.0.0.1:5000/health`，应返回 `{"status": "ok"}`。

---

## 代码风格与开发约定

### 语言与注释

- 项目源码中的注释、变量名（部分）、用户界面文本、README 均以**中文**为主。
- 服务端代码遵循 Python 命名规范（`snake_case`）。
- JavaScript 代码使用驼峰命名（`camelCase`）。

### 默认配置与硬编码值

- 扩展端不再内置默认 Emby 地址或 API Key；首次使用必须在选项页手动配置。
- 后端通信地址仍为 `http://localhost:5000`（`manifest.json` 的 `host_permissions` 与 `background.js` 的 `LOCAL_SERVICE_URL` 均需同步修改）。
- `config.py` 中也有独立的默认值（`DEFAULT_EMBY_HOST`、`DEFAULT_EMBY_API_KEY`），主要用于提示或占位。

### 错误处理风格

- JavaScript 侧大量使用 `try/catch` + `chrome.runtime.lastError` 检查，避免在特殊页面（如 `chrome://`、`edge://`、`file:`）上执行脚本时报错。
- 扩展调试日志使用 `[EmbyQuery background]` 和 `[EmbyQuery content]` 前缀，可分别在扩展 Service Worker 控制台和网页控制台查看。
- Python 侧对请求超时、网络错误、Emby API 异常均分别捕获并返回对应 HTTP 状态码（400、502、504、500）。

---

## 测试策略

当前项目已有后端单元测试，位于 `tests/test_server.py`。

```bash
uv run python -m unittest discover -v
node --check background.js
node --check content.js
node --check options.js
```

仍建议在改动扩展交互后做手动端到端测试：

1. 启动 `server.py`。
2. 在 Chrome 中加载扩展。
3. 配置有效的 Emby 地址和 API Key。
4. 在任意网页划词，观察浮标出现、点击后弹窗展示结果。
5. 检查浏览器控制台和 Python 控制台输出排查问题。

---

## 安全与部署注意事项

### 安全模型

- **本地唯一**：Flask 后端仅接受来自回环地址的请求，其他来源直接返回 403。
- **扩展标识**：`/process` 要求请求头 `X-Emby-Query-Client: chrome-extension`；普通网页 Origin 会被拒绝。
- **凭证存储**：API Key 保存在浏览器的 `chrome.storage.local` 中，不随 Chrome 账号同步；旧的 `chrome.storage.sync` 配置会被迁移并清理。
- **中转架构**：扩展不直接访问 Emby，所有请求通过本地 Python 服务中转。
- **内容长度限制**：`MAX_CONTENT_LENGTH = 1MB`，防止异常大请求。

### 已知安全细节

- 源码中不再包含默认 Emby API Key；用户必须通过扩展选项页配置。
- 本地 Flask 服务使用 HTTP（非 HTTPS），仅监听回环地址，不暴露于公网。
- 扩展的 `content_scripts` 匹配 `<all_urls>`，会在所有网页注入脚本；代码中已通过 `canAccessPage` 等机制避免在特权页面执行操作。

### 部署/分发

- 本项目为**源码加载型扩展**，未打包为 `.crx` 或发布到 Chrome Web Store。
- 用户需要保持项目文件夹不被删除，因为开机启动脚本（Windows VBS / macOS LaunchAgent / Linux systemd）指向的是该目录下的 `server.py`。

---

## 常见修改场景指引

| 修改目标 | 应编辑的文件 |
|---------|-------------|
| 扩展名称/版本/权限 | `manifest.json` |
| 后端服务端口 | `config.py` → `SERVER_PORT`；同步修改 `manifest.json` 的 `host_permissions` 和 `background.js` 的 `LOCAL_SERVICE_URL` |
| 新增搜索结果字段 | `server.py` → `search_emby` 函数中的 `params` 和结果格式化逻辑 |
| 调整浮标样式/位置 | `content.js` → 容器样式和 `showIcon` 中的位置计算逻辑 |
| 修改开机启动行为 | `server.bat`（Windows）或 `server.sh`（macOS/Linux） |
| 添加依赖包 | `pyproject.toml` 的 `dependencies` 列表，然后运行 `uv sync` |

---

## 外部依赖与版本

- **Flask** `>=3.0.0`（Web 框架）
- **requests** `>=2.31.0`（HTTP 客户端，用于调用 Emby API）
- **hatchling**（构建后端，用于生成 `emby-query` console script）

运行依赖在 `pyproject.toml` 的 `dependencies` 中以 `>=` 声明，并在 `requirements.txt` 中以 `==` 固定到具体版本；`hatchling` 位于 `build-system.requires`。实际运行时由 `uv` 根据 `pyproject.toml` + `uv.lock` 解析。
