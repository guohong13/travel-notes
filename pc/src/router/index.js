// 路由配置

import NotesLayout from "@/page/Layout";
import Home from "@/page/Home";
import Notes from "@/page/Notes";
import AuditDetail from "@/page/Auditdetail";
import Login from "@/page/Login";
import NotFoundPage from "@/page/NotFound";
import { createBrowserRouter } from "react-router-dom";

// 配置路由实例

const router = createBrowserRouter([
  {
    path: "/travel-notes",
    element: <NotesLayout />,
    children: [
      { path: "home", element: <Home /> },

      { path: "notes", element: <Notes /> },

      {
        path: "audit/:id",
        element: <AuditDetail />,
      },

      {
        path: "audit",
        element: <AuditDetail />,
      },
    ],
  },
  { path: "/login", element: <Login /> },
  { path: "*", element: <NotFoundPage /> },
]);
export default router;
