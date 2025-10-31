FROM public.ecr.aws/lambda/python:3.11

# Install ffmpeg (required by moviepy)
RUN dnf install -y ffmpeg && dnf clean all || yum install -y ffmpeg || true

# Copy and install dependencies
COPY requirements.txt ./
RUN pip install --no-cache-dir --prefer-binary -r requirements.txt --target "${LAMBDA_TASK_ROOT}"

# Copy handler code
COPY handler.py ${LAMBDA_TASK_ROOT}

# Set the CMD to your handler
CMD [ "handler.lambda_handler" ]

