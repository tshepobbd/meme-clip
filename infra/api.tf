##############################################
# API Gateway + Lambda for receiving images
##############################################

# IAM role for the API Lambda function
data "aws_iam_policy_document" "api_lambda_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "api_lambda" {
  name               = "${var.project_name}-api-lambda-role"
  assume_role_policy = data.aws_iam_policy_document.api_lambda_assume.json
}

# IAM policy for API Lambda: S3 upload, SQS send, CloudWatch logs
data "aws_iam_policy_document" "api_lambda_policy" {
  statement {
    sid    = "CloudWatchLogs"
    effect = "Allow"
    actions = [
      "logs:CreateLogGroup",
      "logs:CreateLogStream",
      "logs:PutLogEvents",
    ]
    resources = ["arn:aws:logs:${var.aws_region}:${data.aws_caller_identity.current.account_id}:*"]
  }

  statement {
    sid    = "S3Upload"
    effect = "Allow"
    actions = [
      "s3:PutObject",
      "s3:GetObject",
      "s3:HeadObject",
    ]
    resources = ["${aws_s3_bucket.media.arn}/*"]
  }

  statement {
    sid    = "SQSSend"
    effect = "Allow"
    actions = [
      "sqs:SendMessage",
    ]
    resources = [aws_sqs_queue.jobs.arn]
  }
}

resource "aws_iam_policy" "api_lambda" {
  name   = "${var.project_name}-api-lambda-policy"
  policy = data.aws_iam_policy_document.api_lambda_policy.json
}

resource "aws_iam_role_policy_attachment" "api_lambda_attach" {
  role       = aws_iam_role.api_lambda.name
  policy_arn = aws_iam_policy.api_lambda.arn
}

# Lambda function (zip deployment)
data "archive_file" "api_lambda_zip" {
  type        = "zip"
  source_dir  = "${path.module}/../lambda/api"
  output_path = "${path.module}/api_lambda.zip"
  excludes    = ["__pycache__", "*.pyc", ".pytest_cache"]
}

resource "aws_lambda_function" "api" {
  filename         = data.archive_file.api_lambda_zip.output_path
  function_name    = "${var.project_name}-api"
  role             = aws_iam_role.api_lambda.arn
  handler          = "handler.lambda_handler"
  source_code_hash = data.archive_file.api_lambda_zip.output_base64sha256
  runtime          = "python3.11"
  timeout          = 30
  memory_size      = 512

  environment {
    variables = {
      S3_BUCKET            = aws_s3_bucket.media.bucket
      OUTPUT_BUCKET        = aws_s3_bucket.media.bucket
      SQS_QUEUE_URL        = aws_sqs_queue.jobs.url
      DEFAULT_BACKGROUND_KEY = "backgrounds/background.mp4"
    }
  }
}

# API Gateway REST API
resource "aws_api_gateway_rest_api" "api" {
  name        = "${var.project_name}-api"
  description = "API for uploading images and triggering video processing"

  endpoint_configuration {
    types = ["REGIONAL"]
  }
}

# API Gateway resource and method
resource "aws_api_gateway_resource" "process" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  parent_id   = aws_api_gateway_rest_api.api.root_resource_id
  path_part   = "process"
}

resource "aws_api_gateway_method" "process_post" {
  rest_api_id   = aws_api_gateway_rest_api.api.id
  resource_id   = aws_api_gateway_resource.process.id
  http_method   = "POST"
  authorization = "NONE"
}

resource "aws_api_gateway_method" "process_get" {
  rest_api_id   = aws_api_gateway_rest_api.api.id
  resource_id   = aws_api_gateway_resource.process.id
  http_method   = "GET"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "process_get" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  resource_id = aws_api_gateway_resource.process.id
  http_method = aws_api_gateway_method.process_get.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.api.invoke_arn
}

resource "aws_api_gateway_method_response" "process_get" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  resource_id = aws_api_gateway_resource.process.id
  http_method = aws_api_gateway_method.process_get.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin" = true
  }
}

resource "aws_api_gateway_method" "process_options" {
  rest_api_id   = aws_api_gateway_rest_api.api.id
  resource_id   = aws_api_gateway_resource.process.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

# CORS mock integration for OPTIONS
resource "aws_api_gateway_integration" "process_options" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  resource_id = aws_api_gateway_resource.process.id
  http_method = aws_api_gateway_method.process_options.http_method

  type = "MOCK"
  request_templates = {
    "application/json" = jsonencode({
      statusCode = 200
    })
  }
}

resource "aws_api_gateway_method_response" "process_options" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  resource_id = aws_api_gateway_resource.process.id
  http_method = aws_api_gateway_method.process_options.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_integration_response" "process_options" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  resource_id = aws_api_gateway_resource.process.id
  http_method = aws_api_gateway_method.process_options.http_method
  status_code = aws_api_gateway_method_response.process_options.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'POST,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

# Lambda integration for POST
resource "aws_api_gateway_integration" "process_post" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  resource_id = aws_api_gateway_resource.process.id
  http_method = aws_api_gateway_method.process_post.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.api.invoke_arn
}

resource "aws_api_gateway_method_response" "process_post" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  resource_id = aws_api_gateway_resource.process.id
  http_method = aws_api_gateway_method.process_post.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin" = true
  }
}

# Lambda permission for API Gateway
resource "aws_lambda_permission" "api_gateway" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.api.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.api.execution_arn}/*/*"
}

# API Gateway deployment
resource "aws_api_gateway_deployment" "api" {
  depends_on = [
    aws_api_gateway_integration.process_post,
    aws_api_gateway_integration.process_get,
    aws_api_gateway_integration.process_options,
  ]

  rest_api_id = aws_api_gateway_rest_api.api.id
  
  # Force new deployment when Lambda code changes
  triggers = {
    redeployment = sha1(jsonencode([
      aws_api_gateway_integration.process_post.uri,
      aws_api_gateway_integration.process_get.uri,
      aws_api_gateway_integration.process_options.id,
      aws_api_gateway_method_response.process_get.id,
    ]))
  }

  lifecycle {
    create_before_destroy = true
  }
}

# API Gateway stage
resource "aws_api_gateway_stage" "prod" {
  rest_api_id   = aws_api_gateway_rest_api.api.id
  deployment_id = aws_api_gateway_deployment.api.id
  stage_name    = "prod"
}

# Output for API URL is defined centrally in outputs.tf

