import {availableParallelism} from "os";
import {Cluster} from "cluster";
import {join} from "path";
import {watchCertificates} from "../utils/master/functions/watchers";
import {
  compressFiles,
  deleteCompressedFiles,
  error,
  FILE_EXTENSIONS_TO_COMPRESS,
  log,
  workingDirPath,
} from "@server/core";
import exitClusterEvent from "../events/master/cluster/exit";
import messageClusterEvent from "../events/master/cluster/message";
import {ensureSiteCertificate} from "../utils/master/functions/certs";
import {DatabaseSync} from "node:sqlite";
import "dotenv/config";
import {existsSync, readFileSync, writeFileSync} from "fs";
import {randomBytes} from "crypto";

export default (async (cluster) => {
  if (!cluster.workers) return log("Liste des workers manquante");

  if (process.env["NODE_ENV"] === "development") {
    const DEV_ARGON2_SECRET_PATH = join(workingDirPath, ".argon2_dev_secret"),
      DEV_JWT_SECRET_PATH = join(workingDirPath, ".jwt_dev_secret");

    if (existsSync(DEV_ARGON2_SECRET_PATH))
      process.env["ARGON2_SECRET"] = readFileSync(
        DEV_ARGON2_SECRET_PATH,
        "utf-8",
      );
    else {
      const secret = randomBytes(32).toString("hex");

      writeFileSync(DEV_ARGON2_SECRET_PATH, secret, {encoding: "utf-8"});

      process.env["ARGON2_SECRET"] = secret;

      log(
        `Génération du secret "${secret}" pour argon2 dans le fichier ${DEV_ARGON2_SECRET_PATH}`,
      );
    }

    if (existsSync(DEV_JWT_SECRET_PATH))
      process.env["JWT_SECRET"] = readFileSync(DEV_JWT_SECRET_PATH, "utf-8");
    else {
      const secret = randomBytes(32).toString("hex");

      writeFileSync(DEV_JWT_SECRET_PATH, secret, {encoding: "utf-8"});

      process.env["JWT_SECRET"] = secret;

      log(
        `Génération du secret "${secret}" pour jwt dans le fichier ${DEV_JWT_SECRET_PATH}`,
      );
    }
  }

  if (!process.env["ARGON2_SECRET"])
    throw new Error(
      "ARGON2_SECRET est obligatoire dans le .env pour lancer en mode production!",
    );

  if (!process.env["JWT_SECRET"])
    throw new Error(
      "JWT_SECRET est obligatoire dans le .env pour lancer en mode production!",
    );

  const db = new DatabaseSync(join(workingDirPath, "database.db"));

  db.exec(
    `
      PRAGMA journal_mode = WAL;
      PRAGMA synchronous = NORMAL;
      PRAGMA foreign_keys = ON;

      CREATE TABLE categories (
        id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
        created_at DATETIME NOT NULL DEFAULT (DATETIME('now', 'subsec', 'utc')),
        name VARCHAR(100) NOT NULL,
        logo VARCHAR(300)
      );

      CREATE TABLE IF NOT EXISTS users (
        id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
        created_at DATETIME NOT NULL DEFAULT (DATETIME('now', 'subsec', 'utc')),
        name VARCHAR(100) NOT NULL,
        email VARCHAR(320) NOT NULL,
        password VARCHAR(512) NOT NULL
      );

      CREATE TABLE IF NOT EXISTS providers (
        id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
        created_at DATETIME NOT NULL DEFAULT (DATETIME('now', 'subsec', 'utc')),
        valided BOOLEAN,
        tel VARCHAR(20),
        category INTEGER,
        descr VARCHAR(1000),
        exp INTEGER,
        price FLOAT,
        days INTEGER,
        FOREIGN KEY(category) REFERENCES categories(id)
      );

      CREATE TABLE IF NOT EXISTS certificates (
        id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
        created_at DATETIME NOT NULL DEFAULT (DATETIME('now', 'subsec', 'utc')),
        name VARCHAR(100),
        author INTEGER NOT NULL,
        path VARCHAR(300) NOT NULL,
        valided BOOLEAN,
        FOREIGN KEY(author) REFERENCES providers(id)
      );

      CREATE TABLE reservations (
        id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
        created_at DATETIME NOT NULL DEFAULT (DATETIME('now', 'subsec', 'utc')),
        author INTEGER NOT NULL,
        provider INTEGER NOT NULL,
        price FLOAT NOT NULL,
        date DATETIME NOT NULL,
        FOREIGN KEY(author) REFERENCES users(id),
        FOREIGN KEY(provider) REFERENCES providers(id)
      );
    `,
  );

  log(`Processus primaire lancé`);

  // Check si le certificat est bientôt expiré et si c'est le cas le met à jour et le renvoi à tous les workers
  setInterval(async () => {
    if (cluster.workers) ensureSiteCertificate(cluster.workers);
  }, 21600000 /* 6 heures */);

  await ensureSiteCertificate(cluster.workers, true);

  try {
    const publicDirPath = join(workingDirPath, "public"),
      errorsDirPath = join(workingDirPath, "errors");

    await deleteCompressedFiles(publicDirPath);
    await compressFiles(publicDirPath, FILE_EXTENSIONS_TO_COMPRESS);

    await deleteCompressedFiles(errorsDirPath);
    await compressFiles(errorsDirPath, FILE_EXTENSIONS_TO_COMPRESS);

    log("Site chargé");
  } catch (err) {
    error("Erreur lors de la compression des fichiers:", err);
  }

  watchCertificates();

  // Fork des workers
  for (let i = 0; i < availableParallelism(); i++) cluster.fork();

  cluster
    // Relance automatiquement le worker à ça mort
    .on("exit", exitClusterEvent.bind(null, cluster))
    .on("message", messageClusterEvent);
}) satisfies (
  // eslint-disable-next-line no-unused-vars
  cluster: Cluster,
) => void;
