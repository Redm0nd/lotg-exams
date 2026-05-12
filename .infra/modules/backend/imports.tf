# ============================================================================
# Reconcile CORS module state after squidfunk -> local module migration
# ============================================================================
#
# In commit 30bb98f the registry module `squidfunk/api-gateway-enable-cors/aws`
# was replaced with the local module at `.infra/modules/cors`. The local
# module's resources are named `cors` and the migration commit's apply was
# expected to be a transparent renaming. In practice, Terraform's state file
# ended up missing a number of CORS-method/integration/method-response/
# integration-response rows for the existing API Gateway resources, so the
# next apply tried to PutMethod on them and AWS replied with 409
# "ConflictException: Method already exists for this resource".
#
# These `import` blocks reconcile the divergence by importing the existing
# AWS resources into the local module's state addresses. They are idempotent:
# if Terraform already has the resource in state, the import is a no-op
# (Terraform reports "Skipped: already managed"). It is therefore safe to
# leave them in place permanently, but the cleaner thing is to delete this
# file once a successful plan shows no `import` actions pending.
#
# AWS resource ID formats (from the aws_api_gateway_* provider docs):
#   - aws_api_gateway_method          : {rest_api_id}/{resource_id}/{http_method}
#   - aws_api_gateway_integration     : {rest_api_id}/{resource_id}/{http_method}
#   - aws_api_gateway_method_response : {rest_api_id}/{resource_id}/{http_method}/{status_code}
#   - aws_api_gateway_integration_response : same as method_response

# `import` blocks don't accept for_each — they must be listed statically.
# Each affected CORS module gets four import blocks (method, integration,
# method_response, integration_response).

# --- /quizzes ---
import {
  to = module.cors_quizzes.aws_api_gateway_method.cors
  id = "${aws_api_gateway_rest_api.this.id}/${aws_api_gateway_resource.quizzes.id}/OPTIONS"
}
import {
  to = module.cors_quizzes.aws_api_gateway_integration.cors
  id = "${aws_api_gateway_rest_api.this.id}/${aws_api_gateway_resource.quizzes.id}/OPTIONS"
}
import {
  to = module.cors_quizzes.aws_api_gateway_method_response.cors
  id = "${aws_api_gateway_rest_api.this.id}/${aws_api_gateway_resource.quizzes.id}/OPTIONS/200"
}
import {
  to = module.cors_quizzes.aws_api_gateway_integration_response.cors
  id = "${aws_api_gateway_rest_api.this.id}/${aws_api_gateway_resource.quizzes.id}/OPTIONS/200"
}

# --- /quizzes/{id} ---
import {
  to = module.cors_quiz_id.aws_api_gateway_method.cors
  id = "${aws_api_gateway_rest_api.this.id}/${aws_api_gateway_resource.quiz_id.id}/OPTIONS"
}
import {
  to = module.cors_quiz_id.aws_api_gateway_integration.cors
  id = "${aws_api_gateway_rest_api.this.id}/${aws_api_gateway_resource.quiz_id.id}/OPTIONS"
}
import {
  to = module.cors_quiz_id.aws_api_gateway_method_response.cors
  id = "${aws_api_gateway_rest_api.this.id}/${aws_api_gateway_resource.quiz_id.id}/OPTIONS/200"
}
import {
  to = module.cors_quiz_id.aws_api_gateway_integration_response.cors
  id = "${aws_api_gateway_rest_api.this.id}/${aws_api_gateway_resource.quiz_id.id}/OPTIONS/200"
}

# --- /admin/questions ---
import {
  to = module.cors_admin_questions.aws_api_gateway_method.cors
  id = "${aws_api_gateway_rest_api.this.id}/${aws_api_gateway_resource.admin_questions.id}/OPTIONS"
}
import {
  to = module.cors_admin_questions.aws_api_gateway_integration.cors
  id = "${aws_api_gateway_rest_api.this.id}/${aws_api_gateway_resource.admin_questions.id}/OPTIONS"
}
import {
  to = module.cors_admin_questions.aws_api_gateway_method_response.cors
  id = "${aws_api_gateway_rest_api.this.id}/${aws_api_gateway_resource.admin_questions.id}/OPTIONS/200"
}
import {
  to = module.cors_admin_questions.aws_api_gateway_integration_response.cors
  id = "${aws_api_gateway_rest_api.this.id}/${aws_api_gateway_resource.admin_questions.id}/OPTIONS/200"
}

