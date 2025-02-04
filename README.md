# Emby Query Chrome Extension

这是一个 Chrome 扩展，用于快速查询 Emby 媒体库中的内容。当你在网页上选中影视剧名称时，可以通过浮动图标或右键菜单快速查询该名称的影剧是否已经存在 Emby 影剧库中。

## 功能特点

- 选中文本后在右侧显示浮动查询图标
- 支持右键菜单快速查询
- 可配置 Emby 服务器地址和 API Key
- 支持电影和电视剧查询：
    - 电影：列出库中所有该名称的电影和对应的路径
    - 电视剧：列出库中对应的所有季和每季第一集的文件信息，以便判断是否为新剧下载或新一季内容更新

## 安装步骤
下面说明中仅windows系统环境验证过，ubuntu/mac系统中未验证过，如果遇到问题请自行咨询kimi或者deepseek解决
如果你遇到问题/或者自行修复偶尔遇到的问题，请在issues留下说明记录，以帮助修复插件缺陷，谢谢

### 1. 安装 Python 依赖

```bash
# Windows
pip install -r requirements.txt

# Ubuntu/Mac
pip3 install -r requirements.txt
```

### 2. 配置后台服务

#### Windows:
- 双击 `server.bat`，会自动配置开机启动
- 启动服务后可以关闭命令行窗口

#### Ubuntu:
```bash
chmod +x server.sh
./server.sh
```

#### Mac:
```bash
chmod +x server.sh
./server.sh
```

注意：这个步骤只需要安装时执行一次，安装插件后每次开机会自动运行后台脚本，所以请不要删除该插件文件夹

### 3. 加载 Chrome 扩展

1. 打开 Chrome，访问 `chrome://extensions/`
2. 开启右上角的"开发者模式"
3. 点击"加载已解压的扩展程序"，选择本项目目录

### 4. 配置扩展

1. 右键扩展图标，选择"选项"
2. 输入你的 Emby 服务器地址和 API Key
3. 点击保存

## 使用方法

1. 在任意网页上选中影视剧名称
2. 点击右侧出现的浮动图标，或右键选择"查询 Emby 媒体库"
3. 结果会在新窗口中显示，包含：
   - 电影：名称、年份和路径
   - 电视剧：名称、年份、各季信息和路径

## 系统要求

- Python 3.6+
- Chrome 浏览器
- 运行中的 Emby 服务器
- 系统支持：
  - Windows 10/11
  - Ubuntu 20.04+
  - macOS 10.15+

## 常见问题

### Windows
- 如需手动启动服务：运行 `server.bat`
- 检查服务状态：任务管理器中查看 Python 进程
  或者通过命令查询： 在powershell中运行命令 "Get-WmiObject Win32_Process -Filter "Name='python.exe'" | Select-Object ProcessId, CommandLine"

### Ubuntu
- 检查服务状态：`systemctl --user status embyquery`
- 手动启动：`systemctl --user start embyquery`
- 查看日志：`journalctl --user -u embyquery`

### Mac
- 检查服务状态：`launchctl list | grep embyquery`
- 手动启动：`launchctl start com.embyquery.server`
- 查看日志：`log show --predicate 'process == "embyquery"'`

## 注意事项

- 确保 Emby 服务器可访问
- API Key 需要在 Emby 管理界面生成
- 后端服务默认运行在 5000 端口
- 支持 http 和 https 网站

## 安全提示

- API Key 仅保存在本地浏览器中
- 所有请求均通过本地服务器中转
- 不会向外部发送敏感信息
