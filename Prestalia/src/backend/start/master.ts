import {DatabaseSync} from "node:sqlite";
import {join} from "path";
import {workingDirPath} from "../core";
import "dotenv/config";

export default (() => {
  if (!process.env["ADMIN_DEFAULT_PASSWORD"])
    throw new Error(
      "ADMIN_DEFAULT_PASSWORD est obligatoire dans le .env pour lancer le projet!",
    );

  if (!process.env["ARGON2_SECRET"])
    throw new Error(
      "ARGON2_SECRET est obligatoire dans le .env pour lancer le projet!",
    );

  if (!process.env["JWT_SECRET"])
    throw new Error(
      "JWT_SECRET est obligatoire dans le .env pour lancer le projet!",
    );

  const db = new DatabaseSync(join(workingDirPath, "database.db"));

  db.exec(
    `
      PRAGMA journal_mode = WAL;
      PRAGMA synchronous = NORMAL;
      PRAGMA foreign_keys = ON;

      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
        created_at DATETIME NOT NULL DEFAULT (DATETIME('now', 'subsec', 'utc')),
        name VARCHAR(100) NOT NULL,
        logo VARCHAR(300)
      );

      CREATE TABLE IF NOT EXISTS users (
        id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
        created_at DATETIME NOT NULL DEFAULT (DATETIME('now', 'subsec', 'utc')),
        name VARCHAR(100) NOT NULL,
        email VARCHAR(254) NOT NULL,
        password VARCHAR(512) NOT NULL,
        role VARCHAR(100) NOT NULL DEFAULT 'user'
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

      CREATE TABLE IF NOT EXISTS reservations (
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
}) satisfies () => any;
