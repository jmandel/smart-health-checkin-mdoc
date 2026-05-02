import type { InstantRules } from "@instantdb/react";

const maxPayloadBytes = 25 * 1024 * 1024;
const maxBlobBytes = maxPayloadBytes + 1024;
const blobContentType = "application/octet-stream";

const rules = {
  "$default": {
    allow: {
      "$default": "false",
    },
  },
  attrs: {
    allow: {
      "$default": "false",
    },
  },
  "$files": {
    bind: {
      kioskBlobPath: "data.path.startsWith('submissions/')",
      knownStoragePath:
        "data.path == ruleParams.storagePath && " +
        "data.path.startsWith('submissions/' + ruleParams.requestId + '/')",
    },
    allow: {
      view: "knownStoragePath",
      create: "kioskBlobPath",
      update: "false",
      delete: "false",
    },
  },
  requests: {
    bind: {
      knowsRequest: "data.requestId == ruleParams.requestId",
      allowedFields:
        "request.modifiedFields.all(field, field in [" +
        "'requestId', 'createdAt', 'expiresAt', " +
        "'creatorKeyId', 'serviceKeyId', 'encryptedRequest'" +
        "])",
      timeShapeOk: "data.expiresAt > data.createdAt",
    },
    allow: {
      view: "knowsRequest",
      create: "knowsRequest && allowedFields && timeShapeOk",
      update: "false",
      delete: "false",
    },
  },
  submissions: {
    bind: {
      knowsRequest: "data.requestId == ruleParams.requestId",
      allowedFields:
        "request.modifiedFields.all(field, field in [" +
        "'submissionId', 'requestId', 'createdAt', " +
        "'expiresAt', 'totalPlaintextBytes', 'totalCiphertextBytes', " +
        "'payloadSha256', 'iv', 'storagePath', 'storageFileId', 'contentType', " +
        "'phoneEphemeralPublicKeyJwk'" +
        "])",
      sizeOk:
        `data.totalPlaintextBytes <= ${maxPayloadBytes} && ` +
        `data.totalCiphertextBytes <= ${maxBlobBytes}`,
      contentOk: `data.contentType == '${blobContentType}'`,
      pathOk:
        "data.storagePath == 'submissions/' + data.requestId + '/' + data.submissionId + '.bin' && " +
        "data.storagePath.startsWith('submissions/' + ruleParams.requestId + '/')",
      timeShapeOk: "data.expiresAt > data.createdAt",
    },
    allow: {
      view: "knowsRequest",
      create: "knowsRequest && allowedFields && sizeOk && contentOk && pathOk && timeShapeOk",
      update: "false",
      delete: "false",
    },
  },
} satisfies InstantRules;

export default rules;
