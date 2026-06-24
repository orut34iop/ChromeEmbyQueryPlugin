function loadConfig(callback) {
  chrome.storage.local.get({
    serverType: 'jellyfin',
    embyHost: 'http://127.0.0.1:8096',
    apiKey: ''
  }, function(localItems) {
    if (localItems.embyHost || localItems.apiKey) {
      callback(localItems);
      return;
    }

    chrome.storage.sync.get({
      serverType: 'emby',
      embyHost: '',
      apiKey: ''
    }, function(syncItems) {
      if (syncItems.embyHost || syncItems.apiKey) {
        // 从 sync 迁移过来的旧配置默认是 Emby 类型
        syncItems.serverType = 'emby';
        chrome.storage.local.set(syncItems, function() {
          chrome.storage.sync.remove(['serverType', 'embyHost', 'apiKey']);
        });
      }
      callback(syncItems);
    });
  });
}

document.addEventListener('DOMContentLoaded', function() {
  // 加载保存的设置
  loadConfig(function(items) {
    document.getElementById('serverType').value = items.serverType || 'jellyfin';
    document.getElementById('embyHost').value = items.embyHost || '';
    document.getElementById('apiKey').value = items.apiKey || '';
  });
});

document.getElementById('save').addEventListener('click', function() {
  const serverType = document.getElementById('serverType').value;
  const embyHost = document.getElementById('embyHost').value.trim();
  const apiKey = document.getElementById('apiKey').value.trim();
  const status = document.getElementById('status');

  // 验证输入
  if (!embyHost) {
    status.style.color = '#e74c3c';
    status.textContent = '请填写服务器地址';
    return;
  }

  if (!apiKey) {
    status.style.color = '#e74c3c';
    status.textContent = '请填写 API Key';
    return;
  }

  // 验证 URL 格式
  try {
    new URL(embyHost);
  } catch (e) {
    status.style.color = '#e74c3c';
    status.textContent = '服务器地址格式不正确（需要包含 http:// 或 https://）';
    return;
  }

  chrome.storage.local.set({
    serverType: serverType,
    embyHost: embyHost,
    apiKey: apiKey
  }, function() {
    chrome.storage.sync.remove(['serverType', 'embyHost', 'apiKey']);
    status.style.color = '#27ae60';
    status.textContent = '设置已保存！';
    setTimeout(function() {
      status.textContent = '';
      status.style.color = '';  // 恢复默认颜色
    }, 2000);
  });
});
