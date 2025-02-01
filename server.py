from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import sys

app = Flask(__name__)
CORS(app)

# Emby 配置
EMBY_HOST = "http://192.168.2.42:8096"  # 修改为你的 Emby 服务器地址
API_KEY = "850d6a3a78bc4ec6b584077b34b2a956"  # 修改为你的 API key

def search_emby(query):
    """搜索 Emby 库中的内容"""
    url = f"{EMBY_HOST}/emby/Items"
    
    params = {
        'api_key': f"{API_KEY}",
        'SearchTerm': query,
        'IncludeItemTypes': 'Movie,Series',  # 只搜索电影和剧集
        'Recursive': 'true',
		'SearchTypes': 'Name',  # 按名称搜索
        'Fields': 'ProductionYear,ProviderIds,Path',
        'Limit': 500  # 限制返回结果数量
    }
    
    try:
        response = requests.get(url, params=params)
        response.raise_for_status()
        data = response.json()
        

        items = data.get('Items', [])
        items_count = len(items)  # 计算Items的个数
        if items_count == 0:
            return "Emby库中未找到相关影片"

        results = []
        movie_results = "电影：\n"
        show_results = "电视：\n"

        for item in data.get('Items', []):
            item_type = "电影" if item['Type'] == 'Movie' else "电视"
            name = item.get('Name', '')
            year = item.get('ProductionYear', '')
            path = item.get('Path', '')  # 为了遵循Python命名规范，将变量名 'Path' 改为 'path'
            
            # 根据类型添加到对应的结果字符串中
            if item_type == "电影":
                movie_results += f"{name} ({year})  --->  {path}\n"
            else:
                show_results += f"{name} ({year})  --->  {path}\n"

        # 将结果合并
        if movie_results != "电影：\n": results.append(movie_results)
        if show_results != "电视：\n": results.append(show_results)

        return "\n".join(results)
        
    except Exception as e:
        return f"搜索出错: {str(e)}"

@app.route('/process', methods=['POST'])
def process_text():
    try:
        data = request.get_json()
        text = data.get('text', '')
        
        # 调用 Emby 搜索函数
        result = search_emby(text)
        
        return jsonify({'result': result})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(port=5000)
