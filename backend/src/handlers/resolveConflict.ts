import { createHash } from 'crypto';
import { ulid } from 'ulid';
import type {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  BankQuestionItem,
  ConflictResolution,
} from '../lib/types.js';
import {
  getConflict,
  getBankQuestion,
  updateBankQuestionContent,
  markConflictResolved,
  batchSaveBankQuestions,
} from '../lib/dynamodb.js';
import { successResponse, errorResponse } from '../lib/response.js';

const VALID_RESOLUTIONS: ConflictResolution[] = ['kept_existing', 'replaced', 'kept_both'];

interface ResolveRequest {
  resolution: ConflictResolution;
  resolvedBy?: string;
}

/**
 * POST /admin/conflicts/{id}/resolve
 * Body: { resolution: 'kept_existing' | 'replaced' | 'kept_both', resolvedBy?: string }
 *
 * - kept_existing: keep the existing bank question as-is; the candidate is
 *   discarded. The conflict is marked resolved.
 * - replaced:     overwrite the existing bank question's outcome fields
 *   (correctAnswer / explanation / law / lawReference) with the candidate's.
 *   Text and options are unchanged (they already matched by hash).
 * - kept_both:    insert the candidate as a brand new bank question alongside
 *   the existing one. The new row gets a discriminated hash so it doesn't
 *   collide with future dedup checks against the canonical original.
 */
export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  console.log('Event:', JSON.stringify(event, null, 2));

  const conflictId = event.pathParameters?.id;
  if (!conflictId) return errorResponse('Missing conflict ID', 400);
  if (!event.body) return errorResponse('Request body is required', 400);

  let request: ResolveRequest;
  try {
    request = JSON.parse(event.body);
  } catch {
    return errorResponse('Invalid JSON body', 400);
  }

  if (!VALID_RESOLUTIONS.includes(request.resolution)) {
    return errorResponse(`resolution must be one of: ${VALID_RESOLUTIONS.join(', ')}`, 400);
  }

  try {
    const conflict = await getConflict(conflictId);
    if (!conflict) return errorResponse('Conflict not found', 404);
    if (conflict.status === 'resolved') {
      return errorResponse('Conflict has already been resolved', 409);
    }

    const resolvedBy = request.resolvedBy?.trim() || 'admin';

    if (request.resolution === 'replaced') {
      const existing = await getBankQuestion(conflict.existingQuestionId);
      if (!existing) {
        return errorResponse('Existing question no longer exists', 404);
      }
      await updateBankQuestionContent(conflict.existingQuestionId, {
        correctAnswer: conflict.candidate.correctAnswer,
        explanation: conflict.candidate.explanation,
        law: conflict.candidate.law,
        lawReference: conflict.candidate.lawReference,
      });
    } else if (request.resolution === 'kept_both') {
      const questionId = ulid();
      const now = new Date().toISOString();
      const baseHash = hashContent(conflict.text, conflict.options);
      const newQuestion: BankQuestionItem = {
        PK: `QUESTION#${questionId}`,
        SK: 'METADATA',
        Type: 'BankQuestion',
        questionId,
        text: conflict.text,
        options: conflict.options,
        correctAnswer: conflict.candidate.correctAnswer,
        explanation: conflict.candidate.explanation,
        law: conflict.candidate.law,
        lawReference: conflict.candidate.lawReference,
        confidence: conflict.candidate.confidence,
        // Goes into the bank as pending_review so an admin gives it a final
        // look before it can be served in a quiz.
        status: 'pending_review',
        sourceFile: 'conflict-resolution',
        jobId: conflict.jobId,
        // Discriminate the hash so future identical-PDF imports still dedupe
        // against the canonical original, not against this alternate version.
        hash: `${baseHash}-${conflictId.slice(0, 8)}`,
        createdAt: now,
        updatedAt: now,
        source: 'pdf_extraction',
        usageCount: 0,
      };
      await batchSaveBankQuestions([newQuestion]);
    }
    // 'kept_existing' = no DB change beyond marking the conflict resolved.

    await markConflictResolved(conflictId, request.resolution, resolvedBy);

    return successResponse({
      conflictId,
      resolution: request.resolution,
      message: 'Conflict resolved',
    });
  } catch (error) {
    console.error('Error resolving conflict:', error);
    return errorResponse('Failed to resolve conflict', 500);
  }
}

function hashContent(text: string, options: string[]): string {
  const content = `${text}|${options.join('|')}`.toLowerCase().trim();
  return createHash('sha256').update(content).digest('hex').substring(0, 32);
}
