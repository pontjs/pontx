---
name: pontx-metadata-quality-loop
description: Internal Pontx workflow for accurately evaluating and repeatedly improving Pontx API metadata. Use whenever work involves metadata 质量评估、质量提升、循环提分、静态或动态评分、修复 quality findings、判断评分器是否合理，或运行 scorer → improver → scorer loop，即使用户没有明确说“使用 skill”。
---

# Pontx Metadata Quality Loop

用同一套可复现标准执行“评估 → 提升 → 独立复评”。目标是提高真实 Metadata 质量，不是让当前目录更容易得分。

## 先明确两种入口

- **只评估**：运行 scorer，输出静态或静态 + 动态 JSON 报告；不修改 Metadata。
- **循环提升**：由主控 Agent 隔离 scorer、improver 和 evaluator-auditor，只有独立复评确认提分才合并。

评分脚本、状态机、benchmark 和详细协议都与本 Skill 一起存放。开始前完整读取 [references/protocol.md](references/protocol.md)；评估器与动态 Agent runtime 也由本仓库提供。Metadata 仓库只作为被评估和被改进的目标。

## 1. 固定可比基线

先解析“当前 Metadata”的准确含义：默认使用 `pontx-api-metadata` 远端 accepted `main`，先 `git fetch origin main`，再从 `origin/main` 的精确 commit 创建干净只读 worktree。只有用户明确要求评估某个分支、commit 或未提交工作树时才改用该目标。不要因为当前 shell 恰好位于旧 feature branch，就静默把它当作当前质量。

评分报告开头必须写出目标 repo、ref、commit 和 worktree clean 状态。如果 scorer 或 benchmark 不在该 commit 中，应从明确版本的工具仓库调用，并单独记录工具 commit；不要从一个未说明的历史 worktree借用脚本。

记录以下 fingerprint，任一变化都必须重新建立 epoch，不能跨环境比较：

```text
Pontx evaluator commit + benchmark content hash + Node/pnpm runtime + score mode
```

先构建本地模块，不发布 npm：

```bash
pnpm --dir "$PONTX_REPO/packages/spec" build
pnpm --dir "$PONTX_REPO/packages/pontx" build
```

静态评估入口（50 分制）：

```bash
node "$PONTX_REPO/.agents/skills/pontx-metadata-quality-loop/scripts/score-metadata.mjs" \
  --metadata-repo "$METADATA_WORKTREE" \
  --spec-module "$PONTX_REPO/packages/spec/lib/index.js" \
  --output "$RUN_DIR/baseline.json"
```

候选注册表评估是独立的 50 分模式，不得与正式 OAS 静态分混算：

```bash
node "$PONTX_REPO/.agents/skills/pontx-metadata-quality-loop/scripts/score-metadata.mjs" \
  --metadata-repo "$METADATA_WORKTREE" \
  --candidate-registry-only \
  --output "$RUN_DIR/candidate-baseline.json"
```

普通静态/动态报告在注册表存在时会附带只读 `candidateRegistry` 诊断，但既有
`staticScore`、`dynamicScore`、`score` 和正式 OAS `findings` 语义不变。只有显式
`--candidate-registry-only` 报告可作为 `candidate-registry` score mode 进入状态机比较。

正式动态评估入口（100 分制）：

```bash
node "$PONTX_REPO/.agents/skills/pontx-metadata-quality-loop/scripts/score-metadata.mjs" \
  --metadata-repo "$METADATA_WORKTREE" \
  --spec-module "$PONTX_REPO/packages/spec/lib/index.js" \
  --pontx-module "$PONTX_REPO/packages/pontx/lib/index.js" \
  --dynamic-benchmark "$PONTX_REPO/.agents/skills/pontx-metadata-quality-loop/benchmarks/smoke.json" \
  --dynamic-adapter codex \
  --runs-per-case 3 \
  --output "$RUN_DIR/baseline.json"
```

没有真实 benchmark traces 的 `score` 只是 provisional 投影，不能与动态总分比较，也不能作为发布质量结论。动态评测只用 fixture、dry-run 和隔离工作区，不调用生产 API，不传真实凭证。

## 2. 隔离三个角色

- **scorer**：只读评分、定位 findings、核查证据和仓库门禁；不得修文件。
- **improver**：只改独立 Metadata worktree；不得改评估器、权重、benchmark、测试期望或 state。
- **evaluator-auditor**：只在 Pontx 中复现和修正评估器问题；不得顺手修改 Metadata。

主控 Agent 持有 state 和合并权。不要接受 improver 自报分数；候选提交后必须由独立 scorer 重跑。

## 3. 每轮只做一个有界候选

1. 从 accepted Metadata commit 创建候选 worktree。
2. scorer 选择收益高、证据充分的一组 findings，并列出 exact paths、证据和禁止修改范围。
3. improver 只使用权威文档、已批准请求/响应示例或可复现观测值。不要猜示例、描述、错误响应、枚举语义或动态 ID。
4. 同步修改 `zh-CN` 和所有 locale；更新 approved hashes；重建 catalog。
5. 跑 metadata gates：

```bash
node scripts/test-locales.mjs
node scripts/lint-locales.mjs
node scripts/build-catalog.mjs
node scripts/verify-specs.mjs
git diff --check
```

6. improver 提交一个可审阅 commit；独立 scorer 使用同一 fingerprint 评分候选。
7. 只有满足接受标准才合并；否则归档证据并丢弃候选。

## 4. 接受标准

候选需要同时满足：

- 静态模式至少提升 `0.01/50`；动态模式总分至少提升 `0.5/100`；
- Critical 不增加，任何评分维度不回退；
- deterministic CLI coverage 不回退；
- 已通过的动态 case 不得失败；每个可执行 case 至少 3 条真实 trace；
- locale、hash、catalog、spec 和受影响消费者门禁全部通过；
- diff 只包含有证据的 Metadata 及必要生成物。

finding 数减少但四舍五入后分数不增加，仍按未提分丢弃。准确但未计分的变化应上报 evaluator concern，不能绕过门槛合并进“提分”循环。

## 5. 评估器 concern

只有以下情况进入 evaluator-auditor：假阳性、假阴性、解析丢失、非确定性、权重明显失真或规则无法采取行动。

Concern 必须包含最小复现、期望/实际行为、受影响路径、权威证据和量化影响。Auditor 先写失败测试，再做窄修复，并用正例、反例和历史 Metadata 校准。当前分数会提高不是修改规则的理由；安全边界不能为提分而放宽。

评估器、benchmark、runtime 或 score mode 改变后，重新评分 accepted Metadata 并开启新 epoch。

## 6. 停止条件和最终报告

- 达到满分时停止；或
- 同一 epoch 连续 3 个可比较候选未达到门槛，且没有成立的 evaluator concern 时停止。

最终报告简洁列出：初始/最终总分与维度、findings/Critical、动态 case 和 coverage、接受/拒绝 commits、三次停滞原因、评估器修复、剩余证据缺口，以及 push/PR/部署状态。

循环授权不自动包含合并 `main`、生产部署、npm 发布或真实 API 调用；这些动作需要用户单独授权。
