# 旅游日记平台
## 项目简介

本项目为携程游记发布与管理系统，包含前端（移动端/PC端）和后端（Express框架）两部分。移动端实现用户可注册、登录、发布游记（支持多图和视频上传）、浏览、搜索、修改和删除游记。PC端实现游记数据统计、游记展示、游记审核、游记删除功能。

## 主要功能

- 用户注册、登录、个人信息管理
- 游记发布（支持多图和视频上传，支持 MOV/MP4/AVI 等格式）
- 游记浏览、搜索、详情查看
- 游记修改、删除
- 管理员（系统设计两个角色）登入
- 游记审核、删除
- 文件上传接口（图片/视频分离上传）
- Token 鉴权与权限控制

## 界面展示

### 移动端界面

移动端界面使用微信小程序开发，主要包含以下页面：

- 登录/注册页面
- 游记发布页面（支持多图和视频上传）
- 游记列表页面
- 游记详情页面
- 个人中心页面

### 后台管理系统界面

后台管理系统使用 PC 端开发，主要包含以下页面：

- 管理员登录页面
- 游记数据统计页面
- 游记详情和审核页面

## 目录结构

```
.
├── mobile/                 # 移动端前端代码
│   ├── api/                # 前端接口请求封装
│   └── pages/              # 页面代码
├── pc/                     # PC端相关代码
│   ├── server/             # 后端服务
│   │   ├── config.js       # 数据库与后端配置
│   │   ├── middleware/     # 中间件配置
│   │   └── router.js       # 所有后端接口路由
│   └── uploads/            # 上传的图片和视频文件
│   ├── src/                # 后端代码
│   │   ├── pages/          # pcd页面
│   │   └── router.js       # 所有后端接口路由
├── README.md               # 项目说明文件
└── package.json            # 后端依赖
```

## 环境依赖

- Node.js + Express
- React
- MySQL数据库
- 微信小程序开发工具

后端依赖（部分）：
- express
- mysql2
- multer
- bcrypt
- jsonwebtoken

## 安装与启动

1. **克隆项目**
   ```bash
   git clone https://github.com/guohong13/travel-notes.git
   ```

2. **安装后端依赖**
   ```bash
   cd pc
   npm install
   ```

3. **配置数据库**
   - 修改 `pc/server/config.js`，配置数据库连接。

4. **启动后端服务**
   ```bash
   npm start
   ```

5. **小程序环境依赖**
   - 使用微信开发者工具导入 `mobile/` 目录。

## 主要接口说明

### 用户相关

- `POST /api/users/register` 用户注册
- `POST /api/users/login` 用户登录
- `GET /api/users/profile` 获取用户信息

### 游记相关

- `POST /api/upload` 文件上传（支持多图和视频，需登录）
- `POST /api/notes` 发布游记（需登录，需传图片/视频路径）
- `PUT /api/notes/modify/:id` 修改游记（需登录）
- `DELETE /api/notes/delete/:id` 删除游记（需登录）
- `GET /api/notes` 获取游记列表
- `GET /api/notes/user/:userId` 获取用户自己的游记
- `GET /api/notes/search` 游记搜索

### 管理员相关

- `POST /api/admin/login` 管理员登录
- `GET /api/notes/admin` 获取待审核游记
- `PUT /api/notes/approve/:id` 审核通过
- `PUT /api/notes/reject/:id` 审核拒绝
- `DELETE /api/notes/delete/:id` 管理员删除游记

## 文件上传说明

- 支持图片格式：jpg、jpeg、png、gif
- 支持视频格式：mp4、mov、avi

## 注意事项

- 上传文件最大 50MB，超出会被拒绝
- 需保证 `uploads/` 目录有写入权限

## 贡献与反馈

如有建议或 bug，欢迎提 issue。
