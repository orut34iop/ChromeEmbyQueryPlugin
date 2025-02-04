# Emby Query Chrome Extension

这是一个 Chrome 扩展，用于快速查询 Emby 媒体库中的内容。当你在网页上选中影视剧名称时，可以通过浮动图标或右键菜单快速查询该名称的影剧是否已经存在 Emby 影剧库中，如果已经存在，则输出相关的信息，以便判断是否需要新增下载或者更新内容。

## 功能特点

- 选中文本后显示浮动查询图标
- 支持右键菜单快速查询
- 可配置 Emby 服务器地址和 API Key
- 支持电影和电视剧查询：
  
    -对于电影，列出库中所有该名称的电影和对应的路径；
  
    -对于电视剧，则列出库中对应的所有季和每季第一集的文件信息，以便判断是否为新剧下载或新一季内容更新


## 安装步骤
注意: 下面说明针对windows系统环境， 如果是ubuntu/mac系统，会有些许区别，请遇到问题请自行咨询kimi或者deepseek解决

下载插件代码到本地（如：c:\chromepluin\ChromeEmbyQueryPlugin），
cd c:\chromepluin\ChromeEmbyQueryPlugin
注意，该目录不要删除，以后每次开机会自动运行ChromeEmbyQueryPlugin目录下的server.py脚本


1. 安装 Python 依赖：
```bash
pip install -r requirements.txt
```
注意： Ubuntu和mac命令可能有稍微不同，请自行搜索解决

2. 加载 Chrome 扩展：
   - 打开 Chrome，访问 `chrome://extensions/`
   - 开启右上角的"开发者模式"
   - 点击"加载已解压的扩展程序"，选择本项目目录

3. 配置扩展：
   - 右键扩展图标，选择"选项"
   - 输入你的 Emby 服务器地址和 API Key
   - 点击保存

4. 启动后端服务：
   - 双击 `server.bat` 在后台运行服务。这个步骤只需要安装时执行一次，安装插件后每次开机会自动运行后台脚本
注意： Ubuntu和mac命令可能有稍微不同，请自行搜索解决，或者需要使用插件前手动运行"python server.py"命令
## 使用方法

1. 在任意网页上选中影视剧名称
2. 点击出现的浮动图标，或右键选择"查询 Emby 媒体库"
3. 结果会在新窗口中显示，包含：
   - 电影：名称、年份和路径
   - 电视剧：名称、年份、各季信息和路径

## 注意事项

- 确保 Emby 服务器可访问
- API Key 需要在 Emby 管理界面生成
- 后端服务默认运行在 5000 端口
- 支持 http 和 https 网站

## 安全提示

- API Key 仅保存在本地浏览器中
- 所有请求均通过本地服务器中转
- 不会向外部发送敏感信息
