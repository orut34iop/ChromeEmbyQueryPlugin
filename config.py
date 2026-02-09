"""
Emby Query 服务器配置
统一配置文件，集中管理所有配置项
"""

import os

# 服务器配置
SERVER_HOST = os.getenv('EMBY_QUERY_HOST', '127.0.0.1')
SERVER_PORT = int(os.getenv('EMBY_QUERY_PORT', '5000'))
DEBUG_MODE = os.getenv('EMBY_QUERY_DEBUG', 'false').lower() == 'true'

# 安全配置
MAX_CONTENT_LENGTH = 1 * 1024 * 1024  # 1MB
ALLOWED_HOSTS = ['127.0.0.1', 'localhost', '::1']

# 请求配置
REQUEST_TIMEOUT = 10  # 秒
EMBY_API_TIMEOUT = 15  # 秒

# 缓存配置
CACHE_TTL = 300  # 5分钟
CACHE_MAX_SIZE = 100  # 最大缓存条目数

# 日志配置
LOG_LEVEL = os.getenv('EMBY_QUERY_LOG_LEVEL', 'INFO')
LOG_FORMAT = '%(asctime)s - %(levelname)s - %(message)s'

# Emby 默认配置（仅用于提示，实际配置在插件中设置）
DEFAULT_EMBY_HOST = 'http://192.168.2.42:8096'
DEFAULT_EMBY_API_KEY = ''  # 必须手动配置

# 搜索配置
SEARCH_ITEM_TYPES = 'Movie,Series'
SEARCH_LIMIT = 500
SEARCH_FIELDS = 'ProductionYear,ProviderIds,Path'
