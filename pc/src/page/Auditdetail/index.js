import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, Spin, Image, Tag, Button, message, Modal, Input } from "antd";
import { useDispatch, useSelector } from "react-redux";
import formatDate from "@/utils/date";
import "./index.scss";
import { notesAPI } from "@/apis";

const AuditDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [noteDetail, setNoteDetail] = useState(null);
  const [rejectVisible, setRejectVisible] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [messageApi, contextHolder] = message.useMessage();
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [approveConfirmVisible, setApproveConfirmVisible] = useState(false);
  const { role } = useSelector((state) => state.user);
  const userIsAdmin = role === "admin";

  useEffect(() => {
    const fetchNoteDetail = async () => {
      try {
        const data = await notesAPI.getNoteDetail(id);
        setNoteDetail(data.data);
      } catch (error) {
        messageApi.error("获取数据失败");
      } finally {
        setLoading(false);
      }
    };

    fetchNoteDetail();
  }, [id]);

  const handleApprove = async () => {
    try {
      await notesAPI.approveNote(id);
      messageApi.success("游记已通过");
      setTimeout(() => navigate("/travel-notes/notes"), 1000);
    } catch (error) {
      messageApi.error(error.message);
    }
  };

  const handleReject = async (reason) => {
    try {
      await notesAPI.rejectNote(id, reason);
      messageApi.success("游记未通过");
      setNoteDetail((prev) => ({
        ...prev,
        status: "rejected",
        reject_reason: reason,
        updated_at: new Date().toISOString(),
      }));
      setTimeout(() => navigate("/travel-notes/notes"), 1000);
    } catch (error) {
      messageApi.error(error.message);
    } finally {
      setRejectVisible(false);
      setRejectReason("");
    }
  };

  const handleDelete = async () => {
    try {
      await notesAPI.deleteNote(id);
      messageApi.success("游记已删除");
      setTimeout(() => navigate("/travel-notes/notes"), 1000);
    } catch (error) {
      messageApi.error(error.message);
    }
  };

  if (loading) {
    return <Spin size="large" className="loading-spinner" />;
  }

  if (!noteDetail) {
    return <div className="error-message">未找到相关游记信息</div>;
  }

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
          {
            {
              pending: "待审核",
              approved: "已通过",
              rejected: "未通过",
            }[noteDetail.status]
          }
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
          onClick={() => setRejectVisible(true)}
          disabled={noteDetail.status === "rejected"}
        >
          拒绝
        </Button>,
        userIsAdmin && (
          <Button
            key="delete"
            type="primary"
            danger
            onClick={() => setDeleteConfirmVisible(true)}
            title="需要管理员权限"
          >
            删除
          </Button>
        ),
      ].filter(Boolean)}
    >
      {contextHolder}
      {/* 弹窗组件 */}
      <Modal
        title="确认删除"
        open={deleteConfirmVisible}
        onOk={handleDelete}
        onCancel={() => setDeleteConfirmVisible(false)}
        okText="确认删除"
        cancelText="取消"
      >
        <p style={{ fontSize: 16 }}>⚠️ 确定要删除这篇游记吗？</p>
      </Modal>

      <Modal
        title="确认通过"
        open={approveConfirmVisible}
        onOk={handleApprove}
        onCancel={() => setApproveConfirmVisible(false)}
        okText="确认通过"
        cancelText="取消"
      >
        <p style={{ fontSize: 16 }}>✔️ 确定要通过这篇游记吗？</p>
      </Modal>

      <Modal
        title="请输入拒绝原因"
        open={rejectVisible}
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

      {/* 内容展示部分 */}
      <div className="audit-content">
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
            {noteDetail.reject_reason && (
              <div className="reject-reason">
                <h4>拒绝原因：</h4>
                <p>{noteDetail.reject_reason}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};

export default AuditDetail;
