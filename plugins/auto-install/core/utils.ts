import crypto from "node:crypto";

export const sha1Hash = (s: string) =>
  crypto.createHash("sha1").update(s).digest("hex");
