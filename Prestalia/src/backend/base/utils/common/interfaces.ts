export interface Config {
  /**
   * Chemin du dossier contenant le certificat (par exemple /certs/mondomain.local)
   */
  certDirPath: string;
  domain: string;
  httpPort: number;
  httpsPort: number;
  hostname: string;
  certType: "certbot" | "self-signed";
  forceDomainUsage: boolean;
}

export interface Config {
  // Réseau
  hostname: string;
  domain: string;
  httpPort: number;
  httpsPort: number;

  // SSL
  certDirPath: string;
  certType: "certbot" | "self-signed";
  forceDomainUsage: boolean;

  // Sécurité
  argon2Secret: string;
  jwtSecret: string;

  // Initialisation
  adminDefaultPassword: string;

  // Base de données
  mysqlHost: string;
  mysqlUser: string;
  mysqlPassword: string;
}
