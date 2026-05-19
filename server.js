const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// 解析抖音链接
async function parseDouyin(url) {
  try {
    // 处理分享链接，获取重定向后的真实链接
    const response = await axios.get(url, {
      maxRedirects: 0,
      validateStatus: status => status >= 200 && status < 400
    });

    let videoId = '';
    const location = response.headers.location || url;

    // 从URL中提取视频ID
    const match = location.match(/video\/(\d+)/);
    if (match) {
      videoId = match[1];
    }

    if (!videoId) {
      throw new Error('无法解析视频ID');
    }

    // 调用抖音API获取视频信息
    const apiUrl = `https://www.iesdouyin.com/web/api/v2/aweme/iteminfo/?item_ids=${videoId}`;
    const apiResponse = await axios.get(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1'
      }
    });

    if (apiResponse.data && apiResponse.data.item_list && apiResponse.data.item_list.length > 0) {
      const item = apiResponse.data.item_list[0];
      const videoUrl = item.video.play_addr.url_list[0].replace('playwm', 'play');
      return {
        platform: '抖音',
        title: item.desc,
        video_url: videoUrl,
        cover: item.video.cover.url_list[0],
        author: item.author.nickname
      };
    }

    throw new Error('获取视频信息失败');
  } catch (error) {
    throw new Error(`抖音解析失败: ${error.message}`);
  }
}

// 解析快手链接
async function parseKuaishou(url) {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1'
      }
    });

    const html = response.data;

    // 从HTML中提取视频信息
    const videoMatch = html.match(/"photoUrl":"([^"]+)"/);
    const titleMatch = html.match(/"caption":"([^"]+)"/);
    const coverMatch = html.match(/"coverUrl":"([^"]+)"/);
    const authorMatch = html.match(/"authorName":"([^"]+)"/);

    if (videoMatch) {
      return {
        platform: '快手',
        title: titleMatch ? titleMatch[1] : '未知标题',
        video_url: videoMatch[1].replace(/\\u002F/g, '/'),
        cover: coverMatch ? coverMatch[1].replace(/\\u002F/g, '/') : '',
        author: authorMatch ? authorMatch[1] : '未知作者'
      };
    }

    throw new Error('无法解析视频信息');
  } catch (error) {
    throw new Error(`快手解析失败: ${error.message}`);
  }
}

// 解析B站链接
async function parseBilibili(url) {
  try {
    // 提取BV号
    const bvMatch = url.match(/BV[a-zA-Z0-9]+/);
    if (!bvMatch) {
      throw new Error('无法识别B站链接');
    }

    const bvid = bvMatch[0];
    const apiUrl = `https://api.bilibili.com/x/web-interface/view?bvid=${bvid}`;

    const response = await axios.get(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Referer': 'https://www.bilibili.com'
      }
    });

    if (response.data && response.data.data) {
      const data = response.data.data;
      return {
        platform: 'B站',
        title: data.title,
        video_url: `https://www.bilibili.com/video/${bvid}`,
        cover: data.pic,
        author: data.owner.name
      };
    }

    throw new Error('获取视频信息失败');
  } catch (error) {
    throw new Error(`B站解析失败: ${error.message}`);
  }
}

// 解析小红书链接
async function parseXiaohongshu(url) {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1'
      }
    });

    const html = response.data;

    // 从HTML中提取视频信息
    const videoMatch = html.match(/"url":"([^"]+\.mp4[^"]*)"/);
    const titleMatch = html.match(/"desc":"([^"]+)"/);
    const coverMatch = html.match(/"image":"([^"]+)"/);
    const authorMatch = html.match(/"nickname":"([^"]+)"/);

    if (videoMatch) {
      return {
        platform: '小红书',
        title: titleMatch ? titleMatch[1] : '未知标题',
        video_url: videoMatch[1].replace(/\\u002F/g, '/'),
        cover: coverMatch ? coverMatch[1].replace(/\\u002F/g, '/') : '',
        author: authorMatch ? authorMatch[1] : '未知作者'
      };
    }

    throw new Error('无法解析视频信息');
  } catch (error) {
    throw new Error(`小红书解析失败: ${error.message}`);
  }
}

// 主解析接口
app.post('/api/parse', async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: '请输入视频链接' });
  }

  try {
    let result = null;

    // 根据URL判断平台
    if (url.includes('douyin.com') || url.includes('iesdouyin.com')) {
      result = await parseDouyin(url);
    } else if (url.includes('kuaishou.com') || url.includes('gifshow.com')) {
      result = await parseKuaishou(url);
    } else if (url.includes('bilibili.com') || url.includes('b23.tv')) {
      result = await parseBilibili(url);
    } else if (url.includes('xiaohongshu.com') || url.includes('xhslink.com')) {
      result = await parseXiaohongshu(url);
    } else {
      return res.status(400).json({ error: '暂不支持该平台，请输入抖音/快手/B站/小红书链接' });
    }

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 代理视频下载（绕过防盗链）
app.get('/api/proxy', async (req, res) => {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: '缺少视频地址' });
  }

  try {
    const response = await axios.get(url, {
      responseType: 'stream',
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1',
        'Referer': ''
      }
    });

    res.set({
      'Content-Type': response.headers['content-type'] || 'video/mp4',
      'Content-Length': response.headers['content-length'],
      'Content-Disposition': 'attachment; filename="video.mp4"'
    });

    response.data.pipe(res);
  } catch (error) {
    res.status(500).json({ error: '视频下载失败' });
  }
});

app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});
