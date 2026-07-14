import fs from "fs";
import path from "path";
import os from "os";
import { execSync } from "child_process";

const projectRoot = path.resolve(import.meta.dirname, "..");
const authPath = path.join(
  os.homedir(),
  "Library/Application Support/com.vercel.cli/auth.json"
);

if (!fs.existsSync(authPath)) {
  console.error("Vercel auth introuvable. Connectez-vous via le MCP Vercel.");
  process.exit(1);
}

const { token } = JSON.parse(fs.readFileSync(authPath, "utf8"));
const teamId = "team_GVDW3dt7kE0ajlRVRWNphUFa";
const projectName = "ul-tools";

function run(cmd, env = {}) {
  execSync(cmd, {
    cwd: projectRoot,
    stdio: "inherit",
    env: { ...process.env, VERCEL_TOKEN: token, ...env },
  });
}

try {
  run(`npx vercel@latest project add ${projectName} --scope uncoloredkngs-projects --yes`);
} catch {
  console.log("Projet déjà existant ou création ignorée, on continue…");
}

run(`npx vercel@latest link --project ${projectName} --scope uncoloredkngs-projects --yes`);
run(`npx vercel@latest deploy --prod --yes --scope uncoloredkngs-projects`);

try {
  run(`npx vercel@latest git connect --yes --scope uncoloredkngs-projects`);
} catch {
  console.log("Connexion Git à faire manuellement si nécessaire.");
}

console.log("\nDéploiement terminé.");
