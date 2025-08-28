import httpService from "@/utils/request";

export const getServerOrigin = () => {
  const apiBaseURL = httpService.defaults?.baseURL || "";
  return apiBaseURL.replace(/\/api\/?$/, "");
};

export const toMediaUrl = (url) => {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;

  const serverOrigin = getServerOrigin();
  const cleanUrl = String(url).replace(/^\/+/, "");
  return `${serverOrigin}/${cleanUrl}`;
};

export const processImages = (images) => {
  if (!images) return [];

  let imageArray = images;
  if (typeof images === "string") {
    imageArray = images.split(",").filter((img) => img.trim());
  } else if (!Array.isArray(images)) {
    return [];
  }

  return imageArray.map(toMediaUrl).filter(Boolean);
};

export const processVideo = (videoUrl) => {
  return toMediaUrl(videoUrl);
};

export const processSingleImage = (images) => {
  if (!images) return null;

  let imageArray = images;
  if (typeof images === "string") {
    imageArray = images.split(",").filter((img) => img.trim());
  } else if (!Array.isArray(images)) {
    return null;
  }

  return imageArray.length > 0 ? toMediaUrl(imageArray[0]) : null;
};
