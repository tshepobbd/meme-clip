variable "project_name" {
  description = "Prefix for created resources"
  type        = string
  default     = "meme-clip"
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "s3_bucket_name" {
  description = "S3 bucket name to store media"
  type        = string
}

variable "sqs_queue_name" {
  description = "SQS queue name"
  type        = string
  default     = "meme-clip-jobs"
}

variable "lambda_image_uri" {
  description = "ECR image URI for the Lambda container"
  type        = string
  default     = ""
}

variable "ecr_repository_name" {
  description = "Name of the ECR repository to create for the Lambda image"
  type        = string
  default     = "meme-clip"
}

# Amplify Hosting variables
variable "amplify_repository_url" {
  description = "Git repository URL (e.g., https://github.com/owner/repo)"
  type        = string
  default     = ""
}

variable "amplify_github_token" {
  description = "GitHub Personal Access Token with repo scope (use TF_VAR_amplify_github_token)"
  type        = string
  default     = ""
  sensitive   = true
}

variable "amplify_branch_name" {
  description = "Repository branch to build (e.g., main)"
  type        = string
  default     = "main"
}

variable "frontend_app_root" {
  description = "Monorepo app root for Amplify (path to Next.js, e.g., frontend)"
  type        = string
  default     = "frontend"
}

variable "frontend_next_public_api_base_url" {
  description = "Optional NEXT_PUBLIC_API_BASE_URL to inject into Amplify build"
  type        = string
  default     = ""
}


