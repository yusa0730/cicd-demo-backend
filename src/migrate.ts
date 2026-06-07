import { execSync } from "node:child_process";

execSync("prisma migrate deploy", { stdio: "inherit" });
execSync("prisma db seed", { stdio: "inherit" });
