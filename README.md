# Python Text Processor Chrome Extension

This Chrome extension allows you to process selected text using Python code. When you select text on any webpage and click the extension icon, the text will be processed by a Python script and the result will be displayed in a popup.

## Installation

1. Install Python dependencies:
```bash
pip install -r requirements.txt
```

2. Load the extension in Chrome:
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" in the top right
   - Click "Load unpacked" and select this directory

3. Start the Python server:
```bash
python server.py
```

## Usage

1. Select any text on a webpage
2. Click the extension icon (blue "P" icon)
3. The processed result will appear in a popup

## Default Behavior

By default, the extension will convert the selected text to uppercase. You can modify the Python processing logic in `server.py` to implement different text processing operations.

## Customization

To modify how the text is processed, edit the `code` variable in the `process_text()` function within `server.py`. The selected text is available as `input_text` variable.

Example modifications:
```python
# Reverse the text
code = """
result = input_text[::-1]
"""

# Count words
code = """
result = str(len(input_text.split()))
"""

# Convert to lowercase
code = """
result = input_text.lower()
"""
```

## Security Note

The server runs locally on port 5000 and only processes text from the Chrome extension. The Python code execution is done in a restricted environment for safety.
