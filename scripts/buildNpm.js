const { execSync } = require("child_process");
let allPkgs = execSync(`lerna ls --ignore private`, { encoding: "utf-8" }).split("\n").filter(Boolean);

const skipPkgs = [];

allPkgs = allPkgs.filter((pkg) => !skipPkgs.includes(pkg));

const extraPkgs = [
  "pontx-oas2-parser-plugin",
  "pontx-oas3-parser-plugin",
  "pontx-spec-diff",
  "pontx-spec",
  "pontx-sdk-core",
];

function buildPkgs(pkgs) {
  let errPkgs = [];

  pkgs.map((pkg) => {
    try {
      execSync(`lerna exec --scope ${pkg} -- npm run build`, {
        stdio: [0, 1, 2],
      });
    } catch (e) {
      errPkgs.push(pkg);
    }
  });

  return errPkgs;
}

function buildExtraPkgs(extraPkgs) {
  let errPkgs = [];

  extraPkgs.map((pkg) => {
    try {
      execSync(`lerna exec --scope ${pkg} -- npm run build:extra`, {
        stdio: [0, 1, 2],
      });
    } catch (e) {
      errPkgs.push(pkg);
    }
  });

  return errPkgs;
}

function main() {
  const errPkgs = buildPkgs(allPkgs);
  buildExtraPkgs(extraPkgs);

  if (errPkgs.length) {
    console.log("构建失败的包：", errPkgs.join(", "));
    console.log("重试中...");

    const secondErrors = buildPkgs(errPkgs);
    if (secondErrors.length) {
      console.log("重试失败的包：", secondErrors.join(", "));
      process.exit(1);
    } else {
      console.log("重试成功");
    }
  }
}

main();
