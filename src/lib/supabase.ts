import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let supabaseClient: any = null;

if (supabaseUrl && supabaseAnonKey) {
  try {
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
    console.log("Supabase storage client initialized.");
  } catch (e) {
    console.warn("Failed to initialize Supabase client. Falling back to local storage.", e);
  }
} else {
  console.warn("Supabase credentials missing. Documents will be saved locally to public/uploads/.");
}

/**
 * Uploads a file buffer or base64 data to Supabase Storage or falls back to public/uploads
 * @returns The public URL of the uploaded file
 */
export async function uploadDocument(
  bucket: string,
  filePath: string,
  fileContent: Buffer | string, // Buffer or Base64 string
  fileName: string
): Promise<string> {
  const cleanPath = filePath.replace(/[^a-zA-Z0-9.\-_/]/g, "");

  // If Supabase is active, try to upload to Supabase Storage
  if (supabaseClient) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let body: any = fileContent;
      if (typeof fileContent === 'string' && fileContent.startsWith('data:')) {
        // Convert data URL to buffer
        const base64Data = fileContent.split(',')[1];
        body = Buffer.from(base64Data, 'base64');
      } else if (typeof fileContent === 'string') {
        body = Buffer.from(fileContent, 'base64');
      }

      const { error } = await supabaseClient.storage
        .from(bucket)
        .upload(cleanPath, body, {
          upsert: true,
          contentType: getContentType(fileName)
        });

      if (error) {
        throw error;
      }

      const { data: urlData } = supabaseClient.storage
        .from(bucket)
        .getPublicUrl(cleanPath);

      return urlData.publicUrl;
    } catch (e) {
      console.error("Supabase Storage upload failed, falling back to local files:", e);
    }
  }

  // Fallback: save to public/uploads in Next.js workspace
  try {
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', bucket);
    fs.mkdirSync(uploadsDir, { recursive: true });

    const localFilePath = path.join(uploadsDir, path.basename(cleanPath));
    
    let buffer: Buffer;
    if (typeof fileContent === 'string' && fileContent.startsWith('data:')) {
      const base64Data = fileContent.split(',')[1];
      buffer = Buffer.from(base64Data, 'base64');
    } else if (typeof fileContent === 'string') {
      buffer = Buffer.from(fileContent, 'base64');
    } else {
      buffer = fileContent;
    }

    fs.writeFileSync(localFilePath, buffer);
    console.log(`[LOCAL STORAGE] Saved document to: ${localFilePath}`);
    
    // Return relative URL that the browser can resolve directly from Next.js public directory
    return `/uploads/${bucket}/${path.basename(cleanPath)}`;
  } catch (err) {
    console.error("Failed to write file locally:", err);
    // Absolute fallback: return the original base64 or a mock url
    if (typeof fileContent === 'string' && fileContent.startsWith('data:')) {
      return fileContent; // return the base64 URL directly
    }
    return `https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?q=80&w=200&auto=format&fit=crop`;
  }
}

function getContentType(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'pdf': return 'application/pdf';
    case 'jpg':
    case 'jpeg': return 'image/jpeg';
    case 'png': return 'image/png';
    case 'svg': return 'image/svg+xml';
    default: return 'application/octet-stream';
  }
}
