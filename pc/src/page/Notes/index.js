import React, { useState, useEffect } from "react";
import axios from "axios";
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

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("adminToken");
      const response = await axios.get(
        "http://localhost:3300/api/notes/admin/filter",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          params: {
            ...filters,
            page: data.page,
            pageSize: data.pageSize,
          },
        }
      );

      if (response.data.code === 1) {
        const formatted = response.data.data.list.map((item) => ({
          ...item,
          id: item.id,
          created_at: formatDate(item.created_at),
          updated_at: formatDate(item.updated_at),
        }));

        setData({
          list: formatted,
          total: response.data.data.total,
          page: response.data.data.page,
          pageSize: response.data.data.pageSize,
        });
      }
    } catch (err) {
      console.error("加载数据失败:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filters, data.page, data.pageSize]);

  const handleRowClick = (record) => {
    navigate(`/travel-notes/audit/${record.id}`);
  };

  // console.log(data.list);

  return (
    <div>
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
