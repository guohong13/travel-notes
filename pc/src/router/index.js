// 路由配置

import AuditPage from "@/page/Audit";
import Login from "@/page/Login";
import NotFoundPage from "@/page/NotFound";
import { createBrowserRouter } from "react-router-dom";

// 配置路由实例

const router = createBrowserRouter([
  {
    path: "/Audit",
    element: <AuditPage></AuditPage>,
  },
  {
    path: "/Login",
    element: <Login />,
  },
  {
    path: "*",
    element: <NotFoundPage></NotFoundPage>,
  },
]);

export default router;
