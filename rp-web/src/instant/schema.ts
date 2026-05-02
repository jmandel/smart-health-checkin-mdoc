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
      createdAt: i.number().indexed(),
      expiresAt: i.number().indexed(),
      creatorKeyId: i.string().indexed(),
      serviceKeyId: i.string().indexed(),
      encryptedRequest: i.json<EncryptedKioskRequest>(),
    }),
    submissions: i.entity({
      submissionId: i.string().unique().indexed(),
      requestId: i.string().indexed(),
      createdAt: i.number().indexed(),
      expiresAt: i.number().indexed(),
      totalPlaintextBytes: i.number(),
      totalCiphertextBytes: i.number(),
      payloadSha256: i.string(),
      iv: i.string(),
      storagePath: i.string().unique().indexed(),
      storageFileId: i.string().indexed(),
      contentType: i.string().indexed(),
      phoneEphemeralPublicKeyJwk: i.json<JsonWebKey>(),
    }),
  },
});

export type AppSchema = typeof schema;
export default schema;
