from flask import Flask, request, jsonify
import re
import requests
import logging
import time
from ipaddress import ip_address
from urllib.parse import urlparse

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

CLIENT_HEADER_NAME = 'X-Emby-Query-Client'
CLIENT_HEADER_VALUE = 'chrome-extension'

class ConfigError(ValueError):
    """用户配置错误。"""

def is_local_address(remote_addr):
    """判断请求是否来自本机回环地址。"""
    if remote_addr in ALLOWED_HOSTS:
        return True

    try:
        return ip_address(remote_addr).is_loopback
    except ValueError:
        return False

def validate_extension_request():
    """限制 /process 只能由本机扩展后台脚本调用。"""
    if not is_local_address(request.remote_addr):
        logger.warning(f"拒绝非本地请求: {request.remote_addr}")
        return jsonify({'error': '仅允许本地请求'}), 403

    if request.headers.get(CLIENT_HEADER_NAME) != CLIENT_HEADER_VALUE:
        logger.warning(f"拒绝缺少扩展标识的请求: {request.remote_addr}")
        return jsonify({'error': '缺少有效的扩展请求标识'}), 403

    origin = request.headers.get('Origin', '')
    if origin and not origin.startswith('chrome-extension://'):
        logger.warning(f"拒绝非扩展来源请求: {origin}")
        return jsonify({'error': '仅允许扩展来源请求'}), 403

    return None

def normalize_emby_host(emby_host):
    """校验并规范化 Emby 服务器地址。"""
    parsed = urlparse(emby_host)
    if parsed.scheme not in ('http', 'https') or not parsed.netloc:
        raise ConfigError('Emby 服务器地址格式不正确')

    return emby_host.rstrip('/')

def build_auth_headers(api_key, server_type):
    """构造服务端鉴权头；Jellyfin 12 已默认禁用旧式 api_key 参数。"""
    if server_type != 'jellyfin':
        return {}

    if any(character in api_key for character in ('"', '\r', '\n')):
        raise ConfigError('API Key 格式不正确')

    return {
        'Authorization': f'MediaBrowser Token="{api_key}"'
    }

def search_emby(query, emby_host, api_key, server_type='jellyfin'):
    """搜索 Emby/Jellyfin 库中的内容"""
    # Emby 使用 /emby/ 路径前缀，Jellyfin 直接使用 /
    api_prefix = '/emby' if server_type == 'emby' else ''
    url = f"{emby_host}{api_prefix}/Items"
    auth_headers = build_auth_headers(api_key, server_type)
    
    params = {
        'SearchTerm': query,
        'IncludeItemTypes': SEARCH_ITEM_TYPES,  # 只搜索电影和剧集
        'Recursive': 'true',
        'Fields': SEARCH_FIELDS,
        'Limit': SEARCH_LIMIT  # 限制返回结果数量
    }

    if server_type == 'emby':
        # 保留 Emby 的现有鉴权和名称搜索参数，避免影响 Emby 用户。
        params['api_key'] = api_key
        params['SearchTypes'] = 'Name'

    response = requests.get(
        url,
        params=params,
        headers=auth_headers,
        timeout=EMBY_API_TIMEOUT
    )
    response.raise_for_status()
    data = response.json()

    items = data.get('Items', [])
    items_count = len(items)  # 计算Items的个数
    if items_count == 0:
        return "Emby库中未找到相关影片"

    results = []
    movie_results = "电影：\n"
    show_results = "电视：\n"

    for item in items:
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
            seasons_url = f"{emby_host}{api_prefix}/Shows/{item['Id']}/Seasons"
            seasons_params = {}
            if server_type == 'emby':
                seasons_params['api_key'] = api_key
            seasons_response = requests.get(
                seasons_url,
                params=seasons_params,
                headers=auth_headers,
                timeout=EMBY_API_TIMEOUT
            )
            seasons_response.raise_for_status()
            seasons_data = seasons_response.json()

            for season in seasons_data.get('Items', []):
                season_number = season.get('IndexNumber', '未知季')
                show_results += f"第 {season_number} 季:\n"

                # 查询每集的信息
                episodes_url = f"{emby_host}{api_prefix}/Shows/{item['Id']}/Episodes"
                episodes_params = {
                    'SeasonId': season['Id'],
                    'Fields': 'Path'
                }
                if server_type == 'emby':
                    episodes_params['api_key'] = api_key
                episodes_response = requests.get(
                    episodes_url,
                    params=episodes_params,
                    headers=auth_headers,
                    timeout=EMBY_API_TIMEOUT
                )
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

