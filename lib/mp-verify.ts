import { createHmac } from "crypto"

export function verifyMpSignature(
  secret: string,
  xSignature: string,
  xRequestId: string,
  dataId: string
): boolean {
  let ts = ""
  let v1 = ""
  for (const part of xSignature.split(",")) {
    const [k, v] = part.trim().split("=", 2)
    if (k === "ts") ts = v
    if (k === "v1") v1 = v
  }
  if (!ts || !v1) return false
  const manifest = "id:" + dataId + ";request-id:" + xRequestId + ";ts:" + ts + ";"
  const computed = createHmac("sha256", secret).update(manifest).digest("hex")
  return computed === v1
}
