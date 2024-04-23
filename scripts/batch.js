const child_process = require("child_process");

const cmd = process.argv[2];

console.log(`cmd found: ${cmd}`);

const result = child_process.execSync("npm run pkg-ls", {
  // stdio: [0, 1, 2],
});

if (result) {
  result
    .toString("utf-8")
    .split("\n")
    .forEach((line) => {
      if (line.startsWith(">")) {
        return;
      }
      if (line) {
        const pkgName = line.trim();

        try {
          child_process.execSync(`${cmd} ${pkgName}`, {
            stdio: [0, 1, 2],
          });
        } catch (e) {}
      }
    });
}
