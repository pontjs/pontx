import * as fs from "fs-extra";
import * as path from "path";
import * as os from "os";

class LocalDictManager {
  static singleInstance = null as LocalDictManager;

  static getSingleInstance(localDictDir?: string) {
    if (!LocalDictManager.singleInstance) {
      LocalDictManager.singleInstance = new LocalDictManager(localDictDir);
      return LocalDictManager.singleInstance;
    }

    return LocalDictManager.singleInstance;
  }

  constructor(private localDictDir = os.homedir() + "/.pont") {
    if (this.localDictDir && !fs.pathExistsSync(this.localDictDir)) {
      fs.mkdirpSync(this.localDictDir);
    }
  }

  isFileExists(filename: string) {
    const filePath = path.join(this.localDictDir, filename);

    return fs.existsSync(filePath);
  }

  removeFile(filename: string) {
    const filePath = path.join(this.localDictDir, filename);

    if (fs.existsSync(filePath)) {
      return fs.remove(filePath);
    }
  }

  loadJsonFileIfExistsSync(filename: string) {
    const fileContent = this.loadFileIfExistsSync(filename);

    if (fileContent) {
      return JSON.parse(fileContent);
    }

    return false;
  }

  loadFileIfExistsSync(filename: string) {
    const filePath = path.join(this.localDictDir, filename);

    if (fs.existsSync(filePath)) {
      const fileContent = fs.readFileSync(filePath, {
        encoding: "utf8",
      });

      return fileContent;
    }

    return false;
  }

  async loadFileIfExists(filename: string) {
    const filePath = path.join(this.localDictDir, filename);

    if (fs.existsSync(filePath)) {
      const fileContent = await fs.readFile(filePath, {
        encoding: "utf8",
      });

      return fileContent;
    }

    return false;
  }

  async saveFile(filename: string, content: string) {
    const filePath = path.join(this.localDictDir, filename);
    const dirname = path.dirname(filePath);

    if (!fs.pathExistsSync(dirname)) {
      fs.mkdirpSync(dirname);
    }

    return fs.writeFileSync(filePath, content);
  }

  saveFileSync(filename: string, content: string) {
    const filePath = path.join(this.localDictDir, filename);
    const dirname = path.dirname(filePath);

    if (!fs.pathExistsSync(dirname)) {
      fs.mkdirpSync(dirname);
    }

    return fs.writeFileSync(filePath, content);
  }

  async appendFile(filename: string, content: string) {
    const filePath = path.join(this.localDictDir, filename);
    const isExists = await fs.pathExists(filePath);
    if (isExists) {
      return await fs.appendFile(filePath, content);
    }
  }

  getFilePath(filename: string) {
    return path.join(this.localDictDir, filename);
  }
}

const PontDictManager = LocalDictManager.getSingleInstance;

export { PontDictManager };