# --- /admin/questions/{id} ---
import {
  to = module.cors_admin_question_id.aws_api_gateway_method.cors
  id = "${aws_api_gateway_rest_api.this.id}/${aws_api_gateway_resource.admin_question_id.id}/OPTIONS"
}
import {
  to = module.cors_admin_question_id.aws_api_gateway_integration.cors
  id = "${aws_api_gateway_rest_api.this.id}/${aws_api_gateway_resource.admin_question_id.id}/OPTIONS"
}
import {
  to = module.cors_admin_question_id.aws_api_gateway_method_response.cors
  id = "${aws_api_gateway_rest_api.this.id}/${aws_api_gateway_resource.admin_question_id.id}/OPTIONS/200"
}
import {
  to = module.cors_admin_question_id.aws_api_gateway_integration_response.cors
  id = "${aws_api_gateway_rest_api.this.id}/${aws_api_gateway_resource.admin_question_id.id}/OPTIONS/200"
}

# --- /admin/jobs/manual ---
import {
  to = module.cors_admin_jobs_manual.aws_api_gateway_method.cors
  id = "${aws_api_gateway_rest_api.this.id}/${aws_api_gateway_resource.admin_jobs_manual.id}/OPTIONS"
}
import {
  to = module.cors_admin_jobs_manual.aws_api_gateway_integration.cors
  id = "${aws_api_gateway_rest_api.this.id}/${aws_api_gateway_resource.admin_jobs_manual.id}/OPTIONS"
}
import {
  to = module.cors_admin_jobs_manual.aws_api_gateway_method_response.cors
  id = "${aws_api_gateway_rest_api.this.id}/${aws_api_gateway_resource.admin_jobs_manual.id}/OPTIONS/200"
}
import {
  to = module.cors_admin_jobs_manual.aws_api_gateway_integration_response.cors
  id = "${aws_api_gateway_rest_api.this.id}/${aws_api_gateway_resource.admin_jobs_manual.id}/OPTIONS/200"
}

# --- /admin/jobs/{id} ---
import {
  to = module.cors_admin_job_id.aws_api_gateway_method.cors
  id = "${aws_api_gateway_rest_api.this.id}/${aws_api_gateway_resource.admin_job_id.id}/OPTIONS"
}
import {
  to = module.cors_admin_job_id.aws_api_gateway_integration.cors
  id = "${aws_api_gateway_rest_api.this.id}/${aws_api_gateway_resource.admin_job_id.id}/OPTIONS"
}
import {
  to = module.cors_admin_job_id.aws_api_gateway_method_response.cors
  id = "${aws_api_gateway_rest_api.this.id}/${aws_api_gateway_resource.admin_job_id.id}/OPTIONS/200"
}
import {
  to = module.cors_admin_job_id.aws_api_gateway_integration_response.cors
  id = "${aws_api_gateway_rest_api.this.id}/${aws_api_gateway_resource.admin_job_id.id}/OPTIONS/200"
}

# --- /admin/jobs/{id}/questions ---
import {
  to = module.cors_admin_job_questions.aws_api_gateway_method.cors
  id = "${aws_api_gateway_rest_api.this.id}/${aws_api_gateway_resource.admin_job_questions.id}/OPTIONS"
}
import {
  to = module.cors_admin_job_questions.aws_api_gateway_integration.cors
  id = "${aws_api_gateway_rest_api.this.id}/${aws_api_gateway_resource.admin_job_questions.id}/OPTIONS"
}
import {
  to = module.cors_admin_job_questions.aws_api_gateway_method_response.cors
  id = "${aws_api_gateway_rest_api.this.id}/${aws_api_gateway_resource.admin_job_questions.id}/OPTIONS/200"
}
import {
  to = module.cors_admin_job_questions.aws_api_gateway_integration_response.cors
  id = "${aws_api_gateway_rest_api.this.id}/${aws_api_gateway_resource.admin_job_questions.id}/OPTIONS/200"
}

