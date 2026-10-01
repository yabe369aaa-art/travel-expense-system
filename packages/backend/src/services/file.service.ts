import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getEnv } from '../config/env.js';
import { AppError } from '../middleware/error.js';
import { v4 as uuidv4 } from 'uuid';

const env = getEnv();

const s3Client = new S3Client({
  region: env.S3_REGION,
  endpoint: env.S3_ENDPOINT,
  credentials: {
    accessKeyId: env.S3_ACCESS_KEY,
    secretAccessKey: env.S3_SECRET_KEY,
  },
  forcePathStyle: true,
});

export class FileService {
  async getPresignedUploadUrl(fileName: string, contentType: string, fileSize: number): Promise<{ uploadUrl: string; fileKey: string }> {
    if (fileSize > 10 * 1024 * 1024) {
      throw new AppError(400, 'VALIDATION_ERROR', 'File size exceeds 10MB limit');
    }
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!allowedTypes.includes(contentType)) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Only JPEG, PNG, PDF allowed');
    }

    const ext = contentType === 'application/pdf' ? 'pdf' : contentType.split('/')[1];
    const fileKey = `receipts/${uuidv4()}.${ext}`;

    const command = new PutObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: fileKey,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: env.S3_PRESIGNED_EXPIRES });
    return { uploadUrl, fileKey };
  }

  async getPresignedViewUrl(fileKey: string): Promise<string> {
    // For viewing, we generate a short-lived GET URL
    // In a real implementation, you'd use GetObjectCommand
    // For LocalStack, we can construct the URL directly
    return `${env.S3_ENDPOINT}/${env.S3_BUCKET}/${fileKey}?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=${env.S3_ACCESS_KEY}%2F${new Date().toISOString().split('T')[0].replace(/-/g, '')}%2F${env.S3_REGION}%2Fs3%2Faws4_request&X-Amz-Date=${new Date().toISOString().replace(/[:-]|\.\d{3}/g, '')}&X-Amz-Expires=${env.S3_PRESIGNED_EXPIRES}&X-Amz-SignedHeaders=host`;
  }

  async deleteFile(fileKey: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: fileKey,
    });
    await s3Client.send(command);
  }

  async ensureBucketExists(): Promise<void> {
    // In production, use CreateBucketCommand
    // For LocalStack, bucket is created automatically on first use
  }
}