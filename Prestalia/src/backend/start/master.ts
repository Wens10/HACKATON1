import "dotenv/config";
import {renderStaticEJSFiles} from "../utils/functions";
import {createConnection, createPool} from "mysql2/promise";
import config from "../config";

export default (async () => {
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

  const tempConn = await createConnection({
    host: config.mysqlHost,
    user: config.mysqlUser,
    password: config.mysqlPassword,
  });

  await tempConn.execute("CREATE DATABASE IF NOT EXISTS prestalia");
  await tempConn.end();

  const db = createPool({
    host: config.mysqlHost,
    user: config.mysqlUser,
    password: config.mysqlPassword,
    database: "prestalia",
  });

  await db.execute(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER NOT NULL PRIMARY KEY AUTO_INCREMENT,
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      name VARCHAR(100) NOT NULL,
      icon VARCHAR(300)
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER NOT NULL PRIMARY KEY AUTO_INCREMENT,
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      name VARCHAR(100) NOT NULL,
      email VARCHAR(254) NOT NULL,
      password VARCHAR(512) NOT NULL,
      role VARCHAR(100) NOT NULL DEFAULT 'user'
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS providers (
      id INTEGER NOT NULL PRIMARY KEY AUTO_INCREMENT,
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      valided BOOLEAN,
      tel VARCHAR(20),
      city VARCHAR(100),
      category INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      descr VARCHAR(1000),
      exp INTEGER,
      price FLOAT,
      days INTEGER,
      FOREIGN KEY(category) REFERENCES categories(id),
      FOREIGN KEY(user_id) REFERENCES users(id)
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS certificates (
      id INTEGER NOT NULL PRIMARY KEY AUTO_INCREMENT,
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      name VARCHAR(100),
      author INTEGER NOT NULL,
      path VARCHAR(300) NOT NULL,
      valided BOOLEAN,
      FOREIGN KEY(author) REFERENCES providers(id)
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS reservations (
      id INTEGER NOT NULL PRIMARY KEY AUTO_INCREMENT,
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      author INTEGER NOT NULL,
      provider INTEGER NOT NULL,
      price FLOAT NOT NULL,
      date DATETIME(3) NOT NULL,
      status ENUM('pending','confirmed','rejected') NOT NULL DEFAULT 'pending',
      FOREIGN KEY(author) REFERENCES users(id),
      FOREIGN KEY(provider) REFERENCES providers(id)
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS favorites (
      id INTEGER NOT NULL PRIMARY KEY AUTO_INCREMENT,
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      user_id INTEGER NOT NULL,
      provider_id INTEGER NOT NULL,
      UNIQUE KEY unique_fav (user_id, provider_id),
      FOREIGN KEY(user_id) REFERENCES users(id),
      FOREIGN KEY(provider_id) REFERENCES providers(id)
    );
  `);

  // Migration : ajouter status si la table existait déjà sans cette colonne
  try {
    await db.execute(`
      ALTER TABLE reservations
      ADD COLUMN status ENUM('pending','confirmed','rejected') NOT NULL DEFAULT 'pending'
    `);
  } catch (_) {
    /* colonne déjà présente */
  }

  renderStaticEJSFiles();
}) satisfies () => any;
