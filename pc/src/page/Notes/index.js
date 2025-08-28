import React, { useState, useEffect, useCallback } from "react";
import { notesAPI } from "@/apis";
import ArticleCard from "@/components/ArticleCard";
import Search from "@/components/Search";
import formatDate from "@/utils/date";
import { useNavigate } from "react-router-dom";
import "./index.scss";

const Notes = () => {
  const navigate = useNavigate();
  const [data, setData] = useState({
    list: [],
    total: 0,
    page: 1,
    pageSize: 10,
  });
  const [filters, setFilters] = useState({ status: "pending" });
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        ...filters,
        page: data.page,
        pageSize: data.pageSize,
      };

      const response = await notesAPI.getNotes(params);

      setData((prev) => ({
        ...prev,
        list: response.data.list.map((item) => ({
          ...item,
          id: item.id,
          created_at: formatDate(item.created_at),
          updated_at: formatDate(item.updated_at),
        })),
        total: response.data.total,
      }));
    } catch (err) {
      console.error("加载数据失败:", err);
    } finally {
      setLoading(false);
    }
  }, [filters, data.page, data.pageSize]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRowClick = (record) => {
    navigate(`/travel-notes/audit/${record.id}`);
  };

  return (
    <div className="notes-page">
      <Search
        onFilter={(params) => {
          setFilters(params);
          setData((prev) => ({ ...prev, page: 1 }));
        }}
      />

      <ArticleCard
        data={data.list}
        pagination={{
          current: data.page,
          pageSize: data.pageSize,
          total: data.total,
          showSizeChanger: true,
          pageSizeOptions: ["10", "20", "50"],
        }}
        onPageChange={(pagination) => {
          setData((prev) => ({
            ...prev,
            page: pagination.current,
            pageSize: pagination.pageSize,
          }));
        }}
        loading={loading}
        onRowClick={handleRowClick}
      />
    </div>
  );
};

export default Notes;
