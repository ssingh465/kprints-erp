import { Hono } from 'hono';
import { supabase } from '../../lib/supabase.js';
import { prisma } from '../../lib/prisma.js';

const uploadApp = new Hono();

// Upload file to Supabase Storage & Save Metadata
uploadApp.post('/', async (c) => {
  try {
    const body = await c.req.parseBody();
    const file = body.file as File;
    const bucket = (body.bucket as string) || 'artworks';
    const orderId = body.orderId as string;

    if (!file) {
      return c.json({
        success: false,
        error: 'BadRequest',
        message: 'No file found in multipart upload'
      }, 400);
    }

    const buffer = await file.arrayBuffer();
    const fileExt = file.name.split('.').pop();
    const uniqueName = `${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}.${fileExt}`;

    // Upload using Supabase storage Client
    const { error } = await supabase.storage
      .from(bucket)
      .upload(uniqueName, buffer, {
        contentType: file.type,
        upsert: true
      });

    if (error) {
      throw error;
    }

    // Get public URL for the file
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(uniqueName);

    const fileUrl = urlData.publicUrl;

    // Persist metadata if it's an artwork upload for an order
    let metadataRecord = null;
    if (orderId && bucket === 'artworks') {
      metadataRecord = await prisma.artworkUpload.create({
        data: {
          orderId,
          fileName: file.name,
          fileUrl,
          mimeType: file.type
        }
      });
    }

    // Generate Pre-signed URL as requested
    const { data: signedUrlData, error: signError } = await supabase.storage
      .from(bucket)
      .createSignedUrl(uniqueName, 60 * 60 * 24); // Valid for 24 hours

    return c.json({
      success: true,
      data: {
        fileName: file.name,
        storagePath: uniqueName,
        publicUrl: fileUrl,
        signedUrl: signedUrlData?.signedUrl || fileUrl,
        metadata: metadataRecord
      },
      message: 'File successfully uploaded and stored'
    });
  } catch (error: any) {
    return c.json({
      success: false,
      error: 'FileUploadError',
      message: error.message
    }, 500);
  }
});

export default uploadApp;
