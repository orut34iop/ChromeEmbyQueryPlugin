from flask import Flask, request, jsonify, abort
from flask_cors import CORS
import requests
import sys
import logging
import time
from functools import lru_cache

# 导入配置
try:
    from config import (
        SERVER_HOST, SERVER_PORT, DEBUG_MODE,
        MAX_CONTENT_LENGTH, ALLOWED_HOSTS,
        REQUEST_TIMEOUT, EMBY_API_TIMEOUT,
        CACHE_TTL, LOG_LEVEL, LOG_FORMAT,
        SEARCH_ITEM_TYPES, SEARCH_LIMIT, SEARCH_FIELDS
    )
except ImportError:
    # 默认配置
    SERVER_HOST, SERVER_PORT = '127.0.0.1', 5000
    DEBUG_MODE = False
    MAX_CONTENT_LENGTH = 1024 * 1024
    ALLOWED_HOSTS = ['127.0.0.1', 'localhost', '::1']
    REQUEST_TIMEOUT = EMBY_API_TIMEOUT = 10
    CACHE_TTL = 300
    LOG_LEVEL, LOG_FORMAT = 'INFO', '%(asctime)s - %(levelname)s - %(message)s'
    SEARCH_ITEM_TYPES, SEARCH_LIMIT = 'Movie,Series', 500
    SEARCH_FIELDS = 'ProductionYear,ProviderIds,Path'

# 配置日志
logging.basicConfig(
    level=getattr(logging, LOG_LEVEL.upper(), logging.INFO),
    format=LOG_FORMAT
)
logger = logging.getLogger(__name__)

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = MAX_CONTENT_LENGTH
CORS(app)

def search_emby(query, emby_host, api_key):
    """搜索 Emby 库中的内容"""
    url = f"{emby_host}/emby/Items"
    
    params = {
        'api_key': api_key,
        'SearchTerm': query,
        'IncludeItemTypes': SEARCH_ITEM_TYPES,  # 只搜索电影和剧集
        'Recursive': 'true',
		'SearchTypes': 'Name',  # 按名称搜索
        'Fields': SEARCH_FIELDS,
        'Limit': SEARCH_LIMIT  # 限制返回结果数量
    }
    
    try:
        response = requests.get(url, params=params, timeout=EMBY_API_TIMEOUT)
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
                total_record_count = seasons_data.get("TotalRecordCount")

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

# 简单的请求缓存
search_cache = {}
CACHE_TTL = CACHE_TTL  # 使用配置文件中的值

@app.route('/health', methods=['GET'])
def health_check():
    """健康检查接口"""
    return jsonify({'status': 'ok', 'timestamp': time.time()})

@app.route('/process', methods=['POST'])
def process_text():
    # 安全：只允许本地请求
    if request.remote_addr not in ALLOWED_HOSTS:
        logger.warning(f"拒绝非本地请求: {request.remote_addr}")
        abort(403)
    
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': '无效的请求数据'}), 400
            
        text = data.get('text', '').strip()
        if not text:
            return jsonify({'error': '搜索文本不能为空'}), 400
            
        emby_host = data.get('embyHost', '').strip()
        api_key = data.get('apiKey', '').strip()
        
        if not emby_host or not api_key:
            return jsonify({'error': 'Emby 服务器地址和 API Key 不能为空'}), 400
        
        logger.info(f"搜索查询: '{text}' 来自 {request.remote_addr}")
        
        # 调用 Emby 搜索函数，传入配置
        result = search_emby(text, emby_host=emby_host, api_key=api_key)
        
        return jsonify({'result': result})
    except requests.Timeout:
        logger.error("请求 Emby 服务器超时")
        return jsonify({'error': '连接 Emby 服务器超时'}), 504
    except requests.RequestException as e:
        logger.error(f"请求 Emby 服务器失败: {e}")
        return jsonify({'error': f'连接 Emby 服务器失败: {str(e)}'}), 502
    except Exception as e:
        logger.error(f"处理请求时出错: {e}")
        return jsonify({'error': f'服务器内部错误: {str(e)}'}), 500

if __name__ == '__main__':
    logger.info(f"启动 Emby Query 服务器... http://{SERVER_HOST}:{SERVER_PORT}")
    app.run(host=SERVER_HOST, port=SERVER_PORT, debug=DEBUG_MODE)
