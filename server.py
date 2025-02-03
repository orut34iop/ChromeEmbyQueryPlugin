from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import sys

app = Flask(__name__)
CORS(app)

def search_emby(query, emby_host, api_key):
    """搜索 Emby 库中的内容"""
    url = f"{emby_host}/emby/Items"
    
    params = {
        'api_key': api_key,
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
                # 查询季的信息
                seasons_url = f"{emby_host}/emby/Shows/{item['Id']}/Seasons"
                seasons_params = {
                    'api_key': api_key,
                    'Fields': 'TotalRecordCount'
                }
                seasons_response = requests.get(seasons_url, params=seasons_params)
                seasons_response.raise_for_status()
                seasons_data = seasons_response.json()
                
                # 获取 TotalRecordCount 的值,表示一共有多少条season的记录
                total_record_count = data.get("TotalRecordCount")

                for season in seasons_data.get('Items', []):
                    season_number = season.get('IndexNumber', '未知季')
                    show_results += f"第 {season_number} 季:\n"
                    
                    # 查询每集的信息
                    episodes_url = f"{emby_host}/emby/Shows/{item['Id']}/Episodes"
                    episodes_params = {
                        'api_key': api_key,
                        'SeasonId': season['Id'],
                        'Fields': 'Path'
                    }
                    episodes_response = requests.get(episodes_url, params=episodes_params)
                    episodes_response.raise_for_status()
                    episodes_data = episodes_response.json()
                    
                    for episode in episodes_data.get('Items', []):
                        episode_name = episode.get('Name', '未知集')
                        episode_path = episode.get('Path', '无路径')
                        show_results += f"  {episode_name}  --->  {episode_path}\n"
                        break  # 只显示第一集
                show_results += "\n"


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
        emby_host = data.get('embyHost', 'http://192.168.2.42:8096')
        api_key = data.get('apiKey', '850d6a3a78bc4ec6b584077b34b2a956')
        
        # 调用 Emby 搜索函数，传入配置
        result = search_emby(text, emby_host=emby_host, api_key=api_key)
        
        return jsonify({'result': result})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(port=5000)
