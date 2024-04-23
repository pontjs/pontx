const child_process = require("child_process");
const path = require("path");

try {
  child_process.execSync("rm package-lock.json", {
    cwd: path.join(__dirname + "../../"),
    stdio: [0, 1, 2],
  });
} catch (e) {}

try {
  child_process.execSync("rm packages/**/package-lock.json", {
    cwd: path.join(__dirname + "../../"),
    stdio: [0, 1, 2],
  });
} catch (e) {}

try {
  child_process.execSync("rm plugins/**/package-lock.json", {
    cwd: path.join(__dirname + "../../"),
    stdio: [0, 1, 2],
  });
} catch (e) {}

try {
  child_process.execSync("rm plugins/**/*/package-lock.json", {
    cwd: path.join(__dirname + "../../"),
    stdio: [0, 1, 2],
  });
} catch (e) {}

try {
  child_process.execSync("rm semix/**/package-lock.json", {
    cwd: path.join(__dirname + "../../"),
    stdio: [0, 1, 2],
  });
} catch (e) {}
