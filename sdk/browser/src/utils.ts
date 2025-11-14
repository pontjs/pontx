export function normalizeURIComponent(v: string) {
  if (v == null) return "";

  try {
    // 如果 v 已编码一次或多次 → decode 一层 → encode → 单编码
    return encodeURIComponent(decodeURIComponent(v));
  } catch {
    // 如果 v 含残缺 %xx → 不 decode，直接 encode
    return encodeURIComponent(v);
  }
}
