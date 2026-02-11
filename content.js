// Emby Query 内容脚本
(function() {
  // 避免重复注入
  if (window.embyQueryInjected) return;
  window.embyQueryInjected = true;

  // 创建容器
  let container = document.getElementById('emby-query-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'emby-query-container';
    
    // 设置容器样式 - 使用固定定位避免滚动问题
    container.style.cssText = `
      position: fixed !important;
      width: 56px !important;
      height: 56px !important;
      z-index: 2147483647 !important;
      display: none;
      pointer-events: none !important;
    `;
    
    // 创建图标图片
    const img = document.createElement('img');
    img.src = chrome.runtime.getURL('images/icon48.png');
    img.style.cssText = `
      width: 48px !important;
      height: 48px !important;
      cursor: pointer !important;
      pointer-events: auto !important;
      border-radius: 6px !important;
      box-shadow: 0 4px 12px rgba(0,0,0,0.5) !important;
      background: white !important;
      padding: 4px !important;
      box-sizing: border-box !important;
      display: block !important;
      position: absolute !important;
      top: 0 !important;
      left: 0 !important;
    `;
    
    // 创建备用文字按钮（如果图片加载失败）
    const btn = document.createElement('button');
    btn.textContent = 'Emby';
    btn.style.cssText = `
      width: 48px !important;
      height: 48px !important;
      cursor: pointer !important;
      pointer-events: auto !important;
      border-radius: 6px !important;
      border: none !important;
      background: #2196F3 !important;
      color: white !important;
      font-size: 12px !important;
      font-weight: bold !important;
      box-shadow: 0 4px 12px rgba(0,0,0,0.5) !important;
      position: absolute !important;
      top: 0 !important;
      left: 0 !important;
      display: none;
    `;
    
    container.appendChild(img);
    container.appendChild(btn);
    document.body.appendChild(container);
    
    // 图片加载失败时显示按钮
    img.onerror = function() {
      img.style.display = 'none';
      btn.style.display = 'block';
    };
  }

  const img = container.querySelector('img');
  const btn = container.querySelector('button');

  // 获取选中文本
  function getSelectedText() {
    const sel = window.getSelection();
    return sel ? sel.toString().trim() : '';
  }

  // 显示图标
  function showIcon() {
    const text = getSelectedText();
    if (!text) {
      container.style.display = 'none';
      return;
    }

    try {
      const sel = window.getSelection();
      if (!sel.rangeCount) return;
      
      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      
      if (rect.width === 0 && rect.height === 0) return;

      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const size = 56;
      const gap = 8;

      // 计算位置
      let left = rect.right + gap;
      let top = rect.top + (rect.height - size) / 2;

      // 边界检查
      if (left + size > vw) left = rect.left - size - gap;
      if (left < 0) left = gap;
      if (top < 0) top = gap;
      if (top + size > vh) top = vh - size - gap;

      container.style.left = left + 'px';
      container.style.top = top + 'px';
      container.style.display = 'block';
    } catch (e) {
      console.error('EmbyQuery showIcon error:', e);
    }
  }

  // 隐藏图标
  function hideIcon() {
    container.style.display = 'none';
  }

  // 发送消息
  function sendMessage() {
    const text = getSelectedText();
    if (!text) return;

    try {
      if (!chrome.runtime || !chrome.runtime.id) {
        console.error('EmbyQuery: extension not available');
        return;
      }
      chrome.runtime.sendMessage({ 
        action: 'processText', 
        text: text 
      }, function(response) {
        // 可选：处理响应
      });
      hideIcon();
    } catch (e) {
      console.error('EmbyQuery sendMessage error:', e);
    }
  }

  // 点击处理函数
  function handleClick(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
    }
    sendMessage();
    return false;
  }

  // 绑定点击事件 - 多种方式确保触发
  img.addEventListener('mousedown', handleClick, true);
  img.addEventListener('click', handleClick, true);
  img.addEventListener('mouseup', function(e) {
    e.preventDefault();
    e.stopPropagation();
  }, true);
  
  btn.addEventListener('mousedown', handleClick, true);
  btn.addEventListener('click', handleClick, true);

  // 鼠标按下时隐藏图标
  document.addEventListener('mousedown', function(e) {
    if (e.target === img || e.target === btn) return;
    hideIcon();
  }, true);

  // 鼠标释放时显示图标
  document.addEventListener('mouseup', function(e) {
    if (e.target === img || e.target === btn) return;
    setTimeout(showIcon, 50);
  });

  // 点击页面其他地方隐藏
  document.addEventListener('click', function(e) {
    if (e.target !== img && e.target !== btn && e.target !== container) {
      hideIcon();
    }
  }, true);

  // ESC 隐藏
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') hideIcon();
  });

})();
