import { execSync } from "node:child_process";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const dist = resolve(root, "dist");
const server = "ubuntu@16.171.193.135:/var/www/horeca-dashboard";
const sshKey = "/home/ahmed/.ssh/aws-ubuntu-key.pem";

execSync(
  `rsync -rl --rsync-path='sudo rsync' -e 'ssh -i ${sshKey}' ${dist}/ ${server}/`,
  { stdio: "inherit", cwd: root }
);

for (const p of ["/", "/driver/", "/dispatcher/"]) {
  try {
    const code = execSync(
      `curl -s -o /dev/null -w '%{http_code}' https://horecasmartos.duckdns.org${p}`,
      { encoding: "utf8" }
    );
    console.log(`${p} -> ${code}`);
  } catch {
    console.error(`${p} -> FAILED`);
    process.exitCode = 1;
  }
}