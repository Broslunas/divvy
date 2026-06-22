import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID!;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID!;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY!;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME!;
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL!;

// Cloudflare R2 uses an S3-compatible endpoint
const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

/**
 * Uploads a file buffer to Cloudflare R2.
 * @param key    Object key (path) in the bucket, e.g. "covers/groupId-1234.jpg"
 * @param body   File content as Buffer or Uint8Array
 * @param contentType  MIME type, e.g. "image/jpeg"
 * @returns      Public CDN URL of the uploaded file
 */
export async function uploadToR2(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    Body: body,
    ContentType: contentType,
    // Cache for 1 year — static images identified by timestamp in key
    CacheControl: 'public, max-age=31536000, immutable',
  });

  await r2Client.send(command);

  return `${R2_PUBLIC_URL}/${key}`;
}
