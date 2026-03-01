import {ChokidarOptions} from "chokidar";
import {SupportedEncoding, SupportedExtname} from "./types.js";
import {SecureServerOptions} from "http2";

export const FILE_EXTENSIONS_TO_COMPRESS = [
  ".json",
  ".xml",
  ".svg",
  ".css",
  ".html",
  ".js",
  ".mjs",
];
export const COMPRESSED_FILE_EXTENSIONS = [".br", ".gz"];
export const DEFAULT_WATCHER_OPTIONS: ChokidarOptions = {
  atomic: true,
  awaitWriteFinish: {
    stabilityThreshold: 500,
    pollInterval: 100,
  },
  alwaysStat: true,
  ignoreInitial: true,
  persistent: true,
  usePolling: false,
};

export const SUPPORTED_METHODS = [
  "GET",
  "HEAD",
  "POST",
  "PUT",
  "DELETE",
  "OPTIONS",
  "TRACE",
  "PATCH",
  /* "CONNECT" */
];

export const SUPPORTED_ENCODING: SupportedEncoding[] = [
  "br",
  "gzip",
  "*",
  "identity",
];

export const SUPPORTED_EXTNAMES: SupportedExtname[] = [
  ".json",
  ".pdf",
  ".xml",
  ".apng",
  ".gif",
  ".jpeg",
  ".jpg",
  ".png",
  ".svg",
  ".svgz",
  ".webp",
  ".css",
  ".html",
  ".js",
  ".mjs",
];

export const MIME_TYPES: Record<SupportedExtname, string> = {
  // Applications
  ".json": "application/json; charset=utf-8",
  ".pdf": "application/pdf",
  ".xml": "application/xml; charset=utf-8",
  // Images
  ".apng": "image/apng",
  ".gif": "image/gif",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".svgz": "image/svg+xml" /* SVG compressed with GZIP */,
  ".webp": "image/webp",
  // Texts
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
};

export const DEFAULT_SECURE_SERVER_OPTIONS: SecureServerOptions = {
  allowHTTP1: true,
  cert: "",
  ciphers: [
    "TLS_AES_128_GCM_SHA256",
    "TLS_AES_256_GCM_SHA384",
    "TLS_CHACHA20_POLY1305_SHA256",
    "ECDHE-ECDSA-AES128-GCM-SHA256",
    "ECDHE-ECDSA-AES256-GCM-SHA384",
    "ECDHE-RSA-AES128-GCM-SHA256",
    "ECDHE-RSA-AES256-GCM-SHA384",
  ].join(":"),
  ecdhCurve: "X25519:prime256v1:secp384r1",
  honorCipherOrder: true,
  key: "",
  minVersion: "TLSv1.2",
  maxVersion: "TLSv1.3",
  rejectUnauthorized: false,
  requestCert: false,
  sigalgs:
    "ecdsa_secp256r1_sha256:ecdsa_secp384r1_sha384:rsa_pss_rsae_sha256:rsa_pkcs1_sha256",
};
