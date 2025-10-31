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


