# TutorFlow 内网预览部署

适用场景：

- Ubuntu 服务器
- 直接用内网 IP + 端口访问
- PostgreSQL 就部署在同一台服务器
- 应用进程使用 PM2 托管

## 1. 服务器准备

安装 Node.js 20、PostgreSQL、PM2：

```bash
sudo apt update
sudo apt install -y curl git postgresql postgresql-contrib
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2
```

确认版本：

```bash
node -v
npm -v
psql --version
pm2 -v
```

## 2. 初始化数据库

进入 PostgreSQL：

```bash
sudo -u postgres psql
```

执行：

```sql
CREATE USER tutorflow WITH PASSWORD '请改成强密码';
CREATE DATABASE tutorflow OWNER tutorflow;
GRANT ALL PRIVILEGES ON DATABASE tutorflow TO tutorflow;
\q
```

## 3. 上传项目

把项目传到服务器，例如：

```bash
scp -r /本地路径/tutorFlow user@服务器IP:/srv/tutorflow
```

登录服务器后进入目录：

```bash
cd /srv/tutorflow
```

## 4. 配置环境变量

建议在服务器放一个 `.env.local`：

```bash
cp .env .env.local
```

至少要确认这些变量：

```bash
DATABASE_URL="postgresql://tutorflow:你的密码@127.0.0.1:5432/tutorflow?schema=public"
TENCENT_OCR_ENABLE_LIVE="true"
TENCENT_OCR_SECRET_ID="你的腾讯 SecretId"
TENCENT_OCR_SECRET_KEY="你的腾讯 SecretKey"
TENCENT_OCR_REGION="ap-guangzhou"
LOCAL_FEEDBACK_API_URL="你的本地网关地址"
LOCAL_FEEDBACK_API_TOKEN="你的本地网关 Token"
LOCAL_FEEDBACK_API_MODE="openai"
LOCAL_FEEDBACK_MODEL="gpt-4o"
LOCAL_FEEDBACK_API_TIMEOUT_MS="20000"
```

注意：

- 不要把真实密钥写进仓库。
- 如果内网服务器访问不到腾讯云或本地反馈网关，对应功能会回退到演示数据。

## 5. 安装并初始化项目

```bash
npm install
npm run db:generate
npm run db:migrate
npm run build
```

`standalone` 构建后，还需要把静态资源复制进去：

```bash
mkdir -p .next/standalone/.next
rm -rf .next/standalone/.next/static
cp -R .next/static .next/standalone/.next/static
rm -rf .next/standalone/public
cp -R public .next/standalone/public
```

如果需要演示数据：

```bash
npm run db:seed
```

## 6. 准备上传目录

家长提交作业图片会写到 `public/uploads/homework`，先创建目录：

```bash
mkdir -p public/uploads/homework
```

如果你的运行用户不是当前用户，确认它对 `public/uploads` 有写权限。

## 7. 启动服务

使用 PM2：

```bash
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

查看状态：

```bash
pm2 status
pm2 logs tutorflow-preview
```

默认访问地址：

```text
http://服务器内网IP:3000
```

## 8. 常用更新命令

后续更新代码：

```bash
cd /srv/tutorflow
git pull
npm install
npm run db:generate
npm run db:migrate
npm run build
pm2 restart tutorflow-preview
```

## 9. 快速排查

应用起不来：

```bash
pm2 logs tutorflow-preview
```

数据库连不上：

- 检查 `DATABASE_URL`
- 检查 PostgreSQL 是否启动：`sudo systemctl status postgresql`

图片上传失败：

- 检查 `public/uploads/homework` 是否存在
- 检查目录写权限

外部模型不可用：

- 检查服务器是否能访问腾讯云
- 检查是否能访问 `LOCAL_FEEDBACK_API_URL`
- 若不可访问，页面会显示回退状态，但主流程仍可演示
