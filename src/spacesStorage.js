// Server-only. Talks to DigitalOcean Spaces (S3-compatible) using AWS SigV4
// request signing, hand-rolled with node:crypto so no new dependency is
// needed for a single-bucket integration.
//
// SECURITY: DO_SPACES_SECRET is a signing key, not a bearer token — it must
// never reach the client bundle. Only import this module from server code
// (a route under src/routes/api/*, or another server-only module). Never
// import it from App.jsx, cloudSync.js, or any other file that ships to
// the browser.
//
// Mirrors the upload/getUrl/delete shape of the Supabase Storage helpers in
// cloudSync.js (uploadLibraryFile / getLibraryFileUrl / deleteLibraryFile)
// so it can be swapped in later without changing call sites much.

import { createHmac, createHash } from "node:crypto";

const SERVICE = "s3";

function readConfig() {
  const key = process.env.DO_SPACES_KEY;
  const secret = process.env.DO_SPACES_SECRET;
  const region = process.env.DO_SPACES_REGION || "fra1";
  const bucket = process.env.DO_SPACES_BUCKET;
  const endpoint = process.env.DO_SPACES_ENDPOINT || `https://${region}.digitaloceanspaces.com`;

  const missing = [
    ...(!key ? ["DO_SPACES_KEY"] : []),
    ...(!secret ? ["DO_SPACES_SECRET"] : []),
    ...(!bucket ? ["DO_SPACES_BUCKET"] : []),
  ];
  if (missing.length) {
    throw new Error(`[spacesStorage] Missing environment variable(s): ${missing.join(", ")}`);
  }

  const host = `${bucket}.${new URL(endpoint).host}`;
  return { key, secret, region, bucket, host };
}

function sha256Hex(input) {
  return createHash("sha256").update(input).digest("hex");
}

function hmac(key, str) {
  return createHmac("sha256", key).update(str, "utf8").digest();
}

function signingKey(secret, dateStamp, region) {
  const kDate = hmac(`AWS4${secret}`, dateStamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, SERVICE);
  return hmac(kService, "aws4_request");
}

// AWS requires stricter percent-encoding than encodeURIComponent (also
// escapes ! * ' ( )); '/' is left alone so it keeps separating key segments.
function awsEncode(str) {
  return encodeURIComponent(str).replace(
    /[!*'()]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

function canonicalUri(key) {
  return "/" + key.split("/").map(awsEncode).join("/");
}

function amzTimestamp() {
  const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, "");
  return { amzDate, dateStamp: amzDate.slice(0, 8) };
}

// Header-signed request (used for PUT/DELETE, where we make the call here
// on the server and the body/secret never leave it).
async function signedRequest(method, key, { body, contentType } = {}) {
  const { secret, region, host } = readConfig();
  const { amzDate, dateStamp } = amzTimestamp();
  const payloadHash = sha256Hex(body ?? "");
  const uri = canonicalUri(key);

  const headerEntries = [
    ["host", host],
    ["x-amz-content-sha256", payloadHash],
    ["x-amz-date", amzDate],
  ];
  if (contentType) headerEntries.push(["content-type", contentType]);
  headerEntries.sort(([a], [b]) => (a < b ? -1 : 1));

  const canonicalHeaders = headerEntries.map(([k, v]) => `${k}:${v}\n`).join("");
  const signedHeaders = headerEntries.map(([k]) => k).join(";");
  const canonicalRequest = [method, uri, "", canonicalHeaders, signedHeaders, payloadHash].join(
    "\n",
  );

  const credentialScope = `${dateStamp}/${region}/${SERVICE}/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join("\n");
  const signature = hmac(signingKey(secret, dateStamp, region), stringToSign).toString("hex");

  const { key: accessKey } = readConfig();
  const authorization = `AWS4-HMAC-SHA256 Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const headers = Object.fromEntries(headerEntries.filter(([k]) => k !== "host"));
  headers.Authorization = authorization;

  const res = await fetch(`https://${host}${uri}`, { method, headers, body });
  return res;
}

// Presigned GET URL, computed locally (no network call) so the browser can
// fetch the object directly without ever seeing DO_SPACES_SECRET.
export function getSignedUrl(key, expiresInSeconds = 3600) {
  const { key: accessKey, secret, region, host } = readConfig();
  const { amzDate, dateStamp } = amzTimestamp();
  const uri = canonicalUri(key);
  const credentialScope = `${dateStamp}/${region}/${SERVICE}/aws4_request`;

  const query = new URLSearchParams({
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": `${accessKey}/${credentialScope}`,
    "X-Amz-Date": amzDate,
    "X-Amz-Expires": String(expiresInSeconds),
    "X-Amz-SignedHeaders": "host",
  });
  // URLSearchParams encodes spaces as '+'; AWS canonical query needs '%20'.
  const canonicalQueryString = [...query.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([k, v]) => `${awsEncode(k)}=${awsEncode(v)}`)
    .join("&");

  const canonicalRequest = [
    "GET",
    uri,
    canonicalQueryString,
    `host:${host}\n`,
    "host",
    "UNSIGNED-PAYLOAD",
  ].join("\n");

  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join("\n");
  const signature = hmac(signingKey(secret, dateStamp, region), stringToSign).toString("hex");

  return `https://${host}${uri}?${canonicalQueryString}&X-Amz-Signature=${signature}`;
}

// Uploads a file to the configured bucket. `body` is a Buffer/Uint8Array/string.
// Returns the storage key on success, null on failure (mirrors uploadLibraryFile).
export async function uploadFile(key, body, contentType) {
  try {
    const res = await signedRequest("PUT", key, { body, contentType });
    if (!res.ok) {
      console.warn("[spacesStorage.uploadFile]", res.status, await res.text());
      return null;
    }
    return key;
  } catch (err) {
    console.warn("[spacesStorage.uploadFile]", err);
    return null;
  }
}

export async function deleteFile(key) {
  if (!key) return;
  try {
    const res = await signedRequest("DELETE", key);
    if (!res.ok && res.status !== 404) {
      console.warn("[spacesStorage.deleteFile]", res.status, await res.text());
    }
  } catch (err) {
    console.warn("[spacesStorage.deleteFile]", err);
  }
}

// Builds a storage key consistent with cloudSync.js's existing convention
// (`${userId}/${timestamp}-${random}.${ext}`).
export function buildStorageKey(userId, fileName) {
  const ext = (fileName.split(".").pop() || "bin").toLowerCase();
  return `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
}
