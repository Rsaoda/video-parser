from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import re
import requests

app = Flask(__name__, static_folder='.')
CORS(app)

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1'
}

@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/api/parse', methods=['GET'])
def parse():
    url = request.args.get('url', '')
    if not url:
        return jsonify({'error': '请输入视频链接'}), 400

    try:
        result = None
        if 'douyin.com' in url or 'iesdouyin.com' in url:
            result = parse_douyin(url)
        elif 'kuaishou.com' in url or 'gifshow.com' in url:
            result = parse_kuaishou(url)
        elif 'bilibili.com' in url or 'b23.tv' in url:
            result = parse_bilibili(url)
        elif 'xiaohongshu.com' in url or 'xhslink.com' in url or 'xhs.cn' in url:
            result = parse_xhs(url)
        elif 'weibo.com' in url or 'weibo.cn' in url:
            result = parse_weibo(url)
        else:
            return jsonify({'error': '暂不支持该平台'}), 400

        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def parse_douyin(url):
    """解析抖音视频"""
    # 获取重定向链接
    resp = requests.get(url, headers=HEADERS, allow_redirects=True)
    final_url = resp.url

    # 提取视频ID
    video_id = ''
    match = re.search(r'video/(\d+)', final_url) or re.search(r'video/(\d+)', resp.text)
    if match:
        video_id = match.group(1)

    if not video_id:
        match = re.search(r'"awemeId":"(\d+)"', resp.text) or re.search(r'aweme_id.*?(\d{15,})', resp.text)
        if match:
            video_id = match.group(1)

    if not video_id:
        raise Exception('无法解析抖音视频ID')

    # 获取视频信息
    api_url = f'https://www.iesdouyin.com/web/api/v2/aweme/iteminfo/?item_ids={video_id}'
    api_resp = requests.get(api_url, headers=HEADERS)
    data = api_resp.json()

    if data.get('item_list') and len(data['item_list']) > 0:
        item = data['item_list'][0]
        video_url = item['video']['play_addr']['url_list'][0].replace('playwm', 'play')
        return {
            'success': True,
            'platform': '抖音',
            'title': item.get('desc', ''),
            'video_url': video_url,
            'cover': item['video']['cover']['url_list'][0],
            'author': item['author']['nickname']
        }

    raise Exception('获取视频信息失败')

def parse_kuaishou(url):
    """解析快手视频"""
    resp = requests.get(url, headers=HEADERS)
    html = resp.text

    video_match = re.search(r'"photoUrl":"([^"]+)"', html)
    title_match = re.search(r'"caption":"([^"]+)"', html)
    cover_match = re.search(r'"coverUrl":"([^"]+)"', html)
    author_match = re.search(r'"authorName":"([^"]+)"', html)

    if video_match:
        return {
            'success': True,
            'platform': '快手',
            'title': title_match.group(1) if title_match else '未知标题',
            'video_url': video_match.group(1).replace('\\u002F', '/'),
            'cover': cover_match.group(1).replace('\\u002F', '/') if cover_match else '',
            'author': author_match.group(1) if author_match else '未知作者'
        }

    raise Exception('无法解析快手视频')

def parse_bilibili(url):
    """解析B站视频"""
    bvid = ''

    if 'b23.tv' in url:
        resp = requests.get(url, headers=HEADERS, allow_redirects=True)
        match = re.search(r'BV[a-zA-Z0-9]+', resp.url)
        if match:
            bvid = match.group(0)
    else:
        match = re.search(r'BV[a-zA-Z0-9]+', url)
        if match:
            bvid = match.group(0)

    if not bvid:
        raise Exception('无法识别B站视频BV号')

    api_url = f'https://api.bilibili.com/x/web-interface/view?bvid={bvid}'
    resp = requests.get(api_url, headers={**HEADERS, 'Referer': 'https://www.bilibili.com'})
    data = resp.json()

    if data.get('data'):
        return {
            'success': True,
            'platform': 'B站',
            'title': data['data']['title'],
            'video_url': f'https://www.bilibili.com/video/{bvid}',
            'cover': data['data']['pic'],
            'author': data['data']['owner']['name']
        }

    raise Exception('获取B站视频信息失败')

def parse_xhs(url):
    """解析小红书视频"""
    resp = requests.get(url, headers=HEADERS)
    html = resp.text

    video_match = re.search(r'"url":"([^"]+\.mp4[^"]*)"', html)
    title_match = re.search(r'"desc":"([^"]+)"', html)
    cover_match = re.search(r'"image":"([^"]+)"', html)
    author_match = re.search(r'"nickname":"([^"]+)"', html)

    if video_match:
        return {
            'success': True,
            'platform': '小红书',
            'title': title_match.group(1) if title_match else '未知标题',
            'video_url': video_match.group(1).replace('\\u002F', '/'),
            'cover': cover_match.group(1).replace('\\u002F', '/') if cover_match else '',
            'author': author_match.group(1) if author_match else '未知作者'
        }

    raise Exception('无法解析小红书视频')

def parse_weibo(url):
    """解析微博视频"""
    resp = requests.get(url, headers=HEADERS)
    html = resp.text

    video_match = re.search(r'"stream_url":"([^"]+)"', html)
    title_match = re.search(r'"status_title":"([^"]+)"', html)
    author_match = re.search(r'"screen_name":"([^"]+)"', html)

    if video_match:
        return {
            'success': True,
            'platform': '微博',
            'title': title_match.group(1) if title_match else '未知标题',
            'video_url': video_match.group(1).replace('\\/', '/'),
            'cover': '',
            'author': author_match.group(1) if author_match else '未知作者'
        }

    raise Exception('无法解析微博视频')

if __name__ == '__main__':
    print('启动服务器: http://localhost:5000')
    app.run(host='0.0.0.0', port=5000, debug=True)
