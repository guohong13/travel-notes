import Mock from './WxMock';
// 导入包含path和data的对象
import loginMock from './login/index';
import homeMock from './home/index';
import searchMock from './search/index';
import dataCenter from './dataCenter/index';
import my from './my/index';
import mynotes from './mynotes/index';

export default () => {
  // 在这里添加新的mock数据
  const mockData = [...loginMock, ...homeMock, ...searchMock, ...dataCenter, ...my, ...mynotes];
  mockData.forEach((item) => {
    Mock.mock(item.path, {
      code: 200,
      message: '请求成功',
      data: item.data
    });
  });
};
