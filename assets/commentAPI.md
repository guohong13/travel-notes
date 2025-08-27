# 评论功能 API 接口文档

## 概述

本文档描述了游记评论功能的 API 接口，包括获取评论列表、发表评论、删除评论、评论点赞等功能。

## 基础信息

- **基础 URL**: `/api`
- **认证方式**: Bearer Token (JWT)
- **数据格式**: JSON
- **字符编码**: UTF-8

## 接口列表

### 1. 获取游记评论列表

#### 接口信息

- **URL**: `GET /notes/:id/comments`
- **方法**: GET
- **认证**: 可选（未登录用户只能查看评论，无法获取点赞状态）
- **描述**: 获取指定游记的评论列表，支持分页

#### 请求参数

##### 路径参数

| 参数名 | 类型   | 必填 | 描述    |
| ------ | ------ | ---- | ------- |
| id     | number | 是   | 游记 ID |

##### 查询参数

| 参数名   | 类型   | 必填 | 默认值 | 描述               |
| -------- | ------ | ---- | ------ | ------------------ |
| page     | number | 否   | 1      | 页码，从 1 开始    |
| pageSize | number | 否   | 20     | 每页数量，最大 100 |

#### 请求示例

```http
GET /api/notes/123/comments?page=1&pageSize=10
Authorization: Bearer <token>
```

#### 响应格式

```json
{
  "code": 1,
  "message": "获取成功",
  "data": {
    "list": [
      {
        "id": 1,
        "note_id": 123,
        "user_id": 456,
        "content": "这是一条评论内容",
        "like_count": 5,
        "created_at": "2024-01-01T10:00:00.000Z",
        "updated_at": "2024-01-01T10:00:00.000Z",
        "nickname": "用户名",
        "avatar_url": "/uploads/avatar.jpg",
        "isLiked": false
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 50,
      "totalPages": 3,
      "hasMore": true
    }
  }
}
```

#### 响应字段说明

| 字段名                     | 类型    | 描述                               |
| -------------------------- | ------- | ---------------------------------- |
| code                       | number  | 响应状态码，1 表示成功，0 表示失败 |
| message                    | string  | 响应消息                           |
| data.list                  | array   | 评论列表                           |
| data.list[].id             | number  | 评论 ID                            |
| data.list[].note_id        | number  | 游记 ID                            |
| data.list[].user_id        | number  | 评论用户 ID                        |
| data.list[].content        | string  | 评论内容                           |
| data.list[].like_count     | number  | 评论点赞数                         |
| data.list[].created_at     | string  | 评论创建时间                       |
| data.list[].updated_at     | string  | 评论更新时间                       |
| data.list[].nickname       | string  | 评论用户昵称                       |
| data.list[].avatar_url     | string  | 评论用户头像 URL                   |
| data.list[].isLiked        | boolean | 当前用户是否已点赞（仅登录用户）   |
| data.pagination            | object  | 分页信息                           |
| data.pagination.page       | number  | 当前页码                           |
| data.pagination.pageSize   | number  | 每页数量                           |
| data.pagination.total      | number  | 总记录数                           |
| data.pagination.totalPages | number  | 总页数                             |
| data.pagination.hasMore    | boolean | 是否有更多数据                     |

---

### 2. 发表评论

#### 接口信息

- **URL**: `POST /notes/:id/comments`
- **方法**: POST
- **认证**: 必需
- **描述**: 为指定游记发表评论

#### 请求参数

##### 路径参数

| 参数名 | 类型   | 必填 | 描述    |
| ------ | ------ | ---- | ------- |
| id     | number | 是   | 游记 ID |

##### 请求体

| 参数名  | 类型   | 必填 | 描述                  |
| ------- | ------ | ---- | --------------------- |
| content | string | 是   | 评论内容，最大 500 字 |

#### 请求示例

```http
POST /api/notes/123/comments
Authorization: Bearer <token>
Content-Type: application/json

{
  "content": "这是一条评论内容"
}
```

