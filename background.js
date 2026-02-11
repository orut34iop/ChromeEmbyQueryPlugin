// Emby Query Background Script

// 检查页面是否可访问
function canAccessPage(url) {
  if (!url) return false;
  const blockedProtocols = [
    'chrome://',
    'chrome-extension://',
    'devtools://',
    'edge://',
    'about:',
    'moz-extension://',
    'file:'
  ];
  return !blockedProtocols.some(protocol => url.startsWith(protocol));
}

// 安全地显示通知
function safeNotify(message) {
  try {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'images/icon128.png',
      title: 'Emby Query',
      message: message
    }).catch(() => {});
  } catch (e) {
    console.error('EmbyQuery:', message);
  }
}

// 安全地执行脚本
function safeExecuteScript(tabId, func, args, callback) {
  try {
    const options = {
      target: { tabId: tabId },
      function: func
    };
    if (args) options.args = args;
    
    chrome.scripting.executeScript(options, (results) => {
      if (chrome.runtime.lastError) {
        console.log('Script execution error:', chrome.runtime.lastError.message);
        return;
      }
      if (callback) callback(results);
    });
  } catch (e) {
    console.error('Execute script error:', e);
  }
}

// 显示配置提示
function showConfigAlert(tab) {
  if (!tab || !canAccessPage(tab.url)) {
    safeNotify('请先配置 Emby 服务器地址和 API Key');
    return;
  }
  safeExecuteScript(tab.id, () => {
    alert('请先配置 Emby 服务器地址和 API Key\n右键点击扩展图标，选择"选项"进行配置');
  });
}

// 显示错误提示
function showErrorAlert(tab, message) {
  if (!tab || !canAccessPage(tab.url)) {
    console.error('Emby Query Error:', message);
    return;
  }
  safeExecuteScript(tab.id, (msg) => alert(msg), [message]);
}

// 显示查询结果
function showResult(tab, result) {
  if (!tab || !canAccessPage(tab.url)) {
    // 在新窗口显示结果
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Emby 查询结果</title>
          <style>
            body { margin: 20px; font-family: monospace; background: #f5f5f5; }
            pre { white-space: pre-wrap; background: white; padding: 15px; border-radius: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          </style>
        </head>
        <body>
          <pre>${result.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
        </body>
      </html>
    `;
    try {
      chrome.windows.create({
        url: 'data:text/html;charset=utf-8,' + encodeURIComponent(html),
        type: 'popup',
        width: 800,
        height: 600
      });
    } catch (e) {
      console.error('Create window error:', e);
    }
    return;
  }
  
  safeExecuteScript(tab.id, (res) => {
    const lines = res.split('\n');
    const maxLen = Math.max(...lines.map(l => l.length));
    const width = Math.max(600, Math.min(1200, maxLen * 8));
    const height = Math.max(400, Math.min(800, lines.length * 16));
    const win = window.open('', '', `width=${width},height=${height},scrollbars=yes`);
    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Emby 查询结果</title>
          <style>
            body { margin: 20px; font-family: monospace; background: #f5f5f5; }
            pre { white-space: pre-wrap; background: white; padding: 15px; border-radius: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          </style>
        </head>
        <body>
          <pre>${res}</pre>
        </body>
      </html>
    `);
  }, [result]);
}

// 处理选中的文本
function processSelectedText(selectedText, tab) {
  if (!selectedText) {
    if (tab) showErrorAlert(tab, '请先选择影剧名称!');
    return;
  }

  const DEFAULT_HOST = 'http://192.168.2.43:8096';
  const DEFAULT_API_KEY = 'd3928cf0934b4280be51ff33ce8dfeca';

  chrome.storage.sync.get({
    embyHost: DEFAULT_HOST,
    apiKey: DEFAULT_API_KEY
  }, function(config) {
    if (!config.embyHost) config.embyHost = DEFAULT_HOST;
    if (!config.apiKey) config.apiKey = DEFAULT_API_KEY;

    fetch('http://localhost:5000/process', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: selectedText,
        embyHost: config.embyHost,
        apiKey: config.apiKey
      })
    })
    .then(async response => {
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || `服务器错误 (${response.status})`);
      }
      return data;
    })
    .then(data => {
      showResult(tab, data.result);
    })
    .catch(error => {
      console.error('Emby Query Error:', error);
      let msg = '查询失败: ';
      if (error.message === 'Failed to fetch') {
        msg += '无法连接到本地服务，请确保 server.py 正在运行';
      } else {
        msg += error.message;
      }
      if (tab) showErrorAlert(tab, msg);
    });
  });
}

// 获取选中的文本并处理
function getSelectionAndProcess(tab) {
  if (!tab || !canAccessPage(tab.url)) {
    safeNotify('无法在此页面使用，请在普通网页上使用');
    return;
  }
  
  safeExecuteScript(tab.id, () => window.getSelection().toString().trim(), null, (results) => {
    if (!results || !results[0]) return;
    processSelectedText(results[0].result, tab);
  });
}

// 创建右键菜单
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'processText',
    title: '查询Emby媒体库',
    contexts: ['selection']
  }, () => {
    // 忽略错误（菜单可能已存在）
    if (chrome.runtime.lastError) {
      console.log('Context menu already exists');
    }
  });
});

// 右键菜单点击
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'processText') {
    getSelectionAndProcess(tab);
  }
});

// 插件图标点击
chrome.action.onClicked.addListener((tab) => {
  getSelectionAndProcess(tab);
});

// 接收来自 content script 的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'processText') {
    processSelectedText(request.text, sender.tab);
  }
  return true;
});
