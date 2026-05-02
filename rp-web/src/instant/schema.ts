import { i } from "@instantdb/react";
import type { EncryptedKioskRequest } from "../kiosk/protocol.ts";

const schema = i.schema({
  entities: {
    $files: i.entity({
      path: i.string().unique().indexed(),
      url: i.string(),
    }),
    requests: i.entity({
      requestId: i.string().unique().indexed(),
      encryptedRequest: i.json<EncryptedKioskRequest>(),
    }),
    submissions: i.entity({
      submissionId: i.string().unique().indexed(),
      requestId: i.string().indexed(),
      storagePath: i.string().unique().indexed(),
      storageFileId: i.string().indexed(),
      iv: i.string(),
      phoneEphemeralPublicKeyJwk: i.json<JsonWebKey>(),
    }),
  },
});

export type AppSchema = typeof schema;
export default schema;
