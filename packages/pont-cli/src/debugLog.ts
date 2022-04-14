const chalk = require("chalk");
const log = console.log;

export function bindInfo(onLog) {
  return (message: string) => {
    onLog && onLog(message);
    info(message);
  };
}

export function info(info: string) {
  log(chalk.bold.blue(info));
}

export function error(info: string) {
  log(chalk.bold.red(info));
}

export function warn(info: string) {
  log(chalk.bold.yellow(info));
}

export function success(info: string) {
  log(chalk.bold.green(info));
}

export function cliLog(message: string, logType: string) {
  switch (logType) {
    case "info": {
      log(chalk.bold.blue(message));
      break;
    }
    case "error": {
      log(chalk.bold.red(message));
      process.exit(1);
      break;
    }
  }
  console.log(message);
}
