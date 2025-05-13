import React from "react";
import { Button, Form, Card, Radio, DatePicker } from "antd";
import locale from "antd/es/date-picker/locale/zh_CN";

const { RangePicker } = DatePicker;

const Search = ({ onFilter }) => {
  const [form] = Form.useForm();

  const handleSubmit = (values) => {
    const params = {
      status: values.status,
      // 将日期数组转为startDate和endDate
      ...(values.date && {
        startDate: values.date[0].format("YYYY-MM-DD"),
        endDate: values.date[1].format("YYYY-MM-DD"),
      }),
    };
    onFilter(params);
  };

  const handleReset = () => {
    form.resetFields();
    onFilter({ status: "pending" });
  };

  return (
    <div>
      <Card title="筛选条件" style={{ marginBottom: 20 }}>
        <Form
          form={form}
          initialValues={{ status: "pending", date: null }}
          onFinish={handleSubmit}
          layout="inline"
        >
          <Form.Item label="状态" name="status">
            <Radio.Group>
              <Radio value={undefined}>全部</Radio>
              <Radio value={"pending"}>待审核</Radio>
              <Radio value={"approved"}>已通过</Radio>
              <Radio value={"rejected"}>未通过</Radio>
            </Radio.Group>
          </Form.Item>

          <Form.Item label="日期" name="date">
            <RangePicker locale={locale} />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit">
              筛选
            </Button>
            <Button style={{ marginLeft: 8 }} onClick={handleReset}>
              重置
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default Search;
