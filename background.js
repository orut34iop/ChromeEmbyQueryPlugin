// 显示配置提示
function showConfigAlert(tab) {
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    function: () => {
      alert('请先配置 Emby 服务器地址和 API Key\n右键点击扩展图标，选择"选项"进行配置');
    }
  });
}

// 显示错误提示
function showErrorAlert(tab, message) {
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    function: (msg) => alert(msg),
    args: [message]
  });
}

// 通用处理函数
function processSelectedText(selectedText, tab) {
  if (!selectedText) {
    showErrorAlert(tab, '请先选择影剧名称!');
    return;
  }

  // 获取配置（移除硬编码的敏感信息）
  chrome.storage.sync.get({
    embyHost: '',
    apiKey: ''
  }, function(config) {
    // 验证配置
    if (!config.embyHost || !config.apiKey) {
      showConfigAlert(tab);
      return;
    }

    fetch('http://localhost:5000/process', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
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
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: (result) => {
          const lines = result.split('\n');
          const maxLength = Math.max(...lines.map(line => line.length));
          const totalLines = lines.length;
          const width = Math.max(600, Math.min(1200, maxLength * 8)); // 限制最大宽度
          const height = Math.max(400, Math.min(800, totalLines * 16)); // 限制最大高度
          const newWindow = window.open('', '', `width=${width},height=${height},scrollbars=yes`);
          newWindow.document.write(`
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
                <pre>${result}</pre>
              </body>
            </html>
          `);
        },
        args: [data.result]
      });
    })
    .catch(error => {
      console.error('Emby Query Error:', error);
      let errorMessage = '查询失败: ';
      if (error.message === 'Failed to fetch') {
        errorMessage += '无法连接到本地服务，请确保 server.py 正在运行';
      } else {
        errorMessage += error.message;
      }
      showErrorAlert(tab, errorMessage);
    });
  });
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'processText',
    title: '查询Emby媒体库',
    contexts: ['selection']
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'processText') {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: () => window.getSelection().toString().trim()
    }, (results) => {
      const selectedText = results[0].result;
      processSelectedText(selectedText, tab);
    });
  }
});

chrome.action.onClicked.addListener((tab) => {
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    function: () => window.getSelection().toString().trim()
  }, (results) => {
    const selectedText = results[0].result;
    processSelectedText(selectedText, tab);
  });
});

// 监听来自 content script 的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'processText') {
    processSelectedText(request.text, sender.tab);
  }
  return true; // 保持消息通道开放
});
