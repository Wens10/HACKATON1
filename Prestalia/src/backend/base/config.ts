import {Config} from "./utils/common/interfaces";

const config: Config = {
  certDirPath: "./cert",
  hostname: "127.0.0.1",
  domain: "test.local",
  httpPort: 8080,
  httpsPort: 8443,
  certType: "self-signed",
  forceDomainUsage: false,
};

export default config;
