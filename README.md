# 旅游日记平台

## 项目简介

本项目为携程前端训练营结营大作业，完成了一个旅游日记发布与管理系统，包含前端（移动端/PC 端）和后端（Express 框架）两部分。

## 主要功能

- 用户注册、登录
- 游记发布（支持多图和视频上传）
- 游记浏览、搜索、详情查看
- 游记点赞、收藏、评论
- 用户游记修改、删除
- 管理员（系统设计两个角色）登入
- 游记数据可视化
- 管理员游记审核、删除
- WebSocket 实时通知
- Token 鉴权与 RSA 加密

## 界面展示

### 移动端界面

移动端界面使用微信小程序开发，主要包含以下页面：

- 登录/注册界面
- 游记发布界面
- 游记详情界面
- 游记编辑界面
- 实时通知界面
- 个人主页界面

<p>
  <img src="https://github.com/guohong13/travel-notes/blob/main/assets/游记列表1.png?raw=true" height="300"/>
  <img src="https://github.com/guohong13/travel-notes/blob/main/assets/游记列表2.png?raw=true" height="300"/>
  <img src="https://github.com/guohong13/travel-notes/blob/main/assets/游记搜索.png?raw=true" height="300"/>
  <img src="https://github.com/guohong13/travel-notes/blob/main/assets/小程序注册.png?raw=true" height="300"/>
  <img src="https://github.com/guohong13/travel-notes/blob/main/assets/小程序登入.png?raw=true" height="300"/>
</p>
<p>
  <img src="https://github.com/guohong13/travel-notes/blob/main/assets/游记详情1.png?raw=true" height="300"/>
  <img src="https://github.com/guohong13/travel-notes/blob/main/assets/游记详情2.png?raw=true" height="300"/>
  <img src="https://github.com/guohong13/travel-notes/blob/main/assets/实时通知.png?raw=true" height="300"/>
  <img src="https://github.com/guohong13/travel-notes/blob/main/assets/游记发布.png?raw=true" height="300"/>
  <img src="https://github.com/guohong13/travel-notes/blob/main/assets/游记编辑.png?raw=true" height="300"/>
</p>
<p>
  <img src="https://github.com/guohong13/travel-notes/blob/main/assets/个人主页.png?raw=true" height="300"/>
  <img src="https://github.com/guohong13/travel-notes/blob/main/assets/我的游记.png?raw=true" height="300"/>
  <img src="https://github.com/guohong13/travel-notes/blob/main/assets/点赞列表.png?raw=true" height="300"/>
  <img src="https://github.com/guohong13/travel-notes/blob/main/assets/粉丝列表.png?raw=true" height="300"/>
  <img src="https://github.com/guohong13/travel-notes/blob/main/assets/资料编辑.png?raw=true" height="300"/>
</p>

### 后台管理系统界面

后台管理系统使用 React 框架开发，主要包含以下页面：

- 管理员登录页面
- 管理页首页
- 游记列表页面
- 游记审核页面

<p>
  <img src="https://github.com/guohong13/travel-notes/blob/main/assets/审核登入.png?raw=true" width="400"/>
  <img src="https://github.com/guohong13/travel-notes/blob/main/assets/审核首页.png?raw=true" width="400"/>
</p>
<p>
  <img src="https://github.com/guohong13/travel-notes/blob/main/assets/审核列表.png?raw=true" width="400"/>
  <img src="https://github.com/guohong13/travel-notes/blob/main/assets/游记审核.png?raw=true" width="400"/>
</p>

## 主要技术栈

- Node.js + Express
- WebSocket
- React
- Swagger
- MySQL 数据库
- 微信小程序

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
   - 执行 `travel-notes.sql` 文件。

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
   - 安装小程序环境依赖。

## Swagger 接口文档

- 自动生成 API 文档：

  ```bash
  cd pc
  npm run swagger
  ```

- 访问地址：`http://localhost:3300/api-docs`

## 注意事项

- 上传文件最大 50MB，超出会被拒绝。
- 需保证 `uploads/` 目录有写入权限。

## 贡献与反馈

如有建议或 bug，欢迎提 issue。

## 鸣谢

[@xiamian225](https://github.com/xiamian225)
