output "s3_bucket_name" {
  description = "S3 bucket for media"
  value       = aws_s3_bucket.media.bucket
}

output "sqs_queue_url" {
  description = "SQS queue URL for jobs"
  value       = aws_sqs_queue.jobs.id
}

output "lambda_name" {
  description = "Lambda function name"
  value       = length(aws_lambda_function.processor) > 0 ? aws_lambda_function.processor[0].function_name : ""
}

output "ecr_repository_url" {
  description = "ECR repository URL for pushing images"
  value       = aws_ecr_repository.lambda_repo.repository_url
}

output "aws_account_id" {
  description = "AWS account ID from the current credentials"
  value       = data.aws_caller_identity.current.account_id
}

output "aws_region" {
  description = "AWS region used by the provider"
  value       = var.aws_region
}

output "amplify_app_id" {
  description = "Amplify app id"
  value       = aws_amplify_app.frontend.id
}

output "amplify_default_domain" {
  description = "Amplify default domain"
  value       = aws_amplify_app.frontend.default_domain
}

output "amplify_branch_url" {
  description = "Amplify branch URL"
  value       = "https://${var.amplify_branch_name}.${aws_amplify_app.frontend.default_domain}"
}

output "api_gateway_url" {
  description = "API Gateway endpoint URL for processing images"
  value       = "https://${aws_api_gateway_rest_api.api.id}.execute-api.${var.aws_region}.amazonaws.com/${aws_api_gateway_stage.prod.stage_name}/process"
}