# --- /admin/jobs/{id}/questions/{questionId} ---
import {
  to = module.cors_admin_job_question_id.aws_api_gateway_method.cors
  id = "${aws_api_gateway_rest_api.this.id}/${aws_api_gateway_resource.admin_job_question_id.id}/OPTIONS"
}
import {
  to = module.cors_admin_job_question_id.aws_api_gateway_integration.cors
  id = "${aws_api_gateway_rest_api.this.id}/${aws_api_gateway_resource.admin_job_question_id.id}/OPTIONS"
}
import {
  to = module.cors_admin_job_question_id.aws_api_gateway_method_response.cors
  id = "${aws_api_gateway_rest_api.this.id}/${aws_api_gateway_resource.admin_job_question_id.id}/OPTIONS/200"
}
import {
  to = module.cors_admin_job_question_id.aws_api_gateway_integration_response.cors
  id = "${aws_api_gateway_rest_api.this.id}/${aws_api_gateway_resource.admin_job_question_id.id}/OPTIONS/200"
}

# --- /admin/jobs/{id}/metadata ---
import {
  to = module.cors_admin_job_metadata.aws_api_gateway_method.cors
  id = "${aws_api_gateway_rest_api.this.id}/${aws_api_gateway_resource.admin_job_metadata.id}/OPTIONS"
}
import {
  to = module.cors_admin_job_metadata.aws_api_gateway_integration.cors
  id = "${aws_api_gateway_rest_api.this.id}/${aws_api_gateway_resource.admin_job_metadata.id}/OPTIONS"
}
import {
  to = module.cors_admin_job_metadata.aws_api_gateway_method_response.cors
  id = "${aws_api_gateway_rest_api.this.id}/${aws_api_gateway_resource.admin_job_metadata.id}/OPTIONS/200"
}
import {
  to = module.cors_admin_job_metadata.aws_api_gateway_integration_response.cors
  id = "${aws_api_gateway_rest_api.this.id}/${aws_api_gateway_resource.admin_job_metadata.id}/OPTIONS/200"
}

# --- /admin/analytics ---
import {
  to = module.cors_admin_analytics.aws_api_gateway_method.cors
  id = "${aws_api_gateway_rest_api.this.id}/${aws_api_gateway_resource.admin_analytics.id}/OPTIONS"
}
import {
  to = module.cors_admin_analytics.aws_api_gateway_integration.cors
  id = "${aws_api_gateway_rest_api.this.id}/${aws_api_gateway_resource.admin_analytics.id}/OPTIONS"
}
import {
  to = module.cors_admin_analytics.aws_api_gateway_method_response.cors
  id = "${aws_api_gateway_rest_api.this.id}/${aws_api_gateway_resource.admin_analytics.id}/OPTIONS/200"
}
import {
  to = module.cors_admin_analytics.aws_api_gateway_integration_response.cors
  id = "${aws_api_gateway_rest_api.this.id}/${aws_api_gateway_resource.admin_analytics.id}/OPTIONS/200"
}

# --- /me ---
import {
  to = module.cors_me.aws_api_gateway_method.cors
  id = "${aws_api_gateway_rest_api.this.id}/${aws_api_gateway_resource.me.id}/OPTIONS"
}
import {
  to = module.cors_me.aws_api_gateway_integration.cors
  id = "${aws_api_gateway_rest_api.this.id}/${aws_api_gateway_resource.me.id}/OPTIONS"
}
import {
  to = module.cors_me.aws_api_gateway_method_response.cors
  id = "${aws_api_gateway_rest_api.this.id}/${aws_api_gateway_resource.me.id}/OPTIONS/200"
}
import {
  to = module.cors_me.aws_api_gateway_integration_response.cors
  id = "${aws_api_gateway_rest_api.this.id}/${aws_api_gateway_resource.me.id}/OPTIONS/200"
}

# --- /me/attempts ---
import {
  to = module.cors_me_attempts.aws_api_gateway_method.cors
  id = "${aws_api_gateway_rest_api.this.id}/${aws_api_gateway_resource.me_attempts.id}/OPTIONS"
}
import {
  to = module.cors_me_attempts.aws_api_gateway_integration.cors
  id = "${aws_api_gateway_rest_api.this.id}/${aws_api_gateway_resource.me_attempts.id}/OPTIONS"
}
import {
  to = module.cors_me_attempts.aws_api_gateway_method_response.cors
  id = "${aws_api_gateway_rest_api.this.id}/${aws_api_gateway_resource.me_attempts.id}/OPTIONS/200"
}
import {
  to = module.cors_me_attempts.aws_api_gateway_integration_response.cors
  id = "${aws_api_gateway_rest_api.this.id}/${aws_api_gateway_resource.me_attempts.id}/OPTIONS/200"
}

