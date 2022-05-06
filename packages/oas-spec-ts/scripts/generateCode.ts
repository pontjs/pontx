import * as fs from "fs";
import * as path from "path";

const generateClassCode = (clazz: {
  description: string;
  name: string;
  properties: Array<{
    name: string;
    required: boolean;
    desc: string;
    type: string;
  }>;
}) => {
  const topDesc = clazz.description
    ? `/**
${clazz.description
  ?.split("\n")
  .map((line) => {
    return ` * ${line}`;
  })
  .join("\n")}
   */
`
    : "";
  const bodyCode = `export class ${clazz.name === "SchemaObject" ? "SchemaObject extends JsonSchema" : clazz.name} {
${clazz.properties
  .map((prop) => {
    return `
${
  prop.desc
    ? `	/**
	${prop.desc
    ?.split("\n")
    .map((line) => {
      return ` * ${line}`;
    })
    .join("\n")}
   */`
    : ""
}
  ${prop.name}${prop.required ? "" : "?"}: ${prop.type};
`;
  })
  .join("\n")}
}`;
  return topDesc + bodyCode;
};

const args = process.argv.slice(2);
const [sourceFile, outFile] = args;
const currentDir = process.cwd();

const defStr = fs.readFileSync(path.join(currentDir, sourceFile), "utf8");
const defsJson = JSON.parse(defStr);
const code = defsJson
  .map((clazz) => {
    return generateClassCode(clazz);
  })
  .join("\n\n");
const importer = `import { JsonSchema } from "../JsonSchema";
`;
fs.writeFileSync(path.join(currentDir, outFile), importer + code, "utf8");
