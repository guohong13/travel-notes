// 路由配置

import { lazy, Suspense } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";

// 懒加载
const NotesLayout = lazy(() => import("@/page/Layout"));
const Home = lazy(() => import("@/page/Home"));
const Notes = lazy(() => import("@/page/Notes"));
const AuditDetail = lazy(() => import("@/page/Auditdetail"));
const Login = lazy(() => import("@/page/Login"));
const NotFoundPage = lazy(() => import("@/page/NotFound"));

const withSuspense = (Component) => (
  <Suspense fallback={<div>页面加载中...</div>}>
    <Component />
  </Suspense>
);

const router = createBrowserRouter([
  {
    path: "/",
    element: <Navigate to="/travel-notes/home" replace />,
  },
  {
    path: "/travel-notes",
    element: withSuspense(NotesLayout),
    children: [
      {
        path: "home",
        element: withSuspense(Home),
      },
      {
        path: "notes",
        element: withSuspense(Notes),
      },
      {
        path: "audit/:id",
        element: withSuspense(AuditDetail),
      },
      {
        path: "audit",
        element: withSuspense(AuditDetail),
      },
    ],
  },
  {
    path: "/login",
    element: withSuspense(Login),
  },
  {
    path: "*",
    element: withSuspense(NotFoundPage),
  },
]);

export default router;
