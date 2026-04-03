# 1 位老师试用版 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 把当前 TutorFlow 从“可演示 Demo”推进到“可给 1 位辅导老师连续试用”的最小可用版本，保证家长提交、老师查看、AI 批改、反馈发送、异常处理形成闭环。

**Architecture:** 保留现有 Next.js + Prisma + PostgreSQL 架构，不做大改。以“班级固定提交入口 + 老师工作台 + 真模型适配层 + 最小权限闭环”为主线，优先补真实登录、真实模型、真实存储与最小运营能力，暂不扩展多租户、复杂 BI、自动化报表等非试用必需项。

**Tech Stack:** Next.js App Router、TypeScript、Prisma、PostgreSQL、Server Actions、腾讯云 OCR 试题批改 Agent、本地反馈模型 API、对象存储（优先腾讯 COS 或兼容 S3）、企业微信/飞书最小登录能力。

---

## 范围定义

### 本期必须完成（P0）

1. 老师真实身份登录与班级数据隔离。
2. 家长作业图片可稳定上传、可访问、可保留，不依赖本机磁盘。
3. 腾讯试题批改模型真联通，并把结果落到工作台。
4. 本地反馈模型真联通，并支持老师编辑后发送。
5. 老师能看到“待处理 / 已处理 / 失败待重试”的真实列表。
6. 关键失败有提示、有回退路径，1 位老师能连续使用。

### 可以延后（P1）

1. 多老师并发扩容。
2. 自动化群发、批量提醒、复杂报表。
3. 完整运维后台、审计导出、指标大盘。

## 验收口径

- 家长端：固定链接 21 天可复用，补交与追加上传准确入库。
- 老师端：登录后只能看到自己班级；进入工作台可看到真实批改结果。
- AI：腾讯批改与本地反馈至少能跑通 1 个真实样本，且失败时页面不崩。
- 运营：出现失败任务时，老师或管理员知道去哪里看、怎么重试。
- 稳定性：`npm run lint`、`npm run build` 通过；关键流程有 smoke check。

### Task 1: 老师真实登录与权限闭环

**Files:**
- Create: `app/login/page.tsx`
- Create: `app/api/auth/feishu/start/route.ts`
- Create: `app/api/auth/feishu/callback/route.ts`
- Create: `lib/auth/feishu.ts`
- Create: `lib/auth/session.ts`
- Modify: `lib/viewer.ts`
- Modify: `app/(dashboard)/layout.tsx`
- Modify: `app/actions/viewer.ts`

**Step 1: 明确试用版登录策略**

- 老师使用飞书登录。
- 管理员沿用同一登录入口，但通过数据库角色区分。
- 未登录访问后台时统一跳转到 `/login`。

**Step 2: 落最小 session 能力**

- 用 cookie + 服务端 session 存老师身份，不继续使用纯开发态 `DEV_DEFAULT_VIEWER_ID`。
- 保留开发兜底开关，避免本地联调被锁死。

**Step 3: 接飞书 OAuth 最小闭环**

- 在 callback 中完成：身份换取、老师/管理员映射、session 写入。
- 若数据库里没有该老师映射，给出明确的“未开通账号”提示。

**Step 4: 收口权限判断**

- `lib/viewer.ts` 只从真实 session 取 viewer。
- 后台页面、查询层、actions 统一复用同一套 viewer scope。

**Step 5: 验证**

Run: `npm run lint`
Expected: PASS

Run: `npm run build`
Expected: PASS

Manual:
- 老师 A 登录后只能看到自己班级。
- 管理员登录后能看到全局。

### Task 2: 上传存储切到可上线方案

**Files:**
- Create: `lib/storage.ts`
- Create: `lib/clients/cos-client.ts`
- Modify: `lib/uploads.ts`
- Modify: `app/actions/portal.ts`
- Modify: `app/portal/[token]/page.tsx`
- Modify: `next.config.ts`

**Step 1: 抽象上传存储接口**

- 把当前本地磁盘写入封装到 `lib/storage.ts`。
- 统一返回可访问 URL、文件 key、mime、size。

**Step 2: 接对象存储**

- 优先腾讯 COS；若试用期先用兼容 S3 也可。
- 上传后存远程 URL，不再依赖 `public/uploads` 作为生产主方案。

**Step 3: 保留现有业务规则**

- 同一天再次上传只追加 `HomeworkAsset`。
- 历史图片永久保留，不覆盖旧图。

**Step 4: 兼容老数据**

- 查询层同时支持历史本地 URL 与新远程 URL。
- 页面预览不因来源不同而报错。

**Step 5: 验证**

Run: `npm run lint`
Expected: PASS

Run: `npm run build`
Expected: PASS

Manual:
- 上传 2 次同一天作业，老师后台看到素材数递增。

### Task 3: 腾讯试题批改真联通并持久化

**Files:**
- Modify: `lib/clients/tencent-question-mark-client.ts`
- Modify: `lib/adapters/workspace/tencent-grading-adapter.ts`
- Modify: `lib/queries/workspace.ts`
- Modify: `app/actions/workspace.ts`
- Modify: `prisma/schema.prisma`
- Modify: `prisma/seed.ts`
- Create: `scripts/tencent-question-mark-smoke.ts`

**Step 1: 完成腾讯服务侧准备**

- 开通 OCR 试题批改 Agent 服务。
- 记录可用 `SecretId/SecretKey/Region`。
- 确认调用限频和计费口径。

**Step 2: 真实读取结果**

