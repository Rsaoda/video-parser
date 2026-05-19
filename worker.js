// Cloudflare Worker 短视频解析服务
// 部署到 Cloudflare Workers 即可使用

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }

  // Handle OPTIONS request
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const url = new URL(request.url)

  // API endpoint
  if (url.pathname === '/api/parse') {
    const videoUrl = url.searchParams.get('url')
    if (!videoUrl) {
      return new Response(JSON.stringify({ error: '缺少url参数' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    try {
      const result = await parseVideo(videoUrl)
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
  }

  // Serve frontend
  return new Response(HTML_CONTENT, {
    headers: { 'Content-Type': 'text/html;charset=UTF-8' }
  })
}

async function parseVideo(url) {
  // 抖音解析
  if (url.includes('douyin.com') || url.includes('iesdouyin.com')) {
    return await parseDouyin(url)
  }
  // 快手解析
  if (url.includes('kuaishou.com') || url.includes('gifshow.com')) {
    return await parseKuaishou(url)
  }
  // B站解析
  if (url.includes('bilibili.com') || url.includes('b23.tv')) {
    return await parseBilibili(url)
  }
  // 小红书解析
  if (url.includes('xiaohongshu.com') || url.includes('xhslink.com') || url.includes('xhs.cn')) {
    return await parseXiaohongshu(url)
  }
  // 微博解析
  if (url.includes('weibo.com') || url.includes('weibo.cn')) {
    return await parseWeibo(url)
  }

  throw new Error('暂不支持该平台')
}

async function parseDouyin(url) {
  // 获取重定向后的真实链接
  const response = await fetch(url, {
    redirect: 'follow',
    headers: {
      'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1'
    }
  })

  const html = await response.text()
  const finalUrl = response.url

  // 提取视频ID
  let videoId = ''
  const idMatch = finalUrl.match(/video\/(\d+)/) || html.match(/video\/(\d+)/)
  if (idMatch) {
    videoId = idMatch[1]
  }

  if (!videoId) {
    // 尝试从HTML中提取
    const awemeMatch = html.match(/"awemeId":"(\d+)"/) || html.match(/aweme_id.*?(\d{15,})/)
    if (awemeMatch) {
      videoId = awemeMatch[1]
    }
  }

  if (!videoId) {
    throw new Error('无法解析抖音视频ID')
  }

  // 使用API获取视频信息
  const apiUrl = `https://www.iesdouyin.com/web/api/v2/aweme/iteminfo/?item_ids=${videoId}`
  const apiResponse = await fetch(apiUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1'
    }
  })

  const data = await apiResponse.json()

  if (data.item_list && data.item_list.length > 0) {
    const item = data.item_list[0]
    const videoUrl = item.video.play_addr.url_list[0].replace('playwm', 'play')
    return {
      success: true,
      platform: '抖音',
      title: item.desc,
      video_url: videoUrl,
      cover: item.video.cover.url_list[0],
      author: item.author.nickname
    }
  }

  throw new Error('获取视频信息失败')
}

async function parseKuaishou(url) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1'
    }
  })

  const html = await response.text()

  const videoMatch = html.match(/"photoUrl":"([^"]+)"/)
  const titleMatch = html.match(/"caption":"([^"]+)"/)
  const coverMatch = html.match(/"coverUrl":"([^"]+)"/)
  const authorMatch = html.match(/"authorName":"([^"]+)"/)

  if (videoMatch) {
    return {
      success: true,
      platform: '快手',
      title: titleMatch ? decodeURIComponent(titleMatch[1]) : '未知标题',
      video_url: videoMatch[1].replace(/\\u002F/g, '/'),
      cover: coverMatch ? coverMatch[1].replace(/\\u002F/g, '/') : '',
      author: authorMatch ? authorMatch[1] : '未知作者'
    }
  }

  throw new Error('无法解析快手视频')
}

async function parseBilibili(url) {
  let bvid = ''

  // 处理短链接
  if (url.includes('b23.tv')) {
    const response = await fetch(url, { redirect: 'follow' })
    const finalUrl = response.url
    const bvMatch = finalUrl.match(/BV[a-zA-Z0-9]+/)
    if (bvMatch) bvid = bvMatch[0]
  } else {
    const bvMatch = url.match(/BV[a-zA-Z0-9]+/)
    if (bvMatch) bvid = bvMatch[0]
  }

  if (!bvid) {
    throw new Error('无法识别B站视频BV号')
  }

  const apiUrl = `https://api.bilibili.com/x/web-interface/view?bvid=${bvid}`
  const response = await fetch(apiUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Referer': 'https://www.bilibili.com'
    }
  })

  const data = await response.json()

  if (data.data) {
    return {
      success: true,
      platform: 'B站',
      title: data.data.title,
      video_url: `https://www.bilibili.com/video/${bvid}`,
      cover: data.data.pic,
      author: data.data.owner.name
    }
  }

  throw new Error('获取B站视频信息失败')
}

