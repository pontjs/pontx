const { execSync, exec } = require("child_process");
const fs = require("fs-extra");
const path = require("path");

async function main() {
  const patchVersion = execSync(`lerna version patch --no-private --yes --message 'chore: publish'`, {
    encoding: "utf-8",
  });
  fs.writeFileSync(path.join(__dirname, "dev", "patchVersion.txt"), patchVersion);
  console.log("packages version changes: \n" + patchVersion);
}

main();
