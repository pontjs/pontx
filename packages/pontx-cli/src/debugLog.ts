const chalk = require("chalk");
const { Signale } = require("signale");

const logger = new Signale();
logger.config({
  displayTimestamp: true,
});

export { logger };

export function cliLog(message: string, logType: string) {
  switch (logType) {
    case "info": {
      logger.info(message);
      break;
    }
    case "error": {
      logger.error(message);
      // process.exit(1);
      break;
    }
  }
}
