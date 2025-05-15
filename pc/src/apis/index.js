import request from "@/utils/request";

/**
 * 认证相关API
 */
export const authAPI = {
  // 管理员登录
  login: (data) => request.post("/admin/login", data),
};

/**
 * 游记管理API
 */
export const notesAPI = {
  // 获取统计信息
  getStats: () => request.get("/admin/notes/stats"),

  // 获取用户排行
  getUserRanking: () => request.get("/admin/users/stats"),

  // 获取游记列表
  getNotes: (params) => request.get("/notes/admin/filter", { params }),

  // 获取单个游记详情
  getNoteDetail: (id) => request.get(`/admin/notes/${id}`),

  // 审核通过
  approveNote: (id) => request.put(`/notes/approve/${id}`),

  // 审核拒绝
  rejectNote: (id, reason) =>
    request.put(`/notes/reject/${id}`, { rejectReason: reason }),

  // 删除游记
  deleteNote: (id) => request.delete(`/notes/delete/${id}`),
};
