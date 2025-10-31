##############################################
# Amplify Hosting for Next.js (monorepo)
##############################################

resource "aws_amplify_app" "frontend" {
  name         = "${var.project_name}-frontend"
  repository   = var.amplify_repository_url # e.g., https://github.com/youruser/yourrepo
  oauth_token  = var.amplify_github_token   # GitHub PAT with repo scope

  environment_variables = {
    AMPLIFY_MONOREPO_APP_ROOT = var.frontend_app_root   # "frontend"
    # Next.js public envs can be added here too
    NEXT_PUBLIC_API_BASE_URL   = var.frontend_next_public_api_base_url != "" ? var.frontend_next_public_api_base_url : ""
  }

  build_spec = <<-YAML
    version: 1
    applications:
      - appRoot: ${var.frontend_app_root}
        frontend:
          phases:
            preBuild:
              commands:
                - npm ci
            build:
              commands:
                - npm run build
          artifacts:
            baseDirectory: .next
            files:
              - '**/*'
          cache:
            paths:
              - node_modules/**/*
  YAML
}

resource "aws_amplify_branch" "frontend_main" {
  app_id      = aws_amplify_app.frontend.id
  branch_name = var.amplify_branch_name   # e.g., "main"
  enable_auto_build = true

  environment_variables = {
    # Example extra envs for runtime/build
    NEXT_PUBLIC_S3_BUCKET = aws_s3_bucket.media.bucket
  }
}

output "amplify_app_id" {
  value       = aws_amplify_app.frontend.id
  description = "Amplify app id"
}

output "amplify_default_domain" {
  value       = aws_amplify_app.frontend.default_domain
  description = "Amplify default domain"
}

output "amplify_branch_url" {
  value       = "https://${var.amplify_branch_name}.${aws_amplify_app.frontend.default_domain}"
  description = "Amplify branch URL"
}


