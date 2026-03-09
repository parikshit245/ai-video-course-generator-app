import { promises as fs } from "fs";
import path from "path";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

// ================= AUDIO STORAGE MODE SELECTOR =================
// Change the AUDIO_STORAGE environment variable in .env.local to toggle:
//
// AUDIO_STORAGE=local  → Saves audio to public/audio/ folder (FREE, testing)
// AUDIO_STORAGE=s3     → Uploads audio to AWS S3 (PAID, production)
//
// See .env.example for configuration instructions
// ================================================================

const STORAGE_TYPE = process.env.AUDIO_STORAGE || "local"; // "local" or "s3"

console.log(`🎵 Audio Storage Mode: ${STORAGE_TYPE.toUpperCase()}`);
if (STORAGE_TYPE === "local") {
  console.log(`📁 Audio files will be saved to: public/audio/`);
} else if (STORAGE_TYPE === "s3") {
  console.log(`☁️  Audio files will be uploaded to AWS S3`);
}

// ================= LOCAL STORAGE =================
const LOCAL_STORAGE_DIR = path.join(process.cwd(), "public", "audio");

const ensureLocalStorageDir = async () => {
  try {
    await fs.mkdir(LOCAL_STORAGE_DIR, { recursive: true });
  } catch (error) {
    console.error("Failed to create local storage directory:", error);
  }
};

const saveAudioLocal = async (
  audioBuffer: Buffer,
  audioFileName: string,
): Promise<string> => {
  await ensureLocalStorageDir();

  const filePath = path.join(LOCAL_STORAGE_DIR, `${audioFileName}.mp3`);
  await fs.writeFile(filePath, audioBuffer);

  // Return public URL accessible from frontend
  const audioUrl = `/audio/${audioFileName}.mp3`;
  console.log(`✓ Audio saved locally: ${audioUrl}`);
  return audioUrl;
};

// ================= S3 STORAGE =================
const s3 = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

const saveAudioS3 = async (
  audioBuffer: Buffer,
  audioFileName: string,
): Promise<string> => {
  if (!process.env.AWS_BUCKET_NAME) {
    throw new Error("AWS_BUCKET_NAME environment variable is not set");
  }

  const fileName = `tts/${audioFileName}.mp3`;

  await s3.send(
    new PutObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: fileName,
      Body: audioBuffer,
      ContentType: "audio/mpeg",
    }),
  );

  const audioUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;
  console.log(`✓ Audio uploaded to S3: ${audioUrl}`);
  return audioUrl;
};

// ================= UNIFIED STORAGE INTERFACE =================
export const saveAudio = async (
  audioBuffer: Buffer,
  audioFileName: string,
): Promise<string> => {
  if (STORAGE_TYPE === "s3") {
    return saveAudioS3(audioBuffer, audioFileName);
  } else {
    return saveAudioLocal(audioBuffer, audioFileName);
  }
};

export const getStorageType = (): string => STORAGE_TYPE;
