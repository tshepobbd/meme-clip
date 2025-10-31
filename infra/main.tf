terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# Current caller/account (for outputs convenience)
data "aws_caller_identity" "current" {}

# Random suffix for globally-unique names
resource "random_id" "media_suffix" {
  byte_length = 2
}

# -------------------------
# ECR repository for Lambda image
# -------------------------
resource "aws_ecr_repository" "lambda_repo" {
  name                 = var.ecr_repository_name
  image_tag_mutability = "MUTABLE"
  image_scanning_configuration { scan_on_push = true }
  encryption_configuration { encryption_type = "AES256" }
}

# -------------------------
# S3 bucket to store inputs/outputs
# -------------------------
resource "aws_s3_bucket" "media" {
  # S3 bucket names must be globally unique. Append a short random suffix.
  bucket = "${var.s3_bucket_name}-${random_id.media_suffix.hex}"
}

resource "aws_s3_bucket_versioning" "media" {
  bucket = aws_s3_bucket.media.id
  versioning_configuration { status = "Enabled" }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "media" {
  bucket = aws_s3_bucket.media.id
  rule {
    apply_server_side_encryption_by_default { sse_algorithm = "AES256" }
  }
}

resource "aws_s3_bucket_public_access_block" "media" {
  bucket                  = aws_s3_bucket.media.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# -------------------------
# SQS queue for work items
# -------------------------
resource "aws_sqs_queue" "jobs" {
  name                      = var.sqs_queue_name
  visibility_timeout_seconds = 900  # up to Lambda max timeout
  message_retention_seconds  = 1209600
  receive_wait_time_seconds  = 10
  sqs_managed_sse_enabled    = true
}

# -------------------------
# IAM for Lambda
# -------------------------
data "aws_iam_policy_document" "lambda_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "lambda" {
  name               = "${var.project_name}-lambda-role"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume.json
}

data "aws_iam_policy_document" "lambda_policy" {
  statement {
    sid     = "AllowLogs"
    actions = [
      "logs:CreateLogGroup",
      "logs:CreateLogStream",
      "logs:PutLogEvents"
    ]
    resources = ["arn:aws:logs:*:*:*"]
  }

  statement {
    sid     = "AllowS3Access"
    actions = [
      "s3:GetObject",
      "s3:PutObject",
      "s3:ListBucket"
    ]
    resources = [
      aws_s3_bucket.media.arn,
      "${aws_s3_bucket.media.arn}/*"
    ]
  }

  statement {
    sid     = "AllowSQSAccess"
    actions = [
      "sqs:ReceiveMessage",
      "sqs:DeleteMessage",
      "sqs:GetQueueAttributes",
      "sqs:ChangeMessageVisibility"
    ]
    resources = [aws_sqs_queue.jobs.arn]
  }
}

resource "aws_iam_policy" "lambda" {
  name   = "${var.project_name}-lambda-policy"
  policy = data.aws_iam_policy_document.lambda_policy.json
}

resource "aws_iam_role_policy_attachment" "lambda_attach" {
  role       = aws_iam_role.lambda.name
  policy_arn = aws_iam_policy.lambda.arn
}

# -------------------------
# Lambda function (container image)
# -------------------------
resource "aws_lambda_function" "processor" {
  count         = var.lambda_image_uri == "" ? 0 : 1
  function_name = "${var.project_name}-processor"
  role          = aws_iam_role.lambda.arn
  package_type  = "Image"
  image_uri     = var.lambda_image_uri

  timeout      = 900
  memory_size  = 3008
  architectures = ["x86_64"]

  environment {
    variables = {
      MEDIA_BUCKET = aws_s3_bucket.media.bucket
    }
  }
}

# Trigger Lambda from SQS
resource "aws_lambda_event_source_mapping" "sqs_trigger" {
  count        = length(aws_lambda_function.processor)
  event_source_arn = aws_sqs_queue.jobs.arn
  function_name    = aws_lambda_function.processor[0].arn
  batch_size       = 1
  maximum_batching_window_in_seconds = 0
}

