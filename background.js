// Emby Query Background Script

const LOCAL_SERVICE_URL = 'http://localhost:5000/process';
const CLIENT_HEADER_NAME = 'X-Emby-Query-Client';
const CLIENT_HEADER_VALUE = 'chrome-extension';
const SELECTION_CACHE_MAX_AGE_MS = 10 * 60 * 1000;
const memorySelectionCache = new Map();

function debugLog(...args) {
  console.log('[EmbyQuery background]', ...args);
}

function textPreview(text) {
  const value = String(text || '');
  return value.length > 30 ? value.slice(0, 30) + '...' : value;
}

function selectionCacheKey(tabId) {
  return `selection:${tabId}`;
}

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

function cacheSelection(tab, text, source) {
  if (!tab || typeof tab.id === 'undefined') return;

  const key = selectionCacheKey(tab.id);
  const selectedText = String(text || '').trim();
  if (!selectedText) {
    memorySelectionCache.delete(tab.id);
    if (chrome.storage && chrome.storage.session) {
      chrome.storage.session.remove(key);
    }
    debugLog('清空选区缓存', { tabId: tab.id, source });
    return;
  }

  const cacheValue = {
    text: selectedText,
    url: tab.url || '',
    timestamp: Date.now()
  };
  memorySelectionCache.set(tab.id, cacheValue);
  if (chrome.storage && chrome.storage.session) {
    chrome.storage.session.set({ [key]: cacheValue });
  }
  debugLog('缓存选区', {
    tabId: tab.id,
    source,
    length: selectedText.length,
    preview: textPreview(selectedText)
  });
}

function getCachedSelection(tab, callback) {
  if (!tab || typeof tab.id === 'undefined') {
    callback('');
    return;
  }

  const useCache = (cacheValue, source) => {
    if (!cacheValue || !cacheValue.text) {
      callback('');
      return;
    }

    const isFresh = Date.now() - cacheValue.timestamp <= SELECTION_CACHE_MAX_AGE_MS;
    const isSameUrl = !cacheValue.url || cacheValue.url === tab.url;
    if (!isFresh || !isSameUrl) {
      debugLog('忽略过期或跨页面选区缓存', {
        tabId: tab.id,
        source,
        isFresh,
        isSameUrl
      });
      callback('');
      return;
    }

    debugLog('命中选区缓存', {
      tabId: tab.id,
      source,
      length: cacheValue.text.length,
      preview: textPreview(cacheValue.text)
    });
    callback(cacheValue.text);
  };

  const memoryCache = memorySelectionCache.get(tab.id);
  if (memoryCache) {
    useCache(memoryCache, 'memory');
    return;
  }

  if (chrome.storage && chrome.storage.session) {
    const key = selectionCacheKey(tab.id);
    chrome.storage.session.get({ [key]: null }, (items) => {
      useCache(items[key], 'session');
    });
    return;
  }

  callback('');
}

