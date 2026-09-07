import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const dist = resolve(root, "dist");
const server = "ubuntu@16.171.193.135:/var/www/horeca-dashboard";
const sshKey = "/home/ahmed/.ssh/aws-ubuntu-key.pem";

const run = (cmd) => execSync(cmd, { stdio: "inherit", cwd: root });

const main = () => {
  for (const sub of ["driver", "dispatcher"]) {
    if (!existsSync(resolve(dist, sub))) {
      console.error(`Missing ${dist}/${sub}; run npm run build:all first`);
      process.exit(1);
    }
  }
  run(
    `rsync -rl --delete --rsync-path='sudo rsync' -e 'ssh -i ${sshKey}' --exclude 'driver/' --exclude 'dispatcher/' ${dist}/ ${server}/`
  );
  for (const sub of ["driver", "dispatcher"]) {
    run(
      `rsync -rl --delete --rsync-path='sudo rsync' -e 'ssh -i ${sshKey}' ${dist}/${sub}/ ${server}/${sub}/`
    );
  }
};

main();