document.addEventListener('DOMContentLoaded', function() {
  // 加载保存的设置
  chrome.storage.sync.get({
    embyHost: 'http://192.168.2.42:8096',
    apiKey: '850d6a3a78bc4ec6b584077b34b2a956'
  }, function(items) {
    document.getElementById('embyHost').value = items.embyHost;
    document.getElementById('apiKey').value = items.apiKey;
  });
});

document.getElementById('save').addEventListener('click', function() {
  const embyHost = document.getElementById('embyHost').value;
  const apiKey = document.getElementById('apiKey').value;
  
  chrome.storage.sync.set({
    embyHost: embyHost,
    apiKey: apiKey
  }, function() {
    const status = document.getElementById('status');
    status.textContent = '设置已保存！';
    setTimeout(function() {
      status.textContent = '';
    }, 2000);
  });
});
