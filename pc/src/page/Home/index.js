// page/Home/index.jsx
import React, { useEffect, useState } from "react";
import ReactECharts from "echarts-for-react";
import { Card, Spin, Alert } from "antd";
import axios from "axios";
import "./index.scss";

const Home = () => {
  const [stats, setStats] = useState(null);
  const [userStats, setUserStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, userRes] = await Promise.all([
          axios.get("http://localhost:3300/api/admin/notes/stats", {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
            },
          }),
          axios.get("http://localhost:3300/api/admin/users/stats", {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
            },
          }),
        ]);

        if (statsRes.data.code === 1 && userRes.data.code === 1) {
          setStats(statsRes.data.data);
          setUserStats(userRes.data.data);
        } else {
          setError("数据获取失败");
        }
      } catch (err) {
        setError("网络请求失败");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // 饼图配置
  const getPieOption = () => ({
    title: {
      text: "游记审核状态分布",
      left: "center",
    },
    tooltip: {
      trigger: "item",
      formatter: "{a} <br/>{b}: {c} ({d}%)",
    },
    legend: {
      orient: "vertical",
      left: "left",
      data: ["已通过", "未通过", "待审核"],
    },
    series: [
      {
        name: "审核状态",
        type: "pie",
        radius: "50%",
        data: [
          { value: stats?.approved, name: "已通过" },
          { value: stats?.rejected, name: "未通过" },
          { value: stats?.pending, name: "待审核" },
        ],
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: "rgba(0, 0, 0, 0.5)",
          },
        },
        color: ["#36c362", "#ff4d4f", "#faad14"],
      },
    ],
  });

  // 柱状图配置
  const getBarOption = () => ({
    title: {
      text: "用户游记发布数量 Top10",
      left: "center",
    },
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
    },
    grid: {
      left: "3%",
      right: "4%",
      bottom: "15%",
      containLabel: true,
    },
    xAxis: {
      type: "category",
      data: userStats.map((u) => u.username),
      name: "用户名",
      nameLocation: "end",
      nameGap: 15,
      axisLabel: {
        rotate: 45,
        interval: 0,
        fontSize: 11,
      },
    },
    yAxis: {
      type: "value",
      name: "发布数量",
      nameLocation: "end",
      nameGap: 15,
      nameRotate: 90,
    },
    series: [
      {
        name: "发布数量",
        type: "bar",
        data: userStats.map((u) => u.count),
        barWidth: 30, // 调整柱状图宽度
        itemStyle: { color: "#1890ff" },
      },
    ],
  });

  return (
    <div className="home-wrapper">
      <Card title="数据统计面板">
        {loading ? (
          <Spin tip="数据加载中..." size="large" />
        ) : error ? (
          <Alert message={error} type="error" showIcon />
        ) : (
          <>
            <ReactECharts
              option={getPieOption()}
              style={{ height: 450, marginBottom: 20 }}
            />
            <ReactECharts option={getBarOption()} style={{ height: 450 }} />
          </>
        )}
      </Card>
    </div>
  );
};

export default Home;
