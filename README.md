# 短视频解析去水印工具

免费在线短视频解析工具，支持多个主流平台的无水印视频下载。

## 在线访问

**https://rsaoda.github.io/video-parser/**

> 注意：在线版本依赖第三方API，可能不稳定。推荐使用本地运行版本。

## 支持平台

| 平台 | 状态 |
|------|------|
| 抖音 | ✅ 支持 |
| 快手 | ✅ 支持 |
| B站 | ✅ 支持 |
| 小红书 | ✅ 支持 |
| 微博 | ✅ 支持 |

## 功能特性

- **多平台支持** - 覆盖国内主流短视频平台
- **无水印下载** - 获取原始无水印视频
- **在线预览** - 解析后可直接在线播放
- **一键复制** - 快速复制视频链接
- **自动解析** - 粘贴链接自动识别并解析
- **响应式设计** - 支持手机和电脑端访问

## 使用方法

### 方式一：在线使用（简单但可能不稳定）

1. 打开 https://rsaoda.github.io/video-parser/
2. 粘贴视频链接
3. 点击解析

### 方式二：本地运行（推荐，更稳定）

```bash
# 克隆项目
git clone https://github.com/Rsaoda/video-parser.git
cd video-parser

# 安装Python依赖
pip install flask flask-cors requests

# 启动服务器
python app.py
```

访问 http://localhost:5000

### 方式三：使用Node.js版本

```bash
# 安装依赖
npm install

# 启动服务器
npm start
```

访问 http://localhost:3000

## 项目结构

```
video-parser/
├── index.html          # 前端页面
├── app.py              # Python后端（推荐）
├── server.js           # Node.js后端
├── worker.js           # Cloudflare Worker版本
├── package.json        # Node.js依赖配置
└── README.md           # 说明文档
```

## 部署到Cloudflare Workers（免费且稳定）

1. 注册 [Cloudflare](https://cloudflare.com) 账号
2. 进入 Workers 控制台
3. 创建新的Worker
4. 将 `worker.js` 内容粘贴进去
5. 部署后获得类似 `https://video-parser.your-name.workers.dev` 的地址
6. 修改 `index.html` 中的API地址为你的Worker地址

## 技术栈

- **前端**: HTML5 + CSS3 + Vanilla JavaScript
- **后端**: Python Flask / Node.js Express / Cloudflare Workers
- **部署**: GitHub Pages / 本地运行 / Cloudflare

## 注意事项

- 本工具仅供学习交流使用
- 请勿用于商业用途
- 请尊重原作者版权
- 解析接口可能因平台政策变化而失效

## 常见问题

**Q: 为什么在线版本解析失败？**
A: 在线版本依赖第三方API，这些API可能不稳定或已失效。建议使用本地Python版本或部署Cloudflare Worker。

**Q: 支持哪些链接格式？**
A: 支持各平台的分享链接，包括短链接和完整链接。

**Q: 视频下载后在哪里？**
A: 视频会下载到浏览器默认的下载目录。

## 更新日志

### v1.1.0 (2026-05-19)
- 添加Python后端版本
- 添加Cloudflare Worker版本
- 优化前端多API切换逻辑

### v1.0.0 (2026-05-19)
- 初始版本发布
- 支持抖音、快手、B站、小红书、微博解析
- 响应式UI设计
- 部署到GitHub Pages

## 许可证

MIT License

## 免责声明

本工具仅用于技术学习和研究，使用者应遵守相关法律法规，不得用于任何非法用途。因使用本工具产生的一切后果由使用者自行承担。
