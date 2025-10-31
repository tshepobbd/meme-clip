Build and push the Lambda container image:

```bash
# from lambda/prod
aws ecr create-repository --repository-name meme-clip || true
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
REGION=$(aws configure get region)
REPO_URI=${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/meme-clip

aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $REPO_URI

docker build -t meme-clip:prod .
docker tag meme-clip:prod $REPO_URI:latest
docker push $REPO_URI:latest

# then create function
aws lambda create-function \
  --function-name meme-clip-prod \
  --package-type Image \
  --code ImageUri=$REPO_URI:latest \
  --role arn:aws:iam::<ACCOUNT_ID>:role/<YOUR_LAMBDA_ROLE>
```

Invoke example event:

```json
{
  "background_bucket": "your-bucket",
  "background_key": "path/background.mp4",
  "image1_bucket": "your-bucket",
  "image1_key": "path/image1.png",
  "image2_bucket": "your-bucket",
  "image2_key": "path/image2.png",
  "output_bucket": "your-output-bucket",
  "output_key": "clips/output.mp4",
  "include_audio": true,
  "duration_seconds": 6
}
```

PowerShell quick push/update (Windows):

```powershell
# From lambda/prod
docker build -t meme-clip:prod .

$REPO  = "534964941091.dkr.ecr.us-east-1.amazonaws.com/meme-clip"  # replace if different
$TAG   = "latest"
$IMAGE = $REPO + ":" + $TAG

docker tag meme-clip:prod $IMAGE
docker push $IMAGE

# Update existing Lambda to this image
aws lambda update-function-code --function-name meme-clip-processor --image-uri $IMAGE
aws lambda wait function-updated --function-name meme-clip-processor
```

docker build -t meme-clip:prod .

docker tag meme-clip:prod 534964941091.dkr.ecr.us-east-1.amazonaws.com/meme-clip:latest

docker push 534964941091.dkr.ecr.us-east-1.amazonaws.com/meme-clip:latest

$REPO = "534964941091.dkr.ecr.us-east-1.amazonaws.com/meme-clip"

$TAG = "latest"

$IMAGE = "$REPO" + ":" + "$TAG"    # or: "${REPO}:$TAG"

echo $IMAGE

aws lambda update-function-code --function-name meme-clip-processor --image-uri $IMAGE

aws lambda wait function-updated --function-name meme-clip-processor
