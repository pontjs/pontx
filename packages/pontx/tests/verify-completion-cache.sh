#!/bin/bash

###
# Completion 缓存验证脚本
#
# 用法：
#   bash tests/verify-completion-cache.sh
###

set -e

# 获取脚本所在目录（packages/pontx）
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PONTX_CLI="node $SCRIPT_DIR/lib/cli.js"
TEST_DIR="${TEST_DIR:-$SCRIPT_DIR/../../examples/react-app}"

echo "🧪 Completion 缓存验证脚本"
echo "================================"
echo ""

# 检查测试目录
if [ ! -d "$TEST_DIR" ]; then
  echo "❌ 测试目录不存在: $TEST_DIR"
  echo "   请设置环境变量: export TEST_DIR=/path/to/your/project"
  exit 1
fi

cd "$TEST_DIR"
echo "📁 测试目录: $(pwd)"
echo ""

# 1. 清理缓存
echo "1️⃣  清理旧缓存..."
CACHE_DIR="node_modules/.pontx-cache"
MANIFEST_FILE="$CACHE_DIR/completion-manifest.json"

if [ -f "$MANIFEST_FILE" ]; then
  rm -f "$MANIFEST_FILE"
  echo "   ✓ 已删除: $MANIFEST_FILE"
else
  echo "   ℹ️  缓存不存在（首次运行）"
fi
echo ""

# 2. 首次补全（构建缓存）
echo "2️⃣  首次补全请求（构建缓存）..."
START=$(node -e 'console.log(Date.now())')
RESULT=$($PONTX_CLI --get-completions "pontx call " 2 plain 2>&1 | head -5)
END=$(node -e 'console.log(Date.now())')
TIME1=$((END - START))

echo "   ⏱  耗时: ${TIME1}ms"
echo "   📋 补全结果预览:"
echo "$RESULT" | sed 's/^/      /'
echo ""

# 3. 检查缓存文件
echo "3️⃣  检查缓存文件..."
if [ -f "$MANIFEST_FILE" ]; then
  SIZE=$(du -h "$MANIFEST_FILE" | cut -f1)
  APIS=$(grep -o '"name":' "$MANIFEST_FILE" | wc -l | xargs)
  echo "   ✅ 缓存已生成"
  echo "   📄 文件: $MANIFEST_FILE"
  echo "   💾 大小: $SIZE"
  echo "   🔢 APIs: ~$APIS 个"

  # 显示 manifest 片段
  echo ""
  echo "   📝 Manifest 片段:"
  node -e "
    const fs = require('fs');
    const manifest = JSON.parse(fs.readFileSync('$MANIFEST_FILE', 'utf-8'));
    console.log('      version:', manifest.version);
    console.log('      local specs:', manifest.local.specs.length);
    if (manifest.local.specs.length > 0) {
      const spec = manifest.local.specs[0];
      console.log('      spec name:', spec.name);
      console.log('      spec APIs:', spec.apis.length);
      if (spec.apis.length > 0) {
        console.log('      示例 API:', spec.apis[0].name, '-', spec.apis[0].title);
      }
    }
  "
else
  echo "   ⚠️  缓存文件不存在"
fi
echo ""

# 4. 第二次补全（使用缓存）
echo "4️⃣  第二次补全请求（使用缓存）..."
START=$(node -e 'console.log(Date.now())')
RESULT2=$($PONTX_CLI --get-completions "pontx call " 2 plain 2>&1 | head -5)
END=$(node -e 'console.log(Date.now())')
TIME2=$((END - START))

echo "   ⏱  耗时: ${TIME2}ms"
echo "   📋 补全结果预览:"
echo "$RESULT2" | sed 's/^/      /'
echo ""

# 5. 性能对比
echo "5️⃣  性能对比"
echo "   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "   首次加载（构建）: ${TIME1}ms"
echo "   缓存加载:        ${TIME2}ms"

if [ $TIME2 -gt 0 ]; then
  SPEEDUP=$((TIME1 * 100 / TIME2))
  echo "   性能提升:        ${SPEEDUP}%"
else
  echo "   性能提升:        极快（<1ms）"
fi
echo ""

# 6. 测试不同的补全场景
echo "6️⃣  测试各种补全场景..."
echo ""

echo "   📍 场景 1: 补全 spec 名称"
START=$(node -e 'console.log(Date.now())')
SPECS=$($PONTX_CLI --get-completions "pontx call " 2 plain 2>&1 | head -3)
END=$(node -e 'console.log(Date.now())')
echo "      耗时: $((END - START))ms"
echo "$SPECS" | sed 's/^/      /'
echo ""

echo "   📍 场景 2: 补全 tag（如果有）"
START=$(node -e 'console.log(Date.now())')
TAGS=$($PONTX_CLI --get-completions "pontx call petstore." 3 plain 2>&1 | head -3)
END=$(node -e 'console.log(Date.now())')
echo "      耗时: $((END - START))ms"
echo "$TAGS" | sed 's/^/      /'
echo ""

echo "   📍 场景 3: 使用 zsh 格式（显示描述）"
START=$(node -e 'console.log(Date.now())')
ZSH=$($PONTX_CLI --get-completions "pontx call petstore.pet." 4 --format zsh 2>&1 | head -3)
END=$(node -e 'console.log(Date.now())')
echo "      耗时: $((END - START))ms"
echo "$ZSH" | sed 's/^/      /'
echo ""

# 7. 测试增量更新
echo "7️⃣  测试增量更新..."
echo "   修改 manifest mtime（模拟文件变化）..."
touch "$MANIFEST_FILE"

START=$(node -e 'console.log(Date.now())')
$PONTX_CLI --get-completions "pontx call " 2 plain > /dev/null 2>&1
END=$(node -e 'console.log(Date.now())')
TIME3=$((END - START))

echo "   ⏱  增量更新耗时: ${TIME3}ms"
echo ""

# 总结
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ 验证完成！"
echo ""
echo "📊 性能汇总:"
echo "   首次构建:    ${TIME1}ms"
echo "   缓存命中:    ${TIME2}ms"
echo "   增量更新:    ${TIME3}ms"
echo ""

if [ -f "$MANIFEST_FILE" ]; then
  echo "💡 提示:"
  echo "   - 缓存文件: $MANIFEST_FILE"
  echo "   - 清理缓存: rm $MANIFEST_FILE"
  echo "   - 或使用:   pontx cache:clean"
fi
