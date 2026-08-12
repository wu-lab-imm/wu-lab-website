const siteBase = import.meta.env.BASE_URL.replace(/\/$/, '');
const imageOrigin = 'https://wulab-images-1324699520.cos.ap-beijing.myqcloud.com';

const publicImagePath = (path: string) => {
  if (!path || /^(?:data:|https?:)/i.test(path)) return undefined;
  const markerIndex = path.indexOf('/images/');
  return markerIndex >= 0 ? path.slice(markerIndex) : undefined;
};

export const originImageUrl = (path: string) => {
  const imagePath = publicImagePath(path);
  return imagePath ? `${siteBase}${imagePath}` : path;
};

export const imageUrl = (path: string) => {
  const imagePath = publicImagePath(path);
  return imagePath ? `${imageOrigin}${imagePath}` : path;
};

export const imageFallbackUrl = (path: string) => {
  const imagePath = publicImagePath(path);
  return imagePath ? `${siteBase}${imagePath}` : undefined;
};