async function parseXiaohongshu(url) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1'
    }
  })

  const html = await response.text()

  const videoMatch = html.match(/"url":"([^"]+\.mp4[^"]*)"/)
  const titleMatch = html.match(/"desc":"([^"]+)"/)
  const coverMatch = html.match(/"image":"([^"]+)"/)
  const authorMatch = html.match(/"nickname":"([^"]+)"/)

  if (videoMatch) {
    return {
      success: true,
      platform: '小红书',
      title: titleMatch ? titleMatch[1] : '未知标题',
      video_url: videoMatch[1].replace(/\\u002F/g, '/'),
      cover: coverMatch ? coverMatch[1].replace(/\\u002F/g, '/') : '',
      author: authorMatch ? authorMatch[1] : '未知作者'
    }
  }

  throw new Error('无法解析小红书视频')
}

async function parseWeibo(url) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1'
    }
  })

  const html = await response.text()

  const videoMatch = html.match(/"stream_url":"([^"]+)"/)
  const titleMatch = html.match(/"status_title":"([^"]+)"/)
  const authorMatch = html.match(/"screen_name":"([^"]+)"/)

  if (videoMatch) {
    return {
      success: true,
      platform: '微博',
      title: titleMatch ? titleMatch[1] : '未知标题',
      video_url: videoMatch[1].replace(/\\\//g, '/'),
      cover: '',
      author: authorMatch ? authorMatch[1] : '未知作者'
    }
  }

  throw new Error('无法解析微博视频')
}

