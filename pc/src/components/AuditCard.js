import { Card, Button, Tag } from "antd";
import "./index.scss";

const statusColor = {
  待审核: "blue",
  通过: "green",
  拒绝: "orange",
  删除: "purple",
};

const AuditCard = (data, onAction) => (
  <Card className="audit-card" style={{ marginBottom: 16 }}>
    <div className="audit-card-content">
      <div className="audit-card-thumbnail" />
      <div className="audit-card-details">
        <h3>{data.title}</h3>
        <p>{data.content}</p>
      </div>
      <div className="audit-card-actions">
        <Tag color={statusColor[data.status]}>{data.status}</Tag>
        {data.status === "待审核" && (
          <div className="audit-card-action-buttons">
            <Button type="link" onClick={() => onAction("通过")}>
              通过
            </Button>
            <Button type="link" onClick={() => onAction("拒绝")}>
              拒绝
            </Button>
            <Button type="link" danger onClick={() => onAction("删除")}>
              删除
            </Button>
          </div>
        )}
      </div>
    </div>
  </Card>
);

export default AuditCard;