#### 响应格式

```json
{
  "code": 1,
  "message": "评论发表成功",
  "data": {
    "id": 1,
    "note_id": 123,
    "user_id": 456,
    "content": "这是一条评论内容",
    "like_count": 0,
    "created_at": "2024-01-01T10:00:00.000Z",
    "updated_at": "2024-01-01T10:00:00.000Z",
    "nickname": "用户名",
    "avatar_url": "/uploads/avatar.jpg",
    "isLiked": false
  }
}
```

---

### 3. 删除评论

#### 接口信息

- **URL**: `DELETE /comments/:id`
- **方法**: DELETE
- **认证**: 必需
- **描述**: 删除指定的评论（仅评论作者可删除）

#### 请求参数

##### 路径参数

| 参数名 | 类型   | 必填 | 描述    |
| ------ | ------ | ---- | ------- |
| id     | number | 是   | 评论 ID |

#### 请求示例

```http
DELETE /api/comments/1
Authorization: Bearer <token>
```

#### 响应格式

```json
{
  "code": 1,
  "message": "评论删除成功",
  "data": null
}
```

---

### 4. 评论点赞/取消点赞

#### 接口信息

- **URL**: `POST /comments/:id/like`
- **方法**: POST
- **认证**: 必需
- **描述**: 对指定评论进行点赞或取消点赞

#### 请求参数

##### 路径参数

| 参数名 | 类型   | 必填 | 描述    |
| ------ | ------ | ---- | ------- |
| id     | number | 是   | 评论 ID |

#### 请求示例

```http
POST /api/comments/1/like
Authorization: Bearer <token>
```

#### 响应格式

```json
{
  "code": 1,
  "message": "点赞成功",
  "data": {
    "isLiked": true,
    "likeCount": 6
  }
}
```

#### 响应字段说明

| 字段名    | 类型    | 描述                                            |
| --------- | ------- | ----------------------------------------------- |
| isLiked   | boolean | 点赞后的状态，true 表示已点赞，false 表示未点赞 |
| likeCount | number  | 更新后的点赞数量                                |

---

### 5. 获取评论点赞状态

#### 接口信息

- **URL**: `GET /comments/:id/like`
- **方法**: GET
- **认证**: 必需
- **描述**: 获取指定评论的点赞状态和数量

#### 请求参数

##### 路径参数

| 参数名 | 类型   | 必填 | 描述    |
| ------ | ------ | ---- | ------- |
| id     | number | 是   | 评论 ID |

#### 请求示例

```http
GET /api/comments/1/like
Authorization: Bearer <token>
```

#### 响应格式

```json
{
  "code": 1,
  "message": "获取成功",
  "data": {
    "isLiked": true,
    "likeCount": 5
  }
}
```

---

## 错误码说明

| 错误码 | 描述                                           |
| ------ | ---------------------------------------------- |
| 400    | 请求参数错误（如评论内容为空、超过字数限制等） |
| 401    | 未认证或认证失败                               |
| 403    | 权限不足（如删除他人评论）                     |
| 404    | 资源不存在（如游记或评论不存在）               |
| 500    | 服务器内部错误                                 |

## 注意事项

1. **评论内容限制**: 评论内容不能为空，且不能超过 500 字
2. **权限控制**: 用户只能删除自己发表的评论
3. **逻辑删除**: 删除评论采用逻辑删除，不会物理删除数据
4. **事务处理**: 评论相关操作都使用数据库事务确保数据一致性
5. **点赞状态**: 未登录用户无法获取评论点赞状态，所有评论都显示为未点赞
6. **分页限制**: 每页最大数量限制为 100 条，防止恶意请求

## 更新记录

- **v1.0.0** (2024-01-01): 初始版本，包含基础的评论 CRUD 功能
- **v1.1.0** (2024-01-01): 添加评论点赞功能
- **v1.2.0** (2024-01-01): 完善错误处理和权限控制