// 兼容旧版本 sync 存储，并迁移到 local，避免 API Key 继续随账号同步
function getStoredConfig(callback) {
  chrome.storage.local.get({
    embyHost: '',
    apiKey: ''
  }, (localConfig) => {
    if (localConfig.embyHost || localConfig.apiKey) {
      callback(localConfig);
      return;
    }

    chrome.storage.sync.get({
      embyHost: '',
      apiKey: ''
    }, (syncConfig) => {
      if (syncConfig.embyHost || syncConfig.apiKey) {
        chrome.storage.local.set(syncConfig, () => {
          chrome.storage.sync.remove(['embyHost', 'apiKey']);
        });
      }
      callback(syncConfig);
    });
  });
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
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
  const resultText = String(result || '');
  const lines = resultText.split('\n');
  const maxLen = Math.max(1, ...lines.map(l => l.length));
  const width = Math.max(600, Math.min(1200, maxLen * 8 + 80));
  const height = Math.max(400, Math.min(800, lines.length * 18 + 120));
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
        <pre>${escapeHtml(resultText)}</pre>
      </body>
    </html>
  `;

  try {
    chrome.windows.create({
      url: 'data:text/html;charset=utf-8,' + encodeURIComponent(html),
      type: 'popup',
      width,
      height
    });
  } catch (e) {
    console.error('Create window error:', e);
    if (tab) showErrorAlert(tab, '无法打开查询结果窗口');
  }
}

// 处理选中的文本
function processSelectedText(selectedText, tab, sendResponse) {
  debugLog('开始处理查询', {
    tabId: tab && tab.id,
    hasText: Boolean(selectedText),
    length: selectedText ? selectedText.length : 0,
    preview: textPreview(selectedText)
  });

  if (!selectedText) {
    if (tab) showErrorAlert(tab, '请先选择影剧名称!');
    if (sendResponse) sendResponse({ ok: false, error: '搜索文本不能为空' });
    return;
  }

  getStoredConfig(function(config) {
    const embyHost = (config.embyHost || '').trim();
    const apiKey = (config.apiKey || '').trim();
    if (!embyHost || !apiKey) {
      showConfigAlert(tab);
      if (sendResponse) sendResponse({ ok: false, error: 'Emby 服务器地址和 API Key 不能为空' });
      return;
    }

    fetch(LOCAL_SERVICE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        [CLIENT_HEADER_NAME]: CLIENT_HEADER_VALUE
      },
      body: JSON.stringify({
        text: selectedText,
        embyHost,
        apiKey
      })
    })
    .then(async response => {
      let data = {};
      try {
        data = await response.json();
      } catch (e) {
        // 非 JSON 错误页时保留状态码提示
      }
      if (!response.ok) {
        throw new Error(data.error || `服务器错误 (${response.status})`);
      }
      return data;
    })
    .then(data => {
      debugLog('查询成功', { tabId: tab && tab.id });
      showResult(tab, data.result);
      if (sendResponse) sendResponse({ ok: true });
    })
    .catch(error => {
      console.error('Emby Query Error:', error);
      debugLog('查询失败', { tabId: tab && tab.id, error: error.message });
      let msg = '查询失败: ';
      if (error.message === 'Failed to fetch') {
        msg += '无法连接到本地服务，请确保 server.py 正在运行';
      } else {
        msg += error.message;
      }
      if (tab) showErrorAlert(tab, msg);
      if (sendResponse) sendResponse({ ok: false, error: msg });
    });
  });
}

// 获取选中的文本并处理
function getSelectionAndProcess(tab) {
  if (!tab || !canAccessPage(tab.url)) {
    safeNotify('无法在此页面使用，请在普通网页上使用');
    return;
  }

  debugLog('工具栏图标点击', { tabId: tab.id, url: tab.url });

  getCachedSelection(tab, (cachedText) => {
    if (cachedText) {
      processSelectedText(cachedText, tab);
      return;
    }

    chrome.tabs.sendMessage(tab.id, { action: 'getSelectedText' }, (response) => {
      if (!chrome.runtime.lastError && response && response.text) {
        debugLog('从内容脚本读取选区', {
          tabId: tab.id,
          length: response.text.length,
          preview: textPreview(response.text)
        });
        processSelectedText(response.text, tab);
        return;
      }

      if (chrome.runtime.lastError) {
        debugLog('读取内容脚本选区失败，回退到 executeScript', chrome.runtime.lastError.message);
      }

      safeExecuteScript(tab.id, () => window.getSelection().toString().trim(), null, (results) => {
        const liveText = results && results[0] ? results[0].result : '';
        debugLog('executeScript 读取选区', {
          tabId: tab.id,
          hasText: Boolean(liveText),
          length: liveText ? liveText.length : 0,
          preview: textPreview(liveText)
        });
        processSelectedText(liveText, tab);
      });
    });
  });
}

function getLiveSelectionAndProcess(tab) {
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
    const selectionText = (info.selectionText || '').trim();
    debugLog('右键菜单点击', {
      tabId: tab && tab.id,
      hasSelectionText: Boolean(selectionText),
      length: selectionText.length,
      preview: textPreview(selectionText)
    });
    if (selectionText) {
      cacheSelection(tab, selectionText, 'contextMenus');
      processSelectedText(selectionText, tab);
    } else {
      getLiveSelectionAndProcess(tab);
    }
  }
});

// 插件图标点击
chrome.action.onClicked.addListener((tab) => {
  getSelectionAndProcess(tab);
});

// 接收来自 content script 的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'processText') {
    cacheSelection(sender.tab, request.text, 'contentIcon');
    processSelectedText(request.text, sender.tab, sendResponse);
    return true;
  }

  if (request.action === 'cacheSelectedText') {
    cacheSelection(sender.tab, request.text, request.source || 'contentScript');
    sendResponse({ ok: true });
  }
});
