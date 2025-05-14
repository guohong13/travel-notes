import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, Spin, Image, Tag, Button, message, Modal, Input } from "antd";
import { useDispatch, useSelector } from "react-redux";
import axios from "axios";
import formatDate from "@/utils/date";
import "./index.scss";

const AuditDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [noteDetail, setNoteDetail] = useState(null);
  const [rejectVisible, setRejectVisible] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [deleteErrorVisible, setDeleteErrorVisible] = useState(false);
  const [approveConfirmVisible, setApproveConfirmVisible] = useState(false);
  const [approveVisible, setApproveErrorVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const { role } = useSelector((state) => state.user);
  const userIsAdmin = role === "admin";
  const token = localStorage.getItem("adminToken");

  useEffect(() => {
    const controller = new AbortController();

    const fetchNoteDetail = async () => {
      try {
        const response = await axios.get(
          `http://localhost:3300/api/admin/notes/${id}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            signal: controller.signal,
          }
        );

        if (response.data.code === 1) {
          setNoteDetail(response.data.data);
        } else {
          message.error("获取数据失败");
        }
      } catch (error) {
        if (!axios.isCancel(error)) {
          message.error("获取数据时发生错误");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchNoteDetail();

    return () => controller.abort();
  }, [id]);

  if (loading) {
    return <Spin size="large" className="loading-spinner" />;
  }

  if (!noteDetail) {
    return <div className="error-message">未找到相关游记信息</div>;
  }

  // 处理通过审核的请求
  const handleApprove = async () => {
    try {
      const response = await axios.put(
        `http://localhost:3300/api/notes/approve/${id}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data.code === 1) {
        message.success("游记已通过");
        setTimeout(() => {
          navigate("/travel-notes/notes");
        }, 1000);
      } else {
        setErrorMessage(response.data.message || "操作失败");
        setApproveErrorVisible(true);
      }
    } catch (error) {
      message.error(error.response?.data?.message || "请求失败");
    }
  };

  // 处理拒绝审核的请求
  const handleReject = async (reason) => {
    try {
      const response = await axios.put(
        `http://localhost:3300/api/notes/reject/${id}`,
        { rejectReason: reason },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data.code === 1) {
        message.success("已拒绝审核");
        setNoteDetail((prev) => ({
          ...prev,
          status: "rejected",
          reject_reason: reason,
          updated_at: new Date().toISOString(),
        }));
        setTimeout(() => {
          navigate("/travel-notes/notes");
        }, 1000);
      } else {
        message.error(response.data.message || "操作失败");
      }
    } catch (error) {
      message.error(error.response?.data?.message || "请求失败");
    } finally {
      setRejectVisible(false);
      setRejectReason("");
    }
  };

  // 删除处理函数
  const handleDelete = async () => {
    try {
      const response = await axios.delete(
        `http://localhost:3300/api/notes/delete/${id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (response.data.code === 1) {
        message.success("游记已删除");
        setTimeout(() => {
          navigate("/travel-notes/notes");
        }, 1000);
      } else {
        setErrorMessage(response.data.message || "删除失败");
        setDeleteErrorVisible(true);
      }
    } catch (error) {
      message.error(error.response?.data?.message || "请求失败");
    }
  };

  const showRejectModal = () => {
    setRejectVisible(true);
  };

  return (
    <Card
      title="游记审核详情"
      extra={
        <Tag
          color={
            noteDetail.status === "pending"
              ? "blue"
              : noteDetail.status === "approved"
              ? "green"
              : "red"
          }
        >
          {noteDetail.status === "pending"
            ? "待审核"
            : noteDetail.status === "approved"
            ? "已通过"
            : "未通过"}
        </Tag>
      }
      actions={[
        <Button
          key="approve"
          type="primary"
          onClick={() => setApproveConfirmVisible(true)}
          disabled={noteDetail.status === "approved"}
        >
          通过
        </Button>,
        <Button
          key="reject"
          type="primary"
          onClick={showRejectModal}
          disabled={noteDetail.status === "rejected"}
        >
          拒绝
        </Button>,
        <Button
          key="delete"
          type="primary"
          danger
          onClick={() => setDeleteConfirmVisible(true)}
          // 添加权限判断
          disabled={!userIsAdmin}
          title={!userIsAdmin ? "需要管理员权限" : ""}
        >
          删除
        </Button>,
      ].filter(Boolean)}
    >
      {/* 删除确认弹窗 */}
      <Modal
        title="确认删除"
        visible={deleteConfirmVisible}
        onOk={handleDelete}
        onCancel={() => setDeleteConfirmVisible(false)}
        okText="确认删除"
        cancelText="取消"
      >
        {" "}
        <p style={{ fontSize: 16 }}>⚠️ 确定要删除这篇游记吗？</p>
      </Modal>
      {/* 通过确认弹窗 */}
      <Modal
        title="确认通过"
        visible={approveConfirmVisible}
        onOk={handleApprove}
        onCancel={() => setApproveConfirmVisible(false)}
        okText="确认通过"
        cancelText="取消"
      >
        {" "}
        <p style={{ fontSize: 16 }}>✔️ 确定要通过这篇游记吗？</p>
      </Modal>

      {/* 添加拒绝原因弹窗 */}
      <Modal
        title="请输入拒绝原因"
        visible={rejectVisible}
        onCancel={() => setRejectVisible(false)}
        onOk={() => {
          if (!rejectReason.trim()) {
            message.error("请输入拒绝原因");
            return;
          }
          handleReject(rejectReason);
        }}
        okText="确认"
        cancelText="取消"
      >
        <Input.TextArea
          rows={4}
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          placeholder="请详细说明拒绝原因..."
        />
      </Modal>

      <div className="audit-content">
        {/* 左侧媒体区域 */}
        <div className="left-panel">
          <div className="media-section">
            <h3>游记图片</h3>
            <div className="image-list">
              <Image.PreviewGroup items={noteDetail.images || []}>
                <Image
                  width={200}
                  src={noteDetail.images?.[0]}
                  style={{ marginRight: 10 }}
                />
              </Image.PreviewGroup>
            </div>
          </div>

          {noteDetail.video_url && (
            <div className="media-section">
              <h3>游记视频</h3>
              <div className="video-wrapper">
                <video controls src={noteDetail.video_url} />
              </div>
            </div>
          )}
        </div>

        {/* 右侧内容区域 */}
        <div className="right-panel">
          <div className="title-section">
            <h3>{noteDetail.title}</h3>
          </div>

          <div className="content-section">
            <h3>游记内容</h3>
            <div
              dangerouslySetInnerHTML={{ __html: noteDetail.content }}
              className="note-content"
            />
          </div>

          <div className="meta-info">
            <span>创建时间：{formatDate(noteDetail.created_at)}</span>
            <span>最后更新时间：{formatDate(noteDetail.updated_at)}</span>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default AuditDetail;
