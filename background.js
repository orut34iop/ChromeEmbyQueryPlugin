// 通用处理函数
function processSelectedText(selectedText, tab) {
  if (!selectedText) {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: () => alert('请先选择影剧名称!')
    });
    return;
  }

  fetch('http://localhost:5000/process', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text: selectedText })
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('网络请求失败');
    }
    return response.json();
  })
  .then(data => {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: (result) => {
        const lines = result.split('\n');
        const maxLength = Math.max(...lines.map(line => line.length));
        const totalLines = lines.length;
        const width = Math.max(600, maxLength * 8);
        const height = Math.max(400, totalLines * 16);
        const newWindow = window.open('', '', `width=${width},height=${height}`);
        newWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <style>
                body { margin: 20px; font-family: monospace; }
                pre { white-space: pre-wrap; }
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
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: (message) => alert('错误: ' + message),
      args: [error.message]
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
