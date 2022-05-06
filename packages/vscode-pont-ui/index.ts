import * as path from "path";
import * as fs from "fs";

module.exports.getHTMLForVSCode = (urlJoin: Function, cspSource) => {
  const scriptUri = urlJoin("dist/assets/index.js");
  const styleResetUri = urlJoin("dist/assets/index.css");
  const html = fs.readFileSync(path.join(__dirname, "../dist/index.html"), "utf8");

  const htmlResult = html
    .replace("/assets/index.js", scriptUri)
    .replace("/assets/index.css", styleResetUri)
    .replace(/\{cspSource\}/g, cspSource);

  return htmlResult;
};

module.exports.getRootUri = () => {
  return path.join(__dirname, "../dist/assets");
};
