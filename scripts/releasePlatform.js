const childProcess = require("child_process");
const path = require("path");

childProcess.execSync("npm run build", {
  cwd: path.join(__dirname, "../packages/pontx-platform"),
  stdio: [0, 1, 2],
});