# --- /me/practice ---
import {
  to = module.cors_me_practice.aws_api_gateway_method.cors
  id = "${aws_api_gateway_rest_api.this.id}/${aws_api_gateway_resource.me_practice.id}/OPTIONS"
}
import {
  to = module.cors_me_practice.aws_api_gateway_integration.cors
  id = "${aws_api_gateway_rest_api.this.id}/${aws_api_gateway_resource.me_practice.id}/OPTIONS"
}
import {
  to = module.cors_me_practice.aws_api_gateway_method_response.cors
  id = "${aws_api_gateway_rest_api.this.id}/${aws_api_gateway_resource.me_practice.id}/OPTIONS/200"
}
import {
  to = module.cors_me_practice.aws_api_gateway_integration_response.cors
  id = "${aws_api_gateway_rest_api.this.id}/${aws_api_gateway_resource.me_practice.id}/OPTIONS/200"
}

# --- /me/bookmarks/{id} ---
import {
  to = module.cors_me_bookmark_id.aws_api_gateway_method.cors
  id = "${aws_api_gateway_rest_api.this.id}/${aws_api_gateway_resource.me_bookmark_id.id}/OPTIONS"
}
import {
  to = module.cors_me_bookmark_id.aws_api_gateway_integration.cors
  id = "${aws_api_gateway_rest_api.this.id}/${aws_api_gateway_resource.me_bookmark_id.id}/OPTIONS"
}
import {
  to = module.cors_me_bookmark_id.aws_api_gateway_method_response.cors
  id = "${aws_api_gateway_rest_api.this.id}/${aws_api_gateway_resource.me_bookmark_id.id}/OPTIONS/200"
}
import {
  to = module.cors_me_bookmark_id.aws_api_gateway_integration_response.cors
  id = "${aws_api_gateway_rest_api.this.id}/${aws_api_gateway_resource.me_bookmark_id.id}/OPTIONS/200"
}

# ----------------------------------------------------------------------------
# Belt-and-braces: import the remaining CORS modules too. Some may already be
# in state from the partial apply; import blocks are idempotent and no-op
# when the resource is already managed, so it's safe to be comprehensive.
# ----------------------------------------------------------------------------

# --- /quizzes/{id}/questions ---
import {
  to = module.cors_questions.aws_api_gateway_method.cors
  id = "${aws_api_gateway_rest_api.this.id}/${aws_api_gateway_resource.questions.id}/OPTIONS"
}
import {
  to = module.cors_questions.aws_api_gateway_integration.cors
  id = "${aws_api_gateway_rest_api.this.id}/${aws_api_gateway_resource.questions.id}/OPTIONS"
}
import {
  to = module.cors_questions.aws_api_gateway_method_response.cors
  id = "${aws_api_gateway_rest_api.this.id}/${aws_api_gateway_resource.questions.id}/OPTIONS/200"
}
import {
  to = module.cors_questions.aws_api_gateway_integration_response.cors
  id = "${aws_api_gateway_rest_api.this.id}/${aws_api_gateway_resource.questions.id}/OPTIONS/200"
}

# --- /quizzes/{id}/submit ---
import {
  to = module.cors_submit.aws_api_gateway_method.cors
  id = "${aws_api_gateway_rest_api.this.id}/${aws_api_gateway_resource.submit.id}/OPTIONS"
}
import {
  to = module.cors_submit.aws_api_gateway_integration.cors
  id = "${aws_api_gateway_rest_api.this.id}/${aws_api_gateway_resource.submit.id}/OPTIONS"
}
import {
  to = module.cors_submit.aws_api_gateway_method_response.cors
  id = "${aws_api_gateway_rest_api.this.id}/${aws_api_gateway_resource.submit.id}/OPTIONS/200"
}
import {
  to = module.cors_submit.aws_api_gateway_integration_response.cors
  id = "${aws_api_gateway_rest_api.this.id}/${aws_api_gateway_resource.submit.id}/OPTIONS/200"
}

