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
