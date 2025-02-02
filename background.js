// 通用处理函数
function processSelectedText(selectedText, tab) {
  if (selectedText) {
    fetch('http://localhost:5000/process', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: selectedText })
    })
    .then(response => response.json())
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
          newWindow.document.write(`<pre>${result}</pre>`);
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
  } else {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: () => alert('请先选择影剧名称!')
    });
  }
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