# --- /admin ---
import {
  to = module.cors_admin.aws_api_gateway_method.cors
  id = "${aws_api_gateway_rest_api.this.id}/${aws_api_gateway_resource.admin.id}/OPTIONS"
}
import {
  to = module.cors_admin.aws_api_gateway_integration.cors
  id = "${aws_api_gateway_rest_api.this.id}/${aws_api_gateway_resource.admin.id}/OPTIONS"
}
import {
  to = module.cors_admin.aws_api_gateway_method_response.cors
  id = "${aws_api_gateway_rest_api.this.id}/${aws_api_gateway_resource.admin.id}/OPTIONS/200"
}
import {
  to = module.cors_admin.aws_api_gateway_integration_response.cors
  id = "${aws_api_gateway_rest_api.this.id}/${aws_api_gateway_resource.admin.id}/OPTIONS/200"
}

# --- /admin/upload/presigned-url ---
import {
  to = module.cors_admin_presigned_url.aws_api_gateway_method.cors
  id = "${aws_api_gateway_rest_api.this.id}/${aws_api_gateway_resource.admin_presigned_url.id}/OPTIONS"
}
import {
  to = module.cors_admin_presigned_url.aws_api_gateway_integration.cors
  id = "${aws_api_gateway_rest_api.this.id}/${aws_api_gateway_resource.admin_presigned_url.id}/OPTIONS"
}
import {
  to = module.cors_admin_presigned_url.aws_api_gateway_method_response.cors
  id = "${aws_api_gateway_rest_api.this.id}/${aws_api_gateway_resource.admin_presigned_url.id}/OPTIONS/200"
}
import {
  to = module.cors_admin_presigned_url.aws_api_gateway_integration_response.cors
  id = "${aws_api_gateway_rest_api.this.id}/${aws_api_gateway_resource.admin_presigned_url.id}/OPTIONS/200"
}

# --- /admin/jobs ---
import {
  to = module.cors_admin_jobs.aws_api_gateway_method.cors
  id = "${aws_api_gateway_rest_api.this.id}/${aws_api_gateway_resource.admin_jobs.id}/OPTIONS"
}
import {
  to = module.cors_admin_jobs.aws_api_gateway_integration.cors
  id = "${aws_api_gateway_rest_api.this.id}/${aws_api_gateway_resource.admin_jobs.id}/OPTIONS"
}
import {
  to = module.cors_admin_jobs.aws_api_gateway_method_response.cors
  id = "${aws_api_gateway_rest_api.this.id}/${aws_api_gateway_resource.admin_jobs.id}/OPTIONS/200"
}
import {
  to = module.cors_admin_jobs.aws_api_gateway_integration_response.cors
  id = "${aws_api_gateway_rest_api.this.id}/${aws_api_gateway_resource.admin_jobs.id}/OPTIONS/200"
}

# --- /admin/jobs/{id}/publish ---
import {
  to = module.cors_admin_job_publish.aws_api_gateway_method.cors
  id = "${aws_api_gateway_rest_api.this.id}/${aws_api_gateway_resource.admin_job_publish.id}/OPTIONS"
}
import {
  to = module.cors_admin_job_publish.aws_api_gateway_integration.cors
  id = "${aws_api_gateway_rest_api.this.id}/${aws_api_gateway_resource.admin_job_publish.id}/OPTIONS"
}
import {
  to = module.cors_admin_job_publish.aws_api_gateway_method_response.cors
  id = "${aws_api_gateway_rest_api.this.id}/${aws_api_gateway_resource.admin_job_publish.id}/OPTIONS/200"
}
import {
  to = module.cors_admin_job_publish.aws_api_gateway_integration_response.cors
  id = "${aws_api_gateway_rest_api.this.id}/${aws_api_gateway_resource.admin_job_publish.id}/OPTIONS/200"
}

# --- /admin/questions/{id}/review ---
import {
  to = module.cors_admin_question_review.aws_api_gateway_method.cors
  id = "${aws_api_gateway_rest_api.this.id}/${aws_api_gateway_resource.admin_question_review.id}/OPTIONS"
}
import {
  to = module.cors_admin_question_review.aws_api_gateway_integration.cors
  id = "${aws_api_gateway_rest_api.this.id}/${aws_api_gateway_resource.admin_question_review.id}/OPTIONS"
}
import {
  to = module.cors_admin_question_review.aws_api_gateway_method_response.cors
  id = "${aws_api_gateway_rest_api.this.id}/${aws_api_gateway_resource.admin_question_review.id}/OPTIONS/200"
}
import {
  to = module.cors_admin_question_review.aws_api_gateway_integration_response.cors
  id = "${aws_api_gateway_rest_api.this.id}/${aws_api_gateway_resource.admin_question_review.id}/OPTIONS/200"
}

