chrome.action.onClicked.addListener((tab) => {
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    function: () => {
      // Get the selected text
      const selectedText = window.getSelection().toString().trim();
      if (selectedText) {
        // Send selected text to our local Python server
        fetch('http://localhost:5000/process', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ text: selectedText })
        })
        .then(response => response.json())
        .then(data => {
          // Show result in an alert
            alert(data.result);
          })
          .catch(error => {
            alert('错误: ' + error.message);
          });
        } else {
          alert('请先选择影剧名!');
        }
    }
  });
});
