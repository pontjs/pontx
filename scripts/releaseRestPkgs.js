// npm run clean-lock &&
// lerna version patch --no-private --yes --message 'chore: publish' && lerna exec --ignore vscode-pontx --ignore vscode-pontx-media --ignore pontx-report-plugin --ignore jsonschema-form --ignore react-app --ignore node-app --ignore react-app-hooks --ignore react-app-oas3 --ignore alicloud-sdk --stream -- npm publish --registry //registry.npmjs.org --otp $1

const { execSync, exec } = require("child_process");

const npmPkgs = ["oas-spec-ts", "pontx-meta-fetch-plugin"];

async function main() {
  let errPkgs = [];

  const promises = npmPkgs.map((pkg) => {
    try {
      return new Promise((resolve, reject) => {
        console.log(`开始发布 ${pkg} 包`);
        exec(
          `lerna exec --scope ${pkg} -- npm publish --registry //registry.npmjs.org`,
          {
            stdio: [0, 1, 2],
          },
          (err, stdout, stderr) => {
            if (err) {
              reject(err);
            }
            if (stderr) {
              reject(stderr);
            }

            console.log(`publish ${pkg} success!`);
            resolve(stdout);
          },
        );
      });
    } catch (e) {
      errPkgs.push(pkg);
      return Promise.resolve();
    }
  });
  try {
    await Promise.all(promises);

    if (errPkgs.length) {
      console.error(`Error packages: ${errPkgs.join(", ")}`);
      process.exit(1);
    } else {
      console.log("publish success");
    }
  } catch (e) {}
}

main();