@app.route('/health', methods=['GET'])
def health_check():
    """健康检查接口"""
    return jsonify({'status': 'ok', 'timestamp': time.time()})

@app.route('/process', methods=['POST'])
def process_text():
    validation_error = validate_extension_request()
    if validation_error:
        return validation_error
    
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': '无效的请求数据'}), 400
            
        text = data.get('text', '').strip()
        if not text:
            return jsonify({'error': '搜索文本不能为空'}), 400

        # 去除搜索文本末尾括号及其内容（年份/不完整年份/纯右括号）
        # "甜木兰 (2020)" "甜木兰(2" "木兰 2020" "木兰)" 都 -> "甜木兰" / "木兰"
        text = re.sub(r'\s*[(（]\s*\d*\s*[)）]?\s*$', '', text).strip()
        text = re.sub(r'\s*[(（]\s*$', '', text).strip()
        text = re.sub(r'\s*\d{4}\s*$', '', text).strip()
        text = re.sub(r'\s*[)）]\s*$', '', text).strip()
        if not text:
            return jsonify({'error': '搜索文本不能为空'}), 400

        server_type = data.get('serverType', 'jellyfin').strip()
        if server_type not in ('emby', 'jellyfin'):
            server_type = 'jellyfin'

        emby_host = data.get('embyHost', '').strip()
        api_key = data.get('apiKey', '').strip()

        if not emby_host or not api_key:
            return jsonify({'error': '服务器地址和 API Key 不能为空'}), 400

        emby_host = normalize_emby_host(emby_host)

        logger.info(f"搜索查询: '{text}' [{server_type}] 来自 {request.remote_addr}")

        # 调用搜索函数，传入配置
        result = search_emby(text, emby_host=emby_host, api_key=api_key, server_type=server_type)
        
        return jsonify({'result': result})
    except requests.Timeout:
        logger.error("请求媒体服务器超时")
        return jsonify({'error': '连接媒体服务器超时'}), 504
    except requests.HTTPError as e:
        status_code = e.response.status_code if e.response is not None else None
        logger.error("媒体服务器返回 HTTP %s", status_code or '错误')
        if status_code in (401, 403):
            return jsonify({
                'error': '媒体服务器拒绝了 API Key，请重新生成 API Key 并更新插件配置'
            }), 502
        return jsonify({
            'error': f'媒体服务器返回 HTTP {status_code or "错误"}'
        }), 502
    except requests.RequestException as e:
        # 不输出完整异常 URL，避免 Emby 旧式查询参数中的 API Key 进入日志或弹窗。
        logger.error("连接媒体服务器失败: %s", type(e).__name__)
        return jsonify({'error': '连接媒体服务器失败'}), 502
    except ConfigError as e:
        logger.error(f"请求参数错误: {e}")
        return jsonify({'error': str(e)}), 400
    except ValueError as e:
        logger.error(f"媒体服务器响应不是有效 JSON: {e}")
        return jsonify({'error': '媒体服务器响应格式不正确'}), 502
    except Exception as e:
        logger.error(f"处理请求时出错: {e}")
        return jsonify({'error': f'服务器内部错误: {str(e)}'}), 500

def main():
    logger.info(f"启动 Emby Query 服务器... http://{SERVER_HOST}:{SERVER_PORT}")
    app.run(host=SERVER_HOST, port=SERVER_PORT, debug=DEBUG_MODE)

if __name__ == '__main__':
    main()
