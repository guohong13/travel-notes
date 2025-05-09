import { Input, Button, List } from "antd";
import { useState } from "react";
import AuditCard from "@/components/AuditCard";
import "./index.scss";

const mockData = new Array(5).fill(null).map((_, i) => ({
  id: i,
  title: "标题标题",
  content:
    "文案文案文案文案文案文案文案文案文案文案文案文案文案文案文案文案文案文案文案文案",
  status: "待审核",
}));

const AuditPage = () => {
  const [data, setData] = useState(mockData);
  const [search, setSearch] = useState("");

  return (
    <div className="audit-page">
      <h2>审核列表</h2>
      <Input.Search
        placeholder="Destination/Hotel name"
        allowClear
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="audit-page-search"
        enterButton="Search"
      />
      <div className="audit-page-buttons">
        <Button type="link" className="audit-page-button--pass">
          通过
        </Button>
        <Button type="link" className="audit-page-button--reject">
          拒绝
        </Button>
        <Button type="link" className="audit-page-button--delete">
          删除
        </Button>
      </div>
      <List
        dataSource={data}
        renderItem={(item) => (
          <AuditCard
            data={item}
            onAction={(status) => {
              setData((prev) =>
                prev.map((d) => (d.id === item.id ? { ...d, status } : d))
              );
            }}
          />
        )}
      />
    </div>
  );
};

export default AuditPage;
