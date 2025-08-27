const formatNumber = (n) => (String(n).length > 1 ? String(n) : `0${n}`);

const formatTime = (date) => {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const hh = date.getHours();
  const mm = date.getMinutes();
  const ss = date.getSeconds();
  return `${[y, m, d].map(formatNumber).join('/')} ${[hh, mm, ss].map(formatNumber).join(':')}`;
};

const getLocalUrl = (path, name) => {
  const fs = wx.getFileSystemManager();
  const tempFileName = `${wx.env.USER_DATA_PATH}/${name}`;
  fs.copyFileSync(path, tempFileName);
  return tempFileName;
};

module.exports = {
  formatTime,
  getLocalUrl
};