const fs = require("fs-extra");
const path = require("path");
const { execSync } = require("child_process");

let toBeReleasedPkgs = [];
let successPkgs = [];
let errorPkgs = [];

const record = () => {
  fs.writeFileSync(
    path.join(__dirname, "dev", "released.json"),
    JSON.stringify({ successPkgs, errorPkgs, toBeReleasedPkgs }, null, 2),
  );
};

try {
  const isExits = fs.existsSync(path.join(__dirname, "dev", "released.json"));
  if (isExits) {
    const released = fs.readFileSync(path.join(__dirname, "dev", "released.json"), "utf-8").trim();
    const result = JSON.parse(released);

    if (result.successPkgs?.length) {
      successPkgs = result.successPkgs;
    }
    if (result.errorPkgs?.length) {
      errorPkgs = result.errorPkgs;
    }
    if (result.toBeReleasedPkgs?.length) {
      toBeReleasedPkgs = result.toBeReleasedPkgs;
    }
  } else {
    const patchVersion = fs.readFileSync(path.join(__dirname, "dev", "patchVersion.txt"), "utf-8").trim();

    const pkgs = patchVersion
      ?.split("\n")
      .filter((pkg) => pkg.includes("- ") && pkg.includes(":"))
      .map((pkg) => {
        const [pre, version] = pkg.split(":");
        const [prefix, _name] = pre.split("- ");

        return _name.trim();
      });

    toBeReleasedPkgs = pkgs;
    record();
  }
} catch (e) {}

toBeReleasedPkgs.forEach((pkg) => {
  try {
    execSync(`lerna exec --scope ${pkg} -- npm publish --registry //registry.npmjs.org --ignore-scripts`, {
      stdio: [0, 1, 2],
    });
    successPkgs.push(pkg);
    toBeReleasedPkgs = toBeReleasedPkgs.filter((item) => item !== pkg);
    console.log(`publish ${pkg} success!`);
    record();
  } catch (e) {
    console.log(`publish ${pkg} error!`);
    errorPkgs.push(pkg);
    toBeReleasedPkgs = toBeReleasedPkgs.filter((item) => item !== pkg);
    record();
  }
});
