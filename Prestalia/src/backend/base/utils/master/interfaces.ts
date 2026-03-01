import {MessageTypes} from "../common/enums";
import {Cert} from "../../../core";

export interface UpdateCertMessage {
  type: MessageTypes.UpdateCert;
  data: {
    cert: Cert | null;
  };
}
