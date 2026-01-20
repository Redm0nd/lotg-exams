import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { ulid } from 'ulid';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from '../lib/types.js';
import { successResponse, errorResponse } from '../lib/response.js';

const s3Client = new S3Client({});
const BUCKET_NAME = process.env.BUCKET_NAME || '';

interface PresignedUrlRequest {
  fileName: string;
  contentType: string;
}

/**
 * POST /admin/upload/presigned-url
 * Generates a presigned URL for uploading a PDF to S3
 */
export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  console.log('Event:', JSON.stringify(event, null, 2));

  if (!event.body) {
    return errorResponse('Request body is required', 400);
  }

  let request: PresignedUrlRequest;
  try {
    request = JSON.parse(event.body);
  } catch {
    return errorResponse('Invalid JSON body', 400);
  }

  if (!request.fileName) {
    return errorResponse('fileName is required', 400);
  }

  if (!request.contentType || request.contentType !== 'application/pdf') {
    return errorResponse('contentType must be application/pdf', 400);
  }

  try {
    // Generate a unique key for the upload
    const jobId = ulid();
    const sanitizedFileName = request.fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const s3Key = `uploads/${jobId}/${sanitizedFileName}`;

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
      ContentType: request.contentType,
      Metadata: {
        'original-filename': request.fileName,
        'job-id': jobId,
      },
    });

    // Generate presigned URL valid for 15 minutes
    const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 900 });

    return successResponse({
      uploadUrl: presignedUrl,
      s3Key,
      jobId,
      expiresIn: 900,
    });
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    return errorResponse('Failed to generate upload URL', 500);
  }
}
