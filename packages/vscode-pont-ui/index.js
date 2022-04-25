const path = require("path");
const fs = require("fs");

module.exports.getHTMLForVSCode = (urlJoin) => {
  const scriptUri = urlJoin("dist/assets/index.js");
  const styleResetUri = urlJoin("dist/assets/index.css");
  const html = fs.readFileSync(path.join(__dirname, "dist/index.html"), "utf8");

  return html
    .replace("/assets/index.js", scriptUri)
    .replace("/assets/index.css", styleResetUri);
};

module.exports.getRootUri = () => {
  return path.join(__dirname, "dist/assets");
};