# --- /admin/questions/bulk-review ---
import {
  to = module.cors_admin_bulk_review.aws_api_gateway_method.cors
  id = "${aws_api_gateway_rest_api.this.id}/${aws_api_gateway_resource.admin_bulk_review.id}/OPTIONS"
}
import {
  to = module.cors_admin_bulk_review.aws_api_gateway_integration.cors
  id = "${aws_api_gateway_rest_api.this.id}/${aws_api_gateway_resource.admin_bulk_review.id}/OPTIONS"
}
import {
  to = module.cors_admin_bulk_review.aws_api_gateway_method_response.cors
  id = "${aws_api_gateway_rest_api.this.id}/${aws_api_gateway_resource.admin_bulk_review.id}/OPTIONS/200"
}
import {
  to = module.cors_admin_bulk_review.aws_api_gateway_integration_response.cors
  id = "${aws_api_gateway_rest_api.this.id}/${aws_api_gateway_resource.admin_bulk_review.id}/OPTIONS/200"
}

# --- /me/stats ---
import {
  to = module.cors_me_stats.aws_api_gateway_method.cors
  id = "${aws_api_gateway_rest_api.this.id}/${aws_api_gateway_resource.me_stats.id}/OPTIONS"
}
import {
  to = module.cors_me_stats.aws_api_gateway_integration.cors
  id = "${aws_api_gateway_rest_api.this.id}/${aws_api_gateway_resource.me_stats.id}/OPTIONS"
}
import {
  to = module.cors_me_stats.aws_api_gateway_method_response.cors
  id = "${aws_api_gateway_rest_api.this.id}/${aws_api_gateway_resource.me_stats.id}/OPTIONS/200"
}
import {
  to = module.cors_me_stats.aws_api_gateway_integration_response.cors
  id = "${aws_api_gateway_rest_api.this.id}/${aws_api_gateway_resource.me_stats.id}/OPTIONS/200"
}

# --- /admin/questions/import (CSV) ---
import {
  to = module.cors_admin_questions_import.aws_api_gateway_method.cors
  id = "${aws_api_gateway_rest_api.this.id}/${aws_api_gateway_resource.admin_questions_import.id}/OPTIONS"
}
import {
  to = module.cors_admin_questions_import.aws_api_gateway_integration.cors
  id = "${aws_api_gateway_rest_api.this.id}/${aws_api_gateway_resource.admin_questions_import.id}/OPTIONS"
}
import {
  to = module.cors_admin_questions_import.aws_api_gateway_method_response.cors
  id = "${aws_api_gateway_rest_api.this.id}/${aws_api_gateway_resource.admin_questions_import.id}/OPTIONS/200"
}
import {
  to = module.cors_admin_questions_import.aws_api_gateway_integration_response.cors
  id = "${aws_api_gateway_rest_api.this.id}/${aws_api_gateway_resource.admin_questions_import.id}/OPTIONS/200"
}

# --- /me/bookmarks ---
import {
  to = module.cors_me_bookmarks.aws_api_gateway_method.cors
  id = "${aws_api_gateway_rest_api.this.id}/${aws_api_gateway_resource.me_bookmarks.id}/OPTIONS"
}
import {
  to = module.cors_me_bookmarks.aws_api_gateway_integration.cors
  id = "${aws_api_gateway_rest_api.this.id}/${aws_api_gateway_resource.me_bookmarks.id}/OPTIONS"
}
import {
  to = module.cors_me_bookmarks.aws_api_gateway_method_response.cors
  id = "${aws_api_gateway_rest_api.this.id}/${aws_api_gateway_resource.me_bookmarks.id}/OPTIONS/200"
}
import {
  to = module.cors_me_bookmarks.aws_api_gateway_integration_response.cors
  id = "${aws_api_gateway_rest_api.this.id}/${aws_api_gateway_resource.me_bookmarks.id}/OPTIONS/200"
}
