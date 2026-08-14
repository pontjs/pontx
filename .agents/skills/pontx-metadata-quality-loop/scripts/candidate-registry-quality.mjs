/**
 * @author OpenAI
 * @description 可复现、只读的候选 API 注册表质量评估器
 */

import fs from "node:fs/promises";
import path from "node:path";

export const CANDIDATE_DIMENSIONS = [
  { id: "candidate.identity-boundary", title: "候选身份与产品边界", weight: 8 },
  { id: "candidate.localization-action", title: "双语与下一步可行动性", weight: 7 },
  { id: "candidate.evidence", title: "证据权威性与可复现性", weight: 15 },
  { id: "candidate.gates", title: "准入门槛一致性", weight: 10 },
  { id: "candidate.freshness", title: "证据新鲜度", weight: 5 },
  { id: "candidate.admission", title: "候选与正式目录隔离", weight: 5 },
];
const GATES = ["authority", "redistribution", "contract", "transport", "risk", "sdkCli"];
const GATE_STATUSES = new Set(["passed", "pending", "blocked"]);
const STAGES = new Set(["audit-required", "protocol-blocked", "compliance-blocked"]);
const AUTHORITY_EVIDENCE = new Set(["docs", "spec", "source"]);
const PLACEHOLDER = /^(?:tbd|todo|待定|待补充|unknown|n\/a)$/i;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

