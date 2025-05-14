// 登入页

import React from "react";
import "./index.scss";
import { Button, Form, Input, Card, message } from "antd";
import { EyeInvisibleOutlined, EyeTwoTone } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const Login = () => {
  const [passwordVisible, setPasswordVisible] = React.useState(false);
  const [messageApi, contextHolder] = message.useMessage();
  const navigate = useNavigate();
  const onFinish = async (values) => {
    try {
      const response = await axios.post(
        "http://localhost:3300/api/admin/login",
        {
          username: values.username,
          password: values.password,
        }
      );
      // 保存 token 到 localStorage
      localStorage.setItem("adminToken", response.data.data.token);
      const successMessage = response.data.message;
      // console.log("登录成功", response);
      messageApi.success(successMessage);
      setTimeout(() => {
        navigate("/travel-notes/home");
      }, 500);
    } catch (error) {
      if (error.response) {
        const errorMessage = error.response.data.message;
        messageApi.error(errorMessage);
      } else {
        messageApi.error("服务器网络错误");
      }
    }
  };
  return (
    <div className="login">
      {contextHolder}
      <Card className="login-container">
        {/* 登录表单 */}
        <Form validateTrigger="onBlur" onFinish={onFinish}>
          <h2>游记审核管理系统</h2>

          <Form.Item
            name="username"
            rules={[
              {
                required: true,
                message: "请输入用户名",
              },
            ]}
          >
            <Input size="large" placeholder="用户名" />
          </Form.Item>
          <Form.Item
            name="password"
            rules={[
              {
                required: true,
                message: "请输入密码",
              },
            ]}
          >
            <Input.Password
              size="large"
              placeholder="密码"
              iconRender={(visible) => {
                const iconColor = "#a1a1a1";
                if (visible) {
                  return <EyeTwoTone twoToneColor={iconColor} />;
                }
                return <EyeInvisibleOutlined style={{ color: iconColor }} />;
              }}
              visibilityToggle={{
                visible: passwordVisible,
                onVisibleChange: setPasswordVisible,
              }}
            />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" size="large" block>
              登录
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default Login;
