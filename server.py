from flask import Flask, request, jsonify
from flask_cors import CORS
import sys

app = Flask(__name__)
CORS(app)

@app.route('/process', methods=['POST'])
def process_text():
    try:
        data = request.get_json()
        text = data.get('text', '')
        
        # Create a safe environment for executing the code
        local_dict = {}
        
        # Set up the input text as a variable
        local_dict['input_text'] = text
        
        # Example processing - you can modify this based on your needs
        # Here we're doing a simple string manipulation
        code = "result = input_text.upper()"  # Default operation: convert to uppercase
        
        # Execute the code in the safe environment
        exec(code, {"__builtins__": {}}, local_dict)
        
        # Get the result
        result = local_dict.get('result', 'No result produced')
        
        return jsonify({'result': result})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(port=5000)