async function isFile(filePath) {
  try {
    return (await fs.stat(filePath)).isFile();
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
}

function round(value) {
  return Math.round(value * 100) / 100;
}

function isObject(value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function isText(value, minimum = 1) {
  return typeof value === "string" && value.trim().length >= minimum && !PLACEHOLDER.test(value.trim());
}

function isLocalized(value, minimum = { zh: 1, en: 1 }) {
  return isObject(value) && isText(value.zh, minimum.zh) && isText(value.en, minimum.en);
}

function parseDate(value) {
  if (!DATE.test(value ?? "")) return null;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== value ? null : parsed;
}

function withinDays(earlier, later, maximum) {
  if (!earlier || !later || earlier > later) return false;
  return (later.valueOf() - earlier.valueOf()) / 86_400_000 <= maximum;
}

function validHttps(value) {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function isDiscoveryOnly(value) {
  try {
    const hostname = new URL(value).hostname.toLowerCase();
    return hostname === "explinks.com" || hostname.endsWith(".explinks.com");
  } catch {
    return true;
  }
}

function immutableContract(source) {
  if (!isObject(source) || source.mutableSource === true || !isText(source.revision)) return false;
  return /^[0-9a-f]{40}(?:[0-9a-f]{24})?$/i.test(source.revision)
    && validHttps(source.url) && source.url.includes(encodeURIComponent(source.revision));
}

function finding(ruleId, location, message, remediation, severity = "error", product) {
  return {
    ruleId,
    severity,
    path: location,
    message,
    remediation,
    ...(product ? { product } : {}),
  };
}

function createRecorder() {
  const counters = new Map(CANDIDATE_DIMENSIONS
    .map((item) => [item.id, { ...item, checked: 0, passed: 0 }]));
  const findings = [];
  const record = (dimension, passed, diagnostic) => {
    const counter = counters.get(dimension);
    counter.checked += 1;
    if (passed) counter.passed += 1;
    else if (diagnostic) findings.push(diagnostic);
  };
  const finish = () => {
    const dimensions = [...counters.values()].map((item) => {
      const coverage = item.checked ? item.passed / item.checked : 0;
      return { ...item, score: round(item.weight * coverage), coverage: round(coverage) };
    });
    return {
      candidateScore: round(dimensions.reduce((sum, item) => sum + item.score, 0)),
      maxScore: 50,
      dimensions,
      findings,
      criticals: findings.filter((item) => item.severity === "critical"),
    };
  };
  return { record, finish };
}

function productPath(index, product) {
  return `$.products[${index}]${isText(product?.slug) ? `(${product.slug})` : ""}`;
}

function evaluateIdentityAndLocalization(registry, products, record) {
  record("candidate.identity-boundary", registry?.version === 1,
    finding("candidate.registry.version", "$.version", "候选注册表版本缺失或不受支持。", "使用受支持的 version: 1。"));
  record("candidate.identity-boundary", products.length > 0,
    finding("candidate.registry.products", "$.products", "候选注册表没有产品记录。", "至少加入一个有权威证据的候选产品。", "critical"));
  record("candidate.localization-action", isLocalized(registry?.admissionPolicy, { zh: 12, en: 24 }),
    finding("candidate.policy.localized", "$.admissionPolicy", "候选准入政策缺少可理解的中英文说明。", "补齐中英文政策，并说明候选不等于正式收录。"));
  const seen = new Set();
  for (const [index, product] of products.entries()) {
    const location = productPath(index, product);
    const validSlug = SLUG.test(product?.slug ?? "") && !seen.has(product.slug);
    record("candidate.identity-boundary", validSlug,
      finding("candidate.identity.slug", `${location}.slug`, "候选 slug 缺失、格式不稳定或重复。", "填写唯一的 kebab-case 稳定标识。", "error", product?.slug));
    if (isText(product?.slug)) seen.add(product.slug);
    record("candidate.identity-boundary", isText(product?.provider) && isText(product?.category),
      finding("candidate.identity.owner", location, "候选缺少供应商或类别。", "填写非空 provider 与 category。", "error", product?.slug));
    record("candidate.identity-boundary", isObject(product?.priority) && isText(product.priority.group)
      && Number.isInteger(product.priority.rank) && product.priority.rank > 0
      && (product.priority.score === undefined
        || (Number.isFinite(product.priority.score) && product.priority.score >= 0 && product.priority.score <= 100)),
    finding("candidate.identity.priority", `${location}.priority`, "候选优先级缺少通用分组、正整数排名或有效可选分数。", "补齐 group、rank，并将可选 score 限制在 0–100。", "error", product?.slug));
    record("candidate.identity-boundary", isLocalized(product?.boundary, { zh: 16, en: 32 }),
      finding("candidate.boundary.localized", `${location}.boundary`, "产品边界缺少实质性的中英文定义。", "分别说明完整产品面、明确排除项或供应商定义的边界。", "error", product?.slug));
    record("candidate.localization-action", isLocalized(product?.name),
      finding("candidate.name.localized", `${location}.name`, "候选名称缺少中英文值。", "补齐 name.zh 与 name.en。", "error", product?.slug));
    record("candidate.localization-action", isLocalized(product?.nextAction, { zh: 10, en: 20 }),
      finding("candidate.action.localized", `${location}.nextAction`, "下一步缺少具体、可行动的中英文说明。", "写明要取得的证据、要解除的门槛或要完成的发布动作。", "error", product?.slug));
  }
}

function evaluateEvidence(registry, products, record) {
  const snapshot = parseDate(registry?.snapshotDate);
  record("candidate.freshness", !!snapshot,
    finding("candidate.freshness.snapshot", "$.snapshotDate", "快照日期缺失或不是有效 YYYY-MM-DD。", "记录可复现审计快照日期。"));
  for (const [index, product] of products.entries()) {
    const location = productPath(index, product);
    const evidence = Array.isArray(product?.evidence) ? product.evidence : [];
    const urls = evidence.map((item) => item?.url);
    record("candidate.evidence", evidence.length >= 2 && urls.every(validHttps)
      && new Set(urls).size === urls.length,
    finding("candidate.evidence.reproducible", `${location}.evidence`, "证据不足、URL 非 HTTPS 或存在重复。", "至少提供两个唯一、可直接复查的 HTTPS 证据 URL。", "error", product?.slug));
    record("candidate.evidence", evidence.some((item) => AUTHORITY_EVIDENCE.has(item?.kind))
      && evidence.every((item) => validHttps(item?.url) && !isDiscoveryOnly(item.url)),
    finding("candidate.evidence.authoritative", `${location}.evidence`, "证据缺少供应商文档、规范或源码，或引用了仅供发现的聚合站。", "用供应商官方 docs/spec/source URL 替换发现线索。", "error", product?.slug));
    record("candidate.evidence", new Set(evidence.map((item) => item?.kind)
      .filter((value) => isText(value))).size >= 2,
      finding("candidate.evidence.diversity", `${location}.evidence`, "证据类型单一，无法交叉核对契约、协议或许可。", "至少组合两类证据，例如 docs + spec、protocol 或 license。", "warning", product?.slug));

    const contractPassed = product?.gateStatus?.contract === "passed";
    record("candidate.evidence", !contractPassed || isObject(product?.contractSource),
      finding("candidate.contract.source", `${location}.contractSource`, "contract 门槛已通过，但没有可复查的契约来源。", "添加 contractSource、观测日期、revision 和操作数量。", "error", product?.slug));
    record("candidate.evidence", !contractPassed || immutableContract(product?.contractSource),
      finding("candidate.contract.immutable", `${location}.contractSource`, "contract 门槛已通过，但契约来源可变或 revision 未固定在 URL 中。", "固定不可变上游 revision，并让 contractSource.url 直接包含该 revision。", "error", product?.slug));
    record("candidate.evidence", !contractPassed || (validHttps(product?.contractSource?.url)
      && Number.isInteger(product?.contractSource?.observedOperations)
      && product.contractSource.observedOperations > 0),
    finding("candidate.contract.observation", `${location}.contractSource`, "契约观测缺少有效 URL 或正整数操作数量。", "记录可复现 URL 与 observedOperations。", "error", product?.slug));

    const redistributionPassed = product?.gateStatus?.redistribution === "passed";
    record("candidate.evidence", !redistributionPassed
      || (evidence.some((item) => item?.kind === "license")
        && isText(product?.contractSource?.license)
        && product.contractSource.license !== "review-required"),
    finding("candidate.license.evidence", `${location}.contractSource.license`, "redistribution 门槛已通过，但缺少已批准许可及许可证据。", "记录明确 license，并添加上游 license 证据。", "error", product?.slug));

    const verified = parseDate(product?.verifiedAt);
    record("candidate.freshness", withinDays(verified, snapshot, 90),
      finding("candidate.freshness.verified", `${location}.verifiedAt`, "产品核验日期无效、晚于快照或比快照早超过 90 天。", "依据最新官方证据重新核验并更新 verifiedAt。", "warning", product?.slug));
    if (product?.contractSource) {
      const observed = parseDate(product.contractSource.observedAt);
      record("candidate.freshness", withinDays(observed, snapshot, 90),
        finding("candidate.freshness.contract", `${location}.contractSource.observedAt`, "契约观测日期无效、晚于快照或比快照早超过 90 天。", "重新获取固定契约并更新 observedAt。", "warning", product?.slug));
    }
  }
}

function evaluateGates(products, record) {
  for (const [index, product] of products.entries()) {
    const location = productPath(index, product);
    const status = isObject(product?.gateStatus) ? product.gateStatus : {};
    const exactGates = Object.keys(status).sort().join("\n") === [...GATES].sort().join("\n")
      && GATES.every((gate) => GATE_STATUSES.has(status[gate]));
    record("candidate.gates", exactGates,
      finding("candidate.gate.shape", `${location}.gateStatus`, "门槛集合不完整或状态不是 passed/pending/blocked。", `仅填写 ${GATES.join(", ")} 六项门槛。`, "error", product?.slug));
    record("candidate.gates", status.authority === "passed",
      finding("candidate.gate.authority", `${location}.gateStatus.authority`, "候选尚未通过权威来源门槛。", "取得供应商官方证据后再把产品纳入候选注册表。", "error", product?.slug));
    const blocked = GATES.filter((gate) => status[gate] === "blocked");
    const expectedStage = status.transport === "blocked" ? "protocol-blocked"
      : status.risk === "blocked" ? "compliance-blocked" : "audit-required";
    record("candidate.gates", STAGES.has(product?.stage) && product.stage === expectedStage,
      finding("candidate.gate.stage", `${location}.stage`, "stage 与 blocked 门槛不一致。", `将 stage 设为 ${expectedStage}，或修正缺少证据的 gateStatus。`, "error", product?.slug));
    const blockers = Array.isArray(product?.blockers) ? product.blockers : [];
    record("candidate.gates", blockers.length > 0 && blocked.every((gate) =>
      blockers.some((item) => item?.gate === gate)),
    finding("candidate.gate.blocker", `${location}.blockers`, "未解释候选未获准原因，或有 blocked 门槛缺少对应说明。", "至少解释每个 blocked 门槛，并保留具体补救路径。", "error", product?.slug));
    record("candidate.gates", blockers.every((item) => GATES.includes(item?.gate)
      && status[item.gate] !== "passed" && isLocalized(item, { zh: 8, en: 16 })),
    finding("candidate.gate.blocker-consistency", `${location}.blockers`, "blocker 指向已通过/未知门槛，或缺少中英文说明。", "只为 pending/blocked 门槛添加等价的中英文 blocker。", "error", product?.slug));
  }
}

async function evaluateAdmission(metadataRepo, registry, products, record) {
  const roadmap = registry?.sourceRoadmap;
  const roadmapPath = isText(roadmap) ? path.resolve(metadataRepo, roadmap) : "";
  const insideRepo = roadmapPath.startsWith(`${metadataRepo}${path.sep}`);
  record("candidate.admission", insideRepo && await isFile(roadmapPath),
    finding("candidate.admission.roadmap", "$.sourceRoadmap", "增长路线图缺失、越出仓库或不可复查。", "指向 Metadata 仓库内存在的路线图文件。"));
  const sourcePath = path.join(metadataRepo, "catalog/source.json");
  let admitted = null;
  if (await isFile(sourcePath)) {
    try {
      const source = JSON.parse(await fs.readFile(sourcePath, "utf8"));
      if (Array.isArray(source?.apis)) {
        admitted = new Set(source.apis.map((item) => item?.slug).filter((value) => isText(value)));
      }
    } catch {
      admitted = null;
    }
  }
  record("candidate.admission", admitted instanceof Set,
    finding("candidate.admission.catalog", "catalog/source.json", "无法读取正式目录 slug 列表。", "提供结构有效且含 apis 数组的 catalog/source.json。", "critical"));
  for (const [index, product] of products.entries()) {
    const location = productPath(index, product);
    record("candidate.admission", product?.admissionDecision === "not-approved",
      finding("candidate.admission.decision", `${location}.admissionDecision`, "候选记录声称已获正式批准。", "候选注册表只能使用 not-approved；获准产品应按正式流程迁入 source.json。", "critical", product?.slug));
    record("candidate.admission", !(admitted?.has(product?.slug)),
      finding("candidate.admission.overlap", `${location}.slug`, "同一 slug 同时存在于候选注册表和正式目录。", "完成迁移后从候选注册表移除，确保单一准入状态。", "critical", product?.slug));
    record("candidate.admission", !GATES.every((gate) => product?.gateStatus?.[gate] === "passed"),
      finding("candidate.admission.ready", `${location}.gateStatus`, "六项门槛均已通过，但记录仍停留在候选区。", "启动正式准入审查并迁移，或把尚未证实的门槛恢复为 pending。", "warning", product?.slug));
  }
}

export async function scoreCandidateRegistry(metadataRepo) {
  const absoluteRepo = path.resolve(metadataRepo);
  const registryPath = path.join(absoluteRepo, "catalog/api-collection-candidates.json");
  if (!await isFile(registryPath)) return { present: false, path: registryPath };
  let registry;
  try {
    registry = JSON.parse(await fs.readFile(registryPath, "utf8"));
  } catch {
    const invalid = finding("candidate.registry.loadable", registryPath,
      "候选注册表不是可解析的 JSON。", "修复 JSON 语法后重新评分。", "critical");
    return {
      present: true,
      path: registryPath,
      candidateScore: 0,
      maxScore: 50,
      dimensions: CANDIDATE_DIMENSIONS.map((item) => ({
        ...item, score: 0, coverage: 0, checked: 0, passed: 0,
      })),
      findings: [invalid],
      criticals: [invalid],
      metadata: {
        version: null, snapshotDate: null, productCount: 0, generatedAt: new Date().toISOString(),
      },
    };
  }
  const products = Array.isArray(registry?.products) ? registry.products : [];
  const { record, finish } = createRecorder();
  evaluateIdentityAndLocalization(registry, products, record);
  evaluateEvidence(registry, products, record);
  evaluateGates(products, record);
  await evaluateAdmission(absoluteRepo, registry, products, record);
  return {
    present: true,
    path: registryPath,
    ...finish(),
    metadata: {
      version: registry?.version ?? null,
      snapshotDate: registry?.snapshotDate ?? null,
      productCount: products.length,
      generatedAt: new Date().toISOString(),
    },
  };
}
