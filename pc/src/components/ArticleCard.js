import React from "react";
import { Card, Table, Tag, Image } from "antd";

const ArticleCard = ({
  data,
  pagination,
  onPageChange,
  loading,
  onRowClick,
}) => {
  const columns = [
    {
      title: "封面",
      dataIndex: "images",
      key: "images",
      align: "center",
      render: (imageUrls) => {
        const baseUrl = "http://localhost:3300/";
        const url =
          imageUrls && imageUrls.length > 0
            ? baseUrl + imageUrls[0].replace(/\\/g, "/")
            : null;
        return (
          url && <Image src={url} width={80} height={60} preview={false} />
        );
      },
    },
    {
      title: "标题",
      dataIndex: "title",
      key: "title",
      align: "center",
    },
    {
      title: "状态",
      dataIndex: "status",
      key: "status",
      align: "center",
      render: (text) => {
        const statusMap = {
          pending: { color: "blue", text: "待审核" },
          approved: { color: "green", text: "已通过" },
          rejected: { color: "red", text: "未通过" },
        };
        return (
          <Tag color={statusMap[text]?.color}>{statusMap[text]?.text}</Tag>
        );
      },
    },
    {
      title: "发布时间",
      dataIndex: "created_at",
      key: "created_at",
      align: "center",
    },
    {
      title: "修改时间",
      dataIndex: "updated_at",
      key: "updated_at",
      align: "center",
    },
  ];

  return (
    <Card title={`找到${pagination.total}条结果`}>
      <Table
        columns={columns}
        dataSource={data}
        rowKey="id"
        pagination={{
          ...pagination,
          showSizeChanger: true,
          pageSizeOptions: ["10", "20", "50"],
          showTotal: (total) => `共 ${total} 条`,
        }}
        onChange={onPageChange}
        loading={loading}
        onRow={(record) => ({
          onClick: () => onRowClick(record),
          style: { cursor: "pointer" },
        })}
      />
    </Card>
  );
};

export default ArticleCard;
