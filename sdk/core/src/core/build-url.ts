export function normalizeURIComponent(v: string) {
  if (v == null) return '';

  try {
    // 如果 v 已编码一次或多次 → decode 一层 → encode → 单编码
    return encodeURIComponent(decodeURIComponent(v));
  } catch {
    // 如果 v 含残缺 %xx → 不 decode，直接 encode
    return encodeURIComponent(v);
  }
}

/**
 * 判断字符串是否已进行过 encodeURIComponent：
 * - 如果已编码（包括大小写不一致的 %xx），则解码一层并返回
 * - 否则直接返回原值
 */
export function decodeIfEncodedURIComponent(v: string) {
  if (v == null) return '';

  try {
    const decoded = decodeURIComponent(v);
    const reEncoded = encodeURIComponent(decoded);

    if (reEncoded === v) {
      return decoded;
    }
    return v;
  } catch {
    return v;
  }
}

export function buildUrl(
  pathname: string,
  params: Record<string, any>,
  pathMark = '',
) {
  if (!params) {
    return null;
  }

  // 创建 params 的副本，避免修改原对象
  const paramsCopy = { ...params };

  // 替换路径中的参数
  const url = pathname.replace(/\{([^}]+)\}/g, (match, key) => {
    // 如果参数存在，使用参数值
    if (paramsCopy[key] !== undefined) {
      const value = paramsCopy[key];
      delete paramsCopy[key];
      return normalizeURIComponent(String(value));
    }
    // 如果参数不存在，使用 pathMark
    return pathMark;
  });

  // 处理剩余的查询参数
  const queryParams = new URLSearchParams();
  Object.entries(paramsCopy).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      if (Array.isArray(value)) {
        // 处理数组参数
        value.forEach((v) => queryParams.append(key, String(v)));
      } else if (typeof value === 'object') {
        // 处理对象参数
        queryParams.append(key, JSON.stringify(value));
      } else {
        // 处理基本类型参数
        queryParams.append(key, decodeIfEncodedURIComponent(String(value)));
      }
    }
  });

  const queryString = queryParams.toString();
  return queryString ? `${url}?${queryString}` : url;
}
