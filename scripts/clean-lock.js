const child_process = require("child_process");

try {
  child_process.execSync("rm package-lock.json");
  child_process.execSync("rm packages/**/package-lock.json");
  child_process.execSync("rm plugins/**/package-lock.json");
} catch (e) {}
