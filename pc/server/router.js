const express = require("express");
const router = express.Router();

// 模拟一些数据
let data = [
  { id: 1, name: "Item 1" },
  { id: 2, name: "Item 2" },
];

// 获取所有数据
router.get("/", (req, res) => {
  res.json(data);
});

// 根据 ID 获取单个数据
router.get("/:id", (req, res) => {
  const item = data.find((item) => item.id === parseInt(req.params.id));
  if (!item) {
    return res.status(404).json({ message: "Item not found" });
  }
  res.json(item);
});

// 创建新数据
router.post("/", (req, res) => {
  const newItem = {
    id: data.length + 1,
    name: req.body.name,
  };
  data.push(newItem);
  res.status(201).json(newItem);
});

// 根据 ID 更新数据
router.put("/:id", (req, res) => {
  const itemIndex = data.findIndex(
    (item) => item.id === parseInt(req.params.id)
  );
  if (itemIndex === -1) {
    return res.status(404).json({ message: "Item not found" });
  }
  data[itemIndex].name = req.body.name;
  res.json(data[itemIndex]);
});

// 根据 ID 删除数据
router.delete("/:id", (req, res) => {
  const itemIndex = data.findIndex(
    (item) => item.id === parseInt(req.params.id)
  );
  if (itemIndex === -1) {
    return res.status(404).json({ message: "Item not found" });
  }
  const deletedItem = data.splice(itemIndex, 1);
  res.json(deletedItem[0]);
});

module.exports = router;
