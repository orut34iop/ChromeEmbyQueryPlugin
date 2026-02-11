const DEFAULT_HOST = 'http://192.168.2.43:8096';
const DEFAULT_API_KEY = 'd3928cf0934b4280be51ff33ce8dfeca';

document.addEventListener('DOMContentLoaded', function() {
  // 加载保存的设置
  chrome.storage.sync.get({
    embyHost: DEFAULT_HOST,
    apiKey: DEFAULT_API_KEY
  }, function(items) {
    document.getElementById('embyHost').value = items.embyHost || DEFAULT_HOST;
    document.getElementById('apiKey').value = items.apiKey || DEFAULT_API_KEY;
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
