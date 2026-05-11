# 部署说明

这个项目线上部署包含两部分：

- React + Vite 前端，由 Nginx 容器托管。
- FastAPI 修图后端，由 Python 容器提供 `/api/preview` 和 `/api/process`。

线上访问结构：

```text
http://服务器公网IP/
  /        前端页面
  /api/*   FastAPI 后端
```

## 1. 阿里云安全组

先在 ECS 安全组放行：

```text
22   SSH
80   HTTP
443  HTTPS，后续绑定域名和证书时使用
```

不要把 `8000` 暴露到公网，后端只给 Nginx 容器内部访问。

## 2. 安装 Docker

Ubuntu 22.04 推荐执行：

```bash
apt update
apt install -y git curl
curl -fsSL https://get.docker.com | bash
docker version
docker compose version
```

## 3. 拉取项目

```bash
git clone https://github.com/chenxiubin/11076-prompt-demo.git
cd 11076-prompt-demo
```

如果仓库是私有仓库，需要使用 GitHub Personal Access Token 拉取。

## 4. 配置后端密钥

```bash
cp backend/.env.example backend/.env
nano backend/.env
```

至少填写这些：

```env
ALIYUN_ACCESS_KEY_ID=你的阿里云AccessKeyId
ALIYUN_ACCESS_KEY_SECRET=你的阿里云AccessKeySecret
ALIYUN_IMAGESEG_ENDPOINT=imageseg.cn-shanghai.aliyuncs.com
ALIYUN_RETURN_FORM=

QWEN_API_KEY=你的百炼或DashScope API Key
QWEN_IMAGE_MODEL=qwen-image-2.0-pro
QWEN_API_URL=https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation

GEMINI_API_KEY=你的Gemini API Key
GEMINI_IMAGE_MODEL=gemini-3.1-flash-image-preview
GEMINI_API_BASE=https://generativelanguage.googleapis.com/v1beta
```

模式对应关系：

```text
标准模式 standard -> 阿里云图像分割
质感模式 quality  -> Qwen / DashScope
高清模式 hd       -> Gemini
```

如果某个 Key 没填，对应模式会报错。

## 5. 启动

```bash
docker compose up -d --build
```

检查服务：

```bash
docker compose ps
curl http://127.0.0.1/api/health
```

浏览器访问：

```text
http://服务器公网IP/
```

## 6. 更新项目

```bash
cd 11076-prompt-demo
git pull
docker compose up -d --build
```

## 7. 常用排查

查看后端日志：

```bash
docker compose logs -f backend
```

查看前端/Nginx 日志：

```bash
docker compose logs -f web
```

重启：

```bash
docker compose restart
```

停止：

```bash
docker compose down
```

## 8. 后续建议

正式给公司同事长期访问时，建议再加：

- 域名和 HTTPS 证书。
- 基础访问密码或登录系统。
- Nginx 上传大小限制按业务调整。
- 图片处理接口限流，避免多人同时上传导致服务器内存紧张。
