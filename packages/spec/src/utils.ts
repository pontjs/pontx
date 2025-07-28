/**
 * @author jasonHzq
 * 工具函数集合
 */

/**
 * 递归地将对象的所有字段按字母顺序排序
 * @param obj 要排序的对象
 * @returns 返回一个新的排序后的对象
 */
export function sortObjectFields<T>(obj: T): T {
  // 处理 null 或非对象类型
  if (obj === null || typeof obj !== "object") {
    return obj;
  }

  // 处理数组
  if (Array.isArray(obj)) {
    return obj.map((item) => sortObjectFields(item)) as unknown as T;
  }

  // 获取所有键并按字母顺序排序
  const sortedKeys = Object.keys(obj).sort();

  // 创建一个新对象来存储排序后的结果
  const result: Record<string, any> = {};

  // 按排序后的键遍历并递归处理值
  for (const key of sortedKeys) {
    result[key] = sortObjectFields((obj as Record<string, any>)[key]);
  }

  return result as T;
}
