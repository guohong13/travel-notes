// NotesLayout.jsx
import React, { useState } from "react";
import {
  HomeOutlined,
  AuditOutlined,
  LogoutOutlined,
  ReadOutlined,
} from "@ant-design/icons";
import { Breadcrumb, Layout, Menu, Popconfirm } from "antd";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import "./index.scss";

const { Header, Content, Sider } = Layout;

function getItem(label, key, icon, children) {
  return { key, icon, children, label };
}

const ROUTE_NAME_MAP = {
  "/travel-notes": "首页",
  "/travel-notes/notes": "游记列表",
  "/travel-notes/audit": "游记审核",
};

const items = [
  getItem("首页", "/travel-notes", <HomeOutlined />),
  getItem("游记列表", "/travel-notes/notes", <ReadOutlined />),
  getItem("游记审核", "/travel-notes/audit/", <AuditOutlined />),
];

const NotesLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [isLogoutModalVisible, setIsLogoutModalVisible] = useState(false);

  const onMenuClick = (route) => {
    navigate(route.key);
  };

  const generateBreadcrumbs = () => {
    const currentPath = location.pathname;
    const pathSegments = currentPath.split("/").filter(Boolean);

    let accumulatedPath = "";
    const breadcrumbs = [];

    pathSegments.forEach((segment) => {
      accumulatedPath += `/${segment}`;
      const routeName = ROUTE_NAME_MAP[accumulatedPath];
      routeName &&
        breadcrumbs.push(
          <Breadcrumb.Item key={accumulatedPath}>{routeName}</Breadcrumb.Item>
        );
    });

    return breadcrumbs.length
      ? breadcrumbs
      : [<Breadcrumb.Item key="/travel-notes">首页</Breadcrumb.Item>];
  };
  const onConfirm = () => {
    localStorage.removeItem("adminToken");
    navigate("/login");
  };

  return (
    <Layout className="main-layout">
      <Header className="fixed-header">
        <div className="logo">游记审核管理系统</div>
        <div className="header-right">
          <span className="user-name">管理员</span>

          {/* 退出确认对话框 */}
          <span className="user-logout">
            <Popconfirm
              title="是否确认退出？"
              okText="退出"
              cancelText="取消"
              onConfirm={onConfirm}
            >
              <LogoutOutlined /> 退出
            </Popconfirm>
          </span>
        </div>
      </Header>

      <Layout className="content-layout">
        <Sider
          theme="dark"
          collapsible
          collapsed={collapsed}
          onCollapse={setCollapsed}
          className="fixed-sider"
        >
          <Menu
            theme="dark"
            selectedKeys={[location.pathname]}
            onClick={onMenuClick}
            mode="inline"
            items={items}
            className="nav-menu"
          />
        </Sider>

        <Content className={`main-content ${collapsed ? "collapsed" : ""}`}>
          <Breadcrumb className="breadcrumb">
            {generateBreadcrumbs()}
          </Breadcrumb>
          <Layout className="layout-content" style={{ padding: 20 }}>
            {/* 二级路由的出口 */}
            <Outlet />
          </Layout>
        </Content>
      </Layout>
    </Layout>
  );
};

export default NotesLayout;
