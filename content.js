// This script runs in the context of web pages

// 创建浮动图标
const icon = document.createElement('img');
icon.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAACXBIWXMAAAsTAAALEwEAmpwYAAADrUlEQVR4nO2XyU8TARTG52KAihZks4KAkYOJF0P/ABcKggWKYK1UZDXoQUPiZRITY8EqIiA7WLSKVRZriwlBjKhRkAa1MU0FEVGJBFRc4u75M1MdI7J0ZtqJnaRf8qXt7fe9efPeK0F45ZVnSqorXLTKtPsA9UkIE76gM9pUgOjLed0xPft9CGHC5yPKmI+ojlxhhJDOBX8pD5EduYhoz/bsENIF4Fe252BlWzYiLu7yzBBSJvCtjgBYYcjqjqlJ9BEkfPiFLIQbdkJyXu0ZIaQc4FecV0PSoobkbOb/DeES/LlMLD+7A2H67WaC2hO6wkWhzcoDju9CgV+uVyHszHaENivNoTqlOUS3DcFN6b8CCQb+tCMAKPiQUxkIbspAUGM6v60VbSpQ8QUf3JiOoIatCKxT8Pskooz5JXzBL6tPw7I6BQJrFZ28hKBaKNKY3zkffIm1FbGmfa7CI7AmFeLq5G7Cne3kDJ6qvPX1KD5++4pqWydiLuZxhg+oTkFAVTLElXL3hGACT7XN4OQIvn3/4fDz91MoutMIiV7FDf6kHEsr5VhakeRaCKbwVNtYJobx+cvXGb77cghJVw5yhN+CJeVJ8C9L5BaCDTzV8/3jdnz4+GlOm4b7sM6whzX8khOJVAAsPp7ALgRbeOqFvf3Mhul3H+b15PQ0KiyXEKnLZAm/GYtLE+B3LJ5ZCC7w1At7c9SKV2/eOrV9fAyF3RUIrk1jDC86Fg/RURl8j8SpeIGnps31x/cxMfWasa8NDWJ1007m8FrZYd7gqVHZMzSI8YlJRr5qt2CDoch98JSijbkqVzZsl30AY+MvF7R19DH2dlUiqDqVMbzfkTgNwVSR7bkk1/PgysN+jIy9mNOPnj5D8Y0WRDQo2fW8lkHlZ4VozSa53DbmB7cx9GRsllssPYjV72H/wmo5wNMKb80i2R5mxnu3YBt+8sdXrQNI6zjEalSK3AH/J4RBTbI5zNosvbDahzFgs6Goqwah9dv+HzwtSYuaZHpVXui7hvLeNqxpzmG9pER8wNMK06s0TK7KtWfyOG1YET1ttHEjhE7Kz5+ZsNNKjWtXpTN4GTUu4atxsmldUUizkuQVvmST+9tnVoimDM0M+DrFHXfA+xRvZL6sXFVQ41byd+UdFQusUZAeX/l/FdCQtv7v3+KqFI3HV96ZxJVy0uMr70zicjkpWHha/mWJpGDhaYlKE0jBwtMSlcpIwcLT8tXKSMHC0/It3jBj5HrllVeEW/QToe2JZIVVr30AAAAASUVORK5CYII=';
icon.style.position = 'absolute';
icon.style.width = '48px';
icon.style.height = '48px';
icon.style.cursor = 'pointer';
icon.style.zIndex = '10000';
icon.style.opacity = '1'; // 设置为不透明
document.body.appendChild(icon);

// 添加临时启用文本选择的功能
function enableTextSelection(element) {
  if (!element) return;
  
  const originalStyles = {
    userSelect: element.style.userSelect,
    webkitUserSelect: element.style.webkitUserSelect,
    mozUserSelect: element.style.mozUserSelect,
    msUserSelect: element.style.msUserSelect
  };

  element.style.userSelect = 'text';
  element.style.webkitUserSelect = 'text';
  element.style.mozUserSelect = 'text';
  element.style.msUserSelect = 'text';

  return originalStyles;
}

function restoreTextSelection(element, originalStyles) {
  if (!element || !originalStyles) return;
  
  element.style.userSelect = originalStyles.userSelect;
  element.style.webkitUserSelect = originalStyles.webkitUserSelect;
  element.style.mozUserSelect = originalStyles.mozUserSelect;
  element.style.msUserSelect = originalStyles.msUserSelect;
}

// 修改鼠标事件监听
document.addEventListener('mousedown', function(event) {
  const target = event.target;
  const computedStyle = window.getComputedStyle(target);
  
  if (computedStyle.userSelect === 'none' || 
      computedStyle.webkitUserSelect === 'none') {
    const originalStyles = enableTextSelection(target);
    
    // 在mouseup时恢复样式
    const restoreStyles = function(e) {
      restoreTextSelection(target, originalStyles);
      document.removeEventListener('mouseup', restoreStyles);
    };
    
    document.addEventListener('mouseup', restoreStyles);
  }
});

// 使图标跟随鼠标选中的文本位置
document.addEventListener('mouseup', (event) => {
  const selectedText = window.getSelection().toString().trim();
  if (selectedText) {
    const range = window.getSelection().getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const scrollX = window.scrollX || window.pageXOffset;
    const scrollY = window.scrollY || window.pageYOffset;
    // 修改位置计算，将图标放在选中文本的右边
    icon.style.left = `${rect.right + scrollX + 8}px`;  // 右边距离选中文本8像素
    icon.style.top = `${rect.top + scrollY + (rect.height - icon.height) / 2}px`;  // 垂直居中
    icon.style.display = 'block';
  } else {
    icon.style.display = 'none';
  }
});

// 修改点击图标时的处理
icon.addEventListener('click', function() {
  const selection = window.getSelection();
  const selectedText = selection.toString().trim();
  
  if (selectedText) {
    const range = selection.getRangeAt(0);
    const element = range.commonAncestorContainer.parentElement;
    
    // 临时启用选择以确保能获取到文本
    const originalStyles = enableTextSelection(element);
    
    chrome.runtime.sendMessage({ 
      action: 'processText', 
      text: selectedText 
    });
    
    // 恢复原始样式
    restoreTextSelection(element, originalStyles);
  } else {
    alert('请先选择文本');
  }
});
