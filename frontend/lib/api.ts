/**
 * Helper functions for calling the API Gateway endpoint
 */

/**
 * Get presigned S3 URLs for uploading images
 */
async function getPresignedUrls(jobId: string): Promise<{
  job_id: string;
  image1_key: string;
  image1_url: string;
  image2_key: string;
  image2_url: string;
}> {
  const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!apiUrl) {
    throw new Error("NEXT_PUBLIC_API_BASE_URL is not set");
  }

  const url = new URL(apiUrl);
  url.searchParams.set("action", "presign");
  url.searchParams.set("job_id", jobId);

  const response = await fetch(url.toString(), {
    method: "GET",
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ error: response.statusText }));
    throw new Error(
      error.error || `HTTP ${response.status}: ${response.statusText}`
    );
  }

  return response.json();
}

/**
 * Upload a File directly to S3 using a presigned URL
 */
async function uploadToS3(file: File, presignedUrl: string): Promise<void> {
  const response = await fetch(presignedUrl, {
    method: "PUT",
    body: file,
    headers: {
      "Content-Type": file.type || "image/png",
    },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to upload to S3: ${response.status} ${response.statusText}`
    );
  }
}

/**
 * Process images through the API Gateway Lambda
 * Uses presigned S3 URLs to upload images directly, bypassing API Gateway size limits
 */
export interface ProcessImagesParams {
  image1: File; // Must be a File object (not base64)
  image2: File; // Must be a File object (not base64)
  backgroundKey?: string;
  includeAudio?: boolean;
  durationSeconds?: number;
  jobId?: string;
}

export interface ProcessImagesResponse {
  message: string;
  job_id: string;
  image1_key: string;
  image2_key: string;
  output_key: string;
  output_url: string;
}

export interface JobStatusResponse {
  status: "processing" | "completed";
  job_id: string;
  output_key?: string;
  download_url?: string;
  output_url?: string;
}

export async function processImages(
  params: ProcessImagesParams
): Promise<ProcessImagesResponse> {
  const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

  if (!apiUrl) {
    throw new Error("NEXT_PUBLIC_API_BASE_URL is not set");
  }

  // Generate job ID if not provided
  const jobId = params.jobId || Math.random().toString(36).slice(2, 10);

  // Step 1: Get presigned URLs
  const presigned = await getPresignedUrls(jobId);

  // Step 2: Upload images directly to S3
  await Promise.all([
    uploadToS3(params.image1, presigned.image1_url),
    uploadToS3(params.image2, presigned.image2_url),
  ]);

  // Step 3: Trigger processing by POSTing S3 keys
  const body = {
    job_id: jobId,
    image1_key: presigned.image1_key,
    image2_key: presigned.image2_key,
    ...(params.backgroundKey && { background_key: params.backgroundKey }),
    ...(params.includeAudio !== undefined && {
      include_audio: params.includeAudio,
    }),
    ...(params.durationSeconds !== undefined && {
      duration_seconds: params.durationSeconds,
    }),
  };

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ error: response.statusText }));
    throw new Error(
      error.error || `HTTP ${response.status}: ${response.statusText}`
    );
  }

  const json = await response.json();
  try {
    if (json.job_id) {
      localStorage.setItem("memeclip:lastJobId", json.job_id);
    }
  } catch {}
  return json;
}

/**
 * Check the status of a video processing job by polling S3
 */
export async function checkJobStatus(
  jobId: string
): Promise<JobStatusResponse> {
  const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!apiUrl) {
    throw new Error("NEXT_PUBLIC_API_BASE_URL is not set");
  }

  const url = new URL(apiUrl);
  url.searchParams.set("action", "status");
  url.searchParams.set("job_id", jobId);

  const response = await fetch(url.toString(), {
    method: "GET",
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ error: response.statusText }));
    throw new Error(
      error.error || `HTTP ${response.status}: ${response.statusText}`
    );
  }

  return response.json();
}

/**
 * Poll job status until completion, with progress callback
 */
export async function pollJobStatus(
  jobId: string,
  onProgress?: (status: JobStatusResponse) => void,
  maxAttempts: number = 120, // 2 minutes at 1s intervals
  intervalMs: number = 1000
): Promise<JobStatusResponse> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const status = await checkJobStatus(jobId);

    if (onProgress) {
      onProgress(status);
    }

    if (status.status === "completed") {
      return status;
    }

    // Wait before next poll
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error(
    "Job polling timeout - video processing is taking longer than expected"
  );
}
