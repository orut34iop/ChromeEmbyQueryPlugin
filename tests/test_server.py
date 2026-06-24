import unittest
from unittest.mock import patch

import requests

import server


class FakeResponse:
    def __init__(self, payload, status_code=200):
        self.payload = payload
        self.status_code = status_code

    def raise_for_status(self):
        if self.status_code >= 400:
            raise requests.HTTPError(f"HTTP {self.status_code}")

    def json(self):
        return self.payload


class ServerTestCase(unittest.TestCase):
    def setUp(self):
        server.app.config['TESTING'] = True
        self.client = server.app.test_client()

    def post_process(self, payload=None, headers=None, origin=None, remote_addr='127.0.0.1'):
        request_headers = dict(headers or {})
        if origin:
            request_headers['Origin'] = origin

        return self.client.post(
            '/process',
            json=payload or {
                'text': '测试影片',
                'embyHost': 'http://emby.local:8096',
                'apiKey': 'test-key'
            },
            headers=request_headers,
            environ_overrides={'REMOTE_ADDR': remote_addr}
        )

    def extension_headers(self):
        return {
            server.CLIENT_HEADER_NAME: server.CLIENT_HEADER_VALUE
        }

    def test_process_requires_extension_header(self):
        with patch('server.requests.get') as mock_get:
            response = self.post_process(headers={})

        self.assertEqual(response.status_code, 403)
        self.assertIn('缺少有效的扩展请求标识', response.get_json()['error'])
        mock_get.assert_not_called()

    def test_process_rejects_non_extension_origin(self):
        with patch('server.requests.get') as mock_get:
            response = self.post_process(
                headers=self.extension_headers(),
                origin='https://example.com'
            )

        self.assertEqual(response.status_code, 403)
        self.assertIn('仅允许扩展来源请求', response.get_json()['error'])
        mock_get.assert_not_called()

    def test_process_does_not_emit_cors_headers_for_web_origins(self):
        response = self.client.options(
            '/process',
            headers={
                'Origin': 'https://example.com',
                'Access-Control-Request-Method': 'POST',
                'Access-Control-Request-Headers': server.CLIENT_HEADER_NAME
            },
            environ_overrides={'REMOTE_ADDR': '127.0.0.1'}
        )

        self.assertNotIn('Access-Control-Allow-Origin', response.headers)

    def test_process_returns_504_when_emby_times_out(self):
        with patch('server.requests.get', side_effect=requests.Timeout('timeout')):
            response = self.post_process(headers=self.extension_headers())

        self.assertEqual(response.status_code, 504)
        self.assertIn('超时', response.get_json()['error'])

    def test_series_detail_requests_use_timeout(self):
        calls = []

        def fake_get(url, params=None, timeout=None):
            calls.append({
                'url': url,
                'params': params,
                'timeout': timeout
            })

            if url.endswith('/Items'):
                return FakeResponse({
                    'Items': [{
                        'Type': 'Series',
                        'Id': 'show-1',
                        'Name': '测试剧',
                        'ProductionYear': 2024,
                        'Path': '/media/show'
                    }]
                })

            if url.endswith('/Seasons'):
                return FakeResponse({
                    'Items': [{
                        'Id': 'season-1',
                        'IndexNumber': 1
                    }]
                })

            if url.endswith('/Episodes'):
                return FakeResponse({
                    'Items': [{
                        'Name': '第一集',
                        'Path': '/media/show/S01E01.mkv'
                    }]
                })

            raise AssertionError(f"Unexpected URL: {url}")

        with patch('server.requests.get', side_effect=fake_get):
            result = server.search_emby('测试剧', 'http://emby.local:8096', 'test-key')

        self.assertIn('测试剧', result)
        self.assertIn('第一集', result)
        self.assertEqual([server.EMBY_API_TIMEOUT] * 3, [call['timeout'] for call in calls])

    def test_console_script_entrypoint_exists(self):
        self.assertTrue(callable(server.main))


if __name__ == '__main__':
    unittest.main()