// HTML内容
const HTML_CONTENT = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>短视频解析去水印</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px;
        }
        .container {
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            padding: 40px;
            max-width: 600px;
            width: 100%;
        }
        h1 { text-align: center; color: #333; margin-bottom: 10px; font-size: 28px; }
        .subtitle { text-align: center; color: #666; margin-bottom: 30px; font-size: 14px; }
        .platform-tags { display: flex; justify-content: center; gap: 10px; margin-bottom: 30px; flex-wrap: wrap; }
        .tag { background: #f0f0f0; padding: 6px 16px; border-radius: 20px; font-size: 13px; color: #555; }
        .input-group { display: flex; gap: 10px; margin-bottom: 20px; }
        input[type="text"] {
            flex: 1; padding: 15px 20px; border: 2px solid #e0e0e0;
            border-radius: 12px; font-size: 16px; outline: none;
        }
        input[type="text"]:focus { border-color: #667eea; }
        button {
            padding: 15px 30px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white; border: none; border-radius: 12px;
            font-size: 16px; cursor: pointer; white-space: nowrap;
        }
        button:hover { transform: translateY(-2px); box-shadow: 0 5px 20px rgba(102,126,234,0.4); }
        button:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
        .result {
            display: none; margin-top: 30px; padding: 20px;
            background: #f8f9fa; border-radius: 12px;
        }
        .result.show { display: block; }
        .result-header { display: flex; align-items: center; gap: 15px; margin-bottom: 20px; }
        .result-cover { width: 100px; height: 100px; border-radius: 8px; object-fit: cover; }
        .result-info h3 { color: #333; margin-bottom: 5px; font-size: 16px; }
        .result-info p { color: #666; font-size: 14px; }
        .result-actions { display: flex; gap: 10px; flex-wrap: wrap; }
        .btn-download {
            flex: 1; min-width: 120px; padding: 12px 20px;
            background: #10b981; color: white; border: none;
            border-radius: 10px; font-size: 14px; cursor: pointer;
            text-align: center; text-decoration: none;
        }
        .btn-download:hover { background: #059669; }
        .btn-copy {
            padding: 12px 20px; background: #6366f1;
            color: white; border: none; border-radius: 10px;
            font-size: 14px; cursor: pointer;
        }
        .btn-copy:hover { background: #4f46e5; }
        .error {
            display: none; margin-top: 20px; padding: 15px;
            background: #fee2e2; color: #dc2626; border-radius: 10px; font-size: 14px;
        }
        .error.show { display: block; }
        .loading { display: none; text-align: center; margin-top: 20px; color: #667eea; }
        .loading.show { display: block; }
        .spinner {
            display: inline-block; width: 20px; height: 20px;
            border: 3px solid #f3f3f3; border-top: 3px solid #667eea;
            border-radius: 50%; animation: spin 1s linear infinite;
            margin-right: 10px; vertical-align: middle;
        }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .video-preview { margin-top: 15px; border-radius: 8px; overflow: hidden; display: none; }
        .video-preview.show { display: block; }
        .video-preview video { width: 100%; max-height: 300px; background: #000; }
        .tips { margin-top: 20px; padding: 15px; background: #fff3cd; border-radius: 10px; font-size: 13px; color: #856404; }
        .tips h4 { margin-bottom: 8px; }
        .tips ul { padding-left: 20px; }
        .tips li { margin-bottom: 5px; }
        .footer { text-align: center; margin-top: 30px; color: #999; font-size: 12px; }
        @media (max-width: 480px) {
            .container { padding: 25px; }
            h1 { font-size: 22px; }
            .input-group { flex-direction: column; }
            button { width: 100%; }
            .result-actions { flex-direction: column; }
            .btn-download, .btn-copy { width: 100%; }
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>短视频解析去水印</h1>
        <p class="subtitle">免费在线解析，支持多个主流平台</p>
        <div class="platform-tags">
            <span class="tag">抖音</span>
            <span class="tag">快手</span>
            <span class="tag">B站</span>
            <span class="tag">小红书</span>
            <span class="tag">微博</span>
        </div>
        <div class="input-group">
            <input type="text" id="urlInput" placeholder="请粘贴视频分享链接...">
            <button id="parseBtn" onclick="parseVideo()">解析</button>
        </div>
        <div class="loading" id="loading"><span class="spinner"></span>正在解析中...</div>
        <div class="error" id="error"></div>
        <div class="result" id="result">
            <div class="result-header">
                <img class="result-cover" id="cover" src="" alt="封面" style="display:none">
                <div class="result-info">
                    <h3 id="title"></h3>
                    <p id="author"></p>
                    <p id="platform"></p>
                </div>
            </div>
            <div class="video-preview" id="videoPreview"><video id="videoPlayer" controls></video></div>
            <div class="result-actions">
                <a class="btn-download" id="downloadBtn" href="#" target="_blank">下载无水印视频</a>
                <button class="btn-copy" onclick="copyLink()">复制链接</button>
            </div>
        </div>
        <div class="tips">
            <h4>使用说明：</h4>
            <ul>
                <li>复制短视频分享链接</li>
                <li>粘贴到上方输入框</li>
                <li>点击解析按钮</li>
                <li>获取无水印视频并下载</li>
            </ul>
        </div>
        <div class="footer">
            <p>仅供学习交流使用，请勿用于商业用途</p>
        </div>
    </div>
    <script>
        let currentVideoUrl = '';
        const urlInput = document.getElementById('urlInput');

        urlInput.addEventListener('paste', () => {
            setTimeout(() => { if (urlInput.value.trim()) parseVideo(); }, 100);
        });
        urlInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') parseVideo(); });

        async function parseVideo() {
            const url = urlInput.value.trim();
            if (!url) { showError('请输入视频链接'); return; }

            document.getElementById('parseBtn').disabled = true;
            document.getElementById('parseBtn').textContent = '解析中...';
            document.getElementById('loading').classList.add('show');
            document.getElementById('error').classList.remove('show');
            document.getElementById('result').classList.remove('show');

            try {
                const response = await fetch('/api/parse?url=' + encodeURIComponent(url));
                const data = await response.json();
                if (data.error) throw new Error(data.error);
                showResult(data);
            } catch (err) {
                showError(err.message || '解析失败');
            } finally {
                document.getElementById('parseBtn').disabled = false;
                document.getElementById('parseBtn').textContent = '解析';
                document.getElementById('loading').classList.remove('show');
            }
        }

        function showResult(data) {
            currentVideoUrl = data.video_url || '';
            document.getElementById('title').textContent = data.title || '未知标题';
            document.getElementById('author').textContent = '作者: ' + (data.author || '未知');
            document.getElementById('platform').textContent = '平台: ' + (data.platform || '未知');

            const cover = document.getElementById('cover');
            if (data.cover) {
                cover.src = data.cover;
                cover.style.display = 'block';
                cover.onerror = function() { this.style.display = 'none'; };
            }

            if (currentVideoUrl) {
                document.getElementById('videoPlayer').src = currentVideoUrl;
                document.getElementById('videoPreview').classList.add('show');
                document.getElementById('downloadBtn').href = currentVideoUrl;
            }

            document.getElementById('result').classList.add('show');
        }

        function showError(msg) {
            document.getElementById('error').textContent = msg;
            document.getElementById('error').classList.add('show');
        }

        function copyLink() {
            if (currentVideoUrl) {
                navigator.clipboard.writeText(currentVideoUrl).then(() => {
                    const btn = document.querySelector('.btn-copy');
                    btn.textContent = '已复制!';
                    setTimeout(() => btn.textContent = '复制链接', 2000);
                });
            }
        }
    </script>
</body>
</html>`
