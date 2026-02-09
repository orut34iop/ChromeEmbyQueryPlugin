const DEFAULT_HOST = 'http://192.168.2.42:8096';

document.addEventListener('DOMContentLoaded', function() {
  // 加载保存的设置（API Key 默认为空，强制用户配置）
  chrome.storage.sync.get({
    embyHost: DEFAULT_HOST,
    apiKey: ''
  }, function(items) {
    document.getElementById('embyHost').value = items.embyHost || DEFAULT_HOST;
    document.getElementById('apiKey').value = items.apiKey;
    
    // 如果 API Key 为空，显示提示
    if (!items.apiKey) {
      const status = document.getElementById('status');
      status.style.color = '#e74c3c';
      status.textContent = '请先配置 API Key';
    }
  });
});

document.getElementById('save').addEventListener('click', function() {
  const embyHost = document.getElementById('embyHost').value.trim();
  const apiKey = document.getElementById('apiKey').value.trim();
  const status = document.getElementById('status');
  
  // 验证输入
  if (!embyHost) {
    status.style.color = '#e74c3c';
    status.textContent = '请填写 Emby 服务器地址';
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
    status.textContent = 'Emby 服务器地址格式不正确（需要包含 http:// 或 https://）';
    return;
  }
  
  chrome.storage.sync.set({
    embyHost: embyHost,
    apiKey: apiKey
  }, function() {
    status.style.color = '#27ae60';
    status.textContent = '设置已保存！';
    setTimeout(function() {
      status.textContent = '';
      status.style.color = '';  // 恢复默认颜色
    }, 2000);
  });
});
