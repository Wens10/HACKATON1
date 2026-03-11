import {join} from "path";
import {workingDirPath} from "../core";

export const EMAIL_REGEX =
  /^(?:(?:[\w!#$%&'*+/=?^`{|}~-]+(?:\.[\w!#$%&'*+/=?^`{|}~-]+)*)|"(?:[!#-[\]-~]|\\[ -~\t])*")@((?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)(?:\.(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?))*)$/;

export const DEFAULT_EJS_STATIC_PAGE_DIR = join(
  workingDirPath,
  "/views/static",
);
export const DEFAULT_EJS_DYNAMIC_PAGE_DIR = join(
  workingDirPath,
  "/views/dynamic",
);
export const DEFAULT_EJS_DIST_DIR = join(workingDirPath, "/public");
export const DEFAULT_EJS_COMPONENT_DIR = join(
  workingDirPath,
  "/views/components",
);
