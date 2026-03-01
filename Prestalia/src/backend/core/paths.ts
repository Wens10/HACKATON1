import {join} from "path";

export const workingDirPath = process.cwd();
export const certChallengesDirPath = join(workingDirPath, "cert-challenges");
