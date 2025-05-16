# 旅游日记平台

## 项目简介

本项目为携程前端训练营结营大作业，完成了一个旅游日记发布与管理系统，包含前端（移动端/PC 端）和后端（Express 框架）两部分。

## 主要功能

- 用户注册、登录
- 游记发布（支持多图和视频上传）
- 游记浏览、搜索、详情查看
- 用户游记修改、删除
- 管理员（系统设计两个角色）登入
- 游记数据可视化
- 管理员游记审核、删除
- Token 鉴权与权限控制

## 界面展示

### 移动端界面

移动端界面使用微信小程序开发，主要包含以下页面：

- 登录/注册页面
- 游记发布页面
- 游记列表页面
- 游记详情页面
- 我的游记页面

![小程序注册](https://github.com/guohong13/travel-notes/blob/main/assets/%E5%B0%8F%E7%A8%8B%E5%BA%8F%E6%B3%A8%E5%86%8C.png)![小程序登入](https://github.com/guohong13/travel-notes/blob/main/assets/%E5%B0%8F%E7%A8%8B%E5%BA%8F%E7%99%BB%E5%85%A5.png)![游记列表](https://github.com/guohong13/travel-notes/blob/main/assets/%E6%B8%B8%E8%AE%B0%E5%88%97%E8%A1%A8.png)![游记发布](https://github.com/guohong13/travel-notes/blob/main/assets/%E6%B8%B8%E8%AE%B0%E5%8F%91%E5%B8%83.png)![游记搜索](https://github.com/guohong13/travel-notes/blob/main/assets/%E6%B8%B8%E8%AE%B0%E6%90%9C%E7%B4%A2.png)![我的游记](https://github.com/guohong13/travel-notes/blob/main/assets/%E6%88%91%E7%9A%84%E6%B8%B8%E8%AE%B0.png)![游记详情](https://github.com/guohong13/travel-notes/blob/main/assets/%E6%B8%B8%E8%AE%B0%E8%AF%A6%E6%83%85.png)

### 后台管理系统界面

后台管理系统使用 React 框架开发，主要包含以下页面：

- 管理员登录页面
- 管理页首页
- 游记列表页面
- 游记审核页面

## 目录结构

```
.travel-notes
├── assets/                  # 其他内容
│   ├── createDatabase.sql   # 创建数据库
│   └── adminRegister.html   # 管理员注册
├── mobile/                  # 移动端前端代码
│   ├── api/                 # 前端接口请求封装
│   ├── behaviors/           # 小程序行为封装
│   ├── components/          # 封装的组件
│   ├── pages/               # 页面代码
│   ├── utils/               # 封装的工具
│   ├── config.js            # 移动端配置文件
│   └── project.config.json  # 小程序项目配置文件
├── pc/                      # PC 端与后端相关代码
│   ├── server/              # 后端服务
│   │   ├── uploads/         # 上传的图片和视频文件
│   │   ├── middleware/      # 中间件配置
│   │   │   ├── userAuth.js  # 用户身份验证中间件
│   │   │   ├── adminAuth.js # 管理员身份验证中间件
│   │   │   └── ...          # 其他中间件
│   │   ├── config.js        # 数据库与后端配置
│   │   ├── index.js         # 后端入口文件
│   │   └── router.js        # 所有后端接口路由
│   ├── src/                 # PC 端代码
│   │   ├── apis/            # 接口请求封装
│   │   ├── components/      # 封装的组件
│   │   ├── pages/           # PC 端页面
│   │   ├── router/          # PC 端路由
│   │   ├── store/           # 管理员状态管理
│   │   └── utils/           # 封装的工具
│   ├── jsconfig.json        # 路径配置文件
│   └── craco.config.js      # Webpack 扩展配置文件
├── README.md                # 项目说明文件
└── package.json             # 依赖项配置
```

## 环境依赖

- Node.js + Express
- React
- MySQL 数据库
- 微信小程序开发工具

## 安装与启动

1. **克隆项目**

   ```bash
   git clone https://github.com/guohong13/travel-notes.git
   ```

2. **安装 PC 相关依赖**

   ```bash
   cd pc
   npm install
   ```

3. **配置数据库**

   - 修改 `pc/server/config.js`，配置数据库连接。
   - 执行 `createDatabase.sql` 文件。

4. **启动后端服务**

   ```bash
   cd pc/server
   node index.js
   ```

5. **启动 PC 端**

   ```bash
   cd pc
   npm start
   ```

6. **小程序启动**
   - 使用微信开发者工具导入 `mobile/` 目录。

## 主要接口说明

### 用户相关

- `POST /api/users/register` 用户注册
- `POST /api/users/login` 用户登录
- `GET /api/users/profile` 获取当前用户信息

### 游记相关

- `POST /api/upload` 文件上传
- `POST /api/notes` 发布游记
- `GET /api/notes` 用户获取游记列表
- `PUT /api/notes/modify/:id` 修改游记
- `DELETE /api/notes/delete/:id` 删除游记（逻辑删除）
- `GET /api/notes/user/:userId` 获取用户自己的游记
- `GET /api/notes/search` 游记搜索

### 管理员相关

- `POST /api/admin/register` 管理员注册
- `POST /api/admin/login` 管理员登录
- `GET /api/admin/notes` 获取游记列表
- `GET /api/admin/notes/:id` 获取指定游记列表
- `GET /api/notes/admin` 获取待审核游记
- `GET /api/notes/admin/filter` 筛选游记列表
- `PUT /api/notes/approve/:id` 审核通过
- `PUT /api/notes/reject/:id` 审核拒绝
- `DELETE /api/notes/delete/:id` 删除游记（逻辑删除）

### 数据统计相关

- `POST /api/admin/notes/stats` 游记状态统计
- `GET /api/admin/users/stats` 用户发布量排行

## 文件上传说明

- 支持图片格式：jpg、jpeg、png、gif。
- 支持视频格式：mp4、mov、avi。

## 注意事项

- 上传文件最大 50MB，超出会被拒绝。
- 需保证 `uploads/` 目录有写入权限。

## 贡献与反馈

如有建议或 bug，欢迎提 issue。

## 鸣谢

@xiamian225