- 提交任务：`SubmitQuestionMarkAgentJob`
- 轮询结果：`DescribeQuestionMarkAgentJob`
- 将 `MarkInfos` 转成工作台题目结构。

**Step 3: 结果持久化**

- 把腾讯返回的题目、答案、正误、解析、知识点写入 `HomeworkAsset.ocrPayload` 或 `metadata`。
- 老师手工复核继续覆盖题目级 verdict，不丢失 AI 原始结果。

**Step 4: 增加“重新跑批改”入口**

- 仅对当前作业记录重跑。
- 若腾讯失败，记录错误状态与错误信息，不让页面报 500。

**Step 5: 验证**

Run: `npm run tencent:question-mark:smoke -- "<真实图片路径>"`
Expected: 返回 `jobId`、`questionCount`、`requestId`

Run: `npm run build`
Expected: PASS

Manual:
- 工作台能看到真实题目与真实分析，而不是 seed 假数据。

### Task 4: 本地反馈模型真联通与发送闭环

**Files:**
- Create: `lib/clients/local-feedback-client.ts`
- Modify: `lib/adapters/workspace/local-feedback-adapter.ts`
- Modify: `app/actions/workspace.ts`
- Modify: `components/workspace/feedback-editor-pane.tsx`
- Modify: `lib/queries/workspace.ts`

**Step 1: 抽象本地反馈请求**

- 输入：学生信息、题目结果、错题摘要、老师语气要求。
- 输出：整体评价、作业分析、家长话术三栏内容。

**Step 2: 反馈生成改为真实接口**

- 优先从真实模型 API 取值。
- 请求失败时回退当前本地模板文案。

**Step 3: 发送动作闭环**

- 发送前允许老师编辑。
- 保存草稿与发送反馈分开。
- 发送后 `feedbackStatus`、`deliveredAt`、任务状态同步更新。

**Step 4: 验证**

Run: `npm run lint`
Expected: PASS

Manual:
- 点击“重新生成”能得到真实模型返回。
- 编辑后保存、发送，刷新后内容仍保留。

### Task 5: 老师待处理列表与异常重试

**Files:**
- Modify: `lib/queries/dashboard.ts`
- Modify: `lib/queries/homework.ts`
- Modify: `app/(dashboard)/dashboard/page.tsx`
- Modify: `app/(dashboard)/homework/page.tsx`
- Modify: `app/actions/homework.ts`
- Modify: `app/actions/workspace.ts`

**Step 1: 定义老师试用期最小列表**

- 待批改
- 待反馈
- 已完成
- 失败待重试

**Step 2: 把错误状态显性化**

- 腾讯批改失败
- 反馈模型失败
- 上传失败
- 发送失败

**Step 3: 增加人工重试入口**

- 至少支持“重跑腾讯批改”“重生成反馈”。
- 失败原因展示在列表和工作台。

**Step 4: 验证**

Manual:
- 制造一次失败，老师能看到失败状态，并能重新触发。

### Task 6: 家长反馈发送链路打通

**Files:**
- Create: `lib/messaging.ts`
- Create: `lib/clients/wecom-client.ts`
- Modify: `app/actions/workspace.ts`
- Modify: `app/actions/homework.ts`
- Modify: `prisma/schema.prisma`

**Step 1: 明确试用版发送路径**

- 最小版本建议：先发企业微信 / 飞书单聊。
- 若自动消息未准备好，至少保留“复制家长话术 + 标记已发送”的人工兜底模式。

**Step 2: 记录发送结果**

- 发送成功：落库 message id / time。
- 发送失败：记录 error code / error message。

**Step 3: 验证**

Manual:
- 发送后老师能看到“已反馈”。
- 家长至少能收到一条真实消息，或老师能稳定复制发送。

### Task 7: 上线前 runbook 与试用验收

**Files:**
- Create: `docs/ops/teacher-pilot-runbook.md`
- Create: `scripts/pilot-smoke.ts`
- Modify: `package.json`

**Step 1: 整理 runbook**

- 环境变量清单
- 腾讯云 / 本地模型 / 存储 / 登录配置
- 常见报错与处理办法

**Step 2: 做试用 smoke 脚本**

- 登录检查
- 家长上传检查
- 腾讯批改检查
- 反馈生成检查
- 页面健康检查

**Step 3: 试用验收**

- 选择 1 个班级、1 位老师、3-5 位家长做灰度。
- 连续跑 3 天，观察失败点。

**Step 4: 验证**

Run: `npm run build`
Expected: PASS

Run: `npm run lint`
Expected: PASS

Run: `npm run pilot:smoke`
Expected: 所有关键项 PASS

## 推荐执行顺序

1. Task 3：腾讯批改真联通
2. Task 4：本地反馈真联通
3. Task 2：上传存储上线化
4. Task 5：老师待处理与重试
5. Task 1：老师真实登录
6. Task 6：消息发送闭环
7. Task 7：灰度试用 runbook

## 我建议的现实节奏

- 第 1 周：Task 3 + Task 4
- 第 2 周：Task 2 + Task 5
- 第 3 周：Task 1 + Task 6
- 第 4 周：Task 7 + 1 位老师灰度

## 当前立即开工建议

先从 **Task 3：腾讯试题批改真联通并持久化** 开始，因为：

1. 这是老板最容易看到“从 Demo 变真货”的部分。
2. 我们现在已经接好了正式 client，只差服务开通与结果写回。
3. 这项完成后，工作台右侧题目与统计卡会立即更真实，后续反馈模型也能吃到真数据。
