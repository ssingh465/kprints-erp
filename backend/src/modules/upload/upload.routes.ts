import { Hono } from 'hono';
import { supabase } from '../../lib/supabase.js';
import { prisma } from '../../lib/prisma.js';
import { protect, requireWrite } from '../../middleware/protect.js';
import { rateLimit } from '../../middleware/rate-limit.js';
import { audit } from '../../services/audit.service.js';
import type { AuthVariables } from '../../types/auth.js';

const uploadApp = new Hono<{ Variables: AuthVariables }>();

uploadApp.use('*', ...protect('upload'));

const uploadRateLimit = rateLimit({ windowMs: 60_000, max: 30 });

uploadApp.post('/', requireWrite('upload'), uploadRateLimit, async (c) => {
  try {
    const body = await c.req.parseBody();
    const file = body.file as File;
    const bucket = (body.bucket as string) || 'artworks';
    const orderId = body.orderId as string;
    const actor = c.get('appUser');

    if (!file) {
      return c.json({
        success: false,
        error: 'BadRequest',
        message: 'No file found in multipart upload',
      }, 400);
    }

    const buffer = await file.arrayBuffer();
    const fileExt = file.name.split('.').pop();
    const uniqueName = `${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}.${fileExt}`;

    const { error } = await supabase.storage
      .from(bucket)
      .upload(uniqueName, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (error) {
      throw error;
    }

    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(uniqueName);
    const fileUrl = urlData.publicUrl;

    let metadataRecord = null;
    if (orderId && bucket === 'artworks') {
      metadataRecord = await prisma.artworkUpload.create({
        data: {
          orderId,
          fileName: file.name,
          fileUrl,
          storagePath: uniqueName,
          mimeType: file.type,
        },
      });

      await audit.log({
        userId: actor?.id,
        action: 'upload',
        entity: 'artwork',
        entityId: metadataRecord.id,
        metadata: { fileName: file.name, orderId },
      });
    }

    const { data: signedUrlData } = await supabase.storage
      .from(bucket)
      .createSignedUrl(uniqueName, 60 * 60 * 24);

    return c.json({
      success: true,
      data: {
        fileName: file.name,
        storagePath: uniqueName,
        publicUrl: fileUrl,
        signedUrl: signedUrlData?.signedUrl || fileUrl,
        metadata: metadataRecord,
      },
      message: 'File successfully uploaded and stored',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Upload failed';
    return c.json({
      success: false,
      error: 'FileUploadError',
      message,
    }, 500);
  }
});

export default uploadApp;
