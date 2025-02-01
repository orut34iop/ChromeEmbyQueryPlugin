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
      function: () => {
        // 获取选中文本并处理
        const selectedText = window.getSelection().toString().trim();
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
            alert(data.result);
          })
          .catch(error => {
            alert('错误: ' + error.message);
          });
        } else {
          alert('请先选择影剧名称!');
        }
      }
    });
  }
});

chrome.action.onClicked.addListener((tab) => {
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    function: () => {
      // 获取选中文本并处理
      const selectedText = window.getSelection().toString().trim();
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
          alert(data.result);
        })
        .catch(error => {
          alert('错误: ' + error.message);
        });
      } else {
        alert('请先选择影剧名称!');
      }
    }
  });
});
