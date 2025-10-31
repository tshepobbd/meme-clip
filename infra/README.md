Usage

1. Set variables (bucket name and image URI):

```bash
cat > terraform.tfvars <<EOF
aws_region      = "us-east-1"
s3_bucket_name  = "your-media-bucket-name"
sqs_queue_name  = "meme-clip-jobs"
lambda_image_uri = "${ACCOUNT_ID}.dkr.ecr.us-east-1.amazonaws.com/meme-clip:latest"
EOF
```

2. Apply:

```bash
terraform init
terraform apply
```

Outputs will include the S3 bucket name, SQS queue URL, and Lambda name.

## Amplify Hosting (Terraform)

Provide your GitHub repo and token, then apply:

```bash
cat >> terraform.tfvars <<EOF
amplify_repository_url = "https://github.com/<owner>/<repo>"
amplify_branch_name    = "main"
frontend_app_root      = "frontend"
# set via environment for safety
EOF

# Set sensitive token in env (PowerShell)
$env:TF_VAR_amplify_github_token = "<YOUR_GITHUB_PAT>"

terraform apply \
  -var "s3_bucket_name=your-media-bucket"
```

After apply, check:

```bash
terraform output amplify_branch_url
terraform output amplify_default_domain
```

terraform apply -auto-approve -var="amplify_github_token=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"
