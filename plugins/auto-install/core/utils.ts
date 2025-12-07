import crypto from "node:crypto";

export const hashString = (s: string) =>
  crypto.createHash("sha1").update(s).digest("hex");
