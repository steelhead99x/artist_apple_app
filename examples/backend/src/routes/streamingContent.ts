import { Router } from 'express';
import { query } from '../db.js';
import { authenticateToken } from '../utils/auth.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Configure multer for thumbnail uploads (images only)
const thumbnailStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/streaming-content/thumbnails';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = uuidv4();
    const extension = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${extension}`);
  }
});

const thumbnailUpload = multer({
  storage: thumbnailStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit for thumbnails
  },
  fileFilter: (req, file, cb) => {
    // Allow only image files for thumbnails
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = /image\//.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only image files are allowed for thumbnails.'));
    }
  }
});

interface MuxDirectUploadResponse {
  data: {
    id: string;
    url: string;
    status?: string;
  };
}

interface MuxAssetResponse {
  data: {
    id: string;
    status: string;
    playback_ids?: Array<{
      id: string;
      playback_url: string;
    }>;
    duration?: number;
    test?: boolean;
  };
}

// POST /api/streaming-content/upload/mux-direct - Create Mux direct upload URL for video/audio
router.post('/upload/mux-direct', authenticateToken, async (req, res) => {
  try {
    const user = req.user!;
    const { title, description, content_type, metadata, tags } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    if (!content_type || !['video', 'audio'].includes(content_type)) {
      return res.status(400).json({ error: 'Content type must be "video" or "audio"' });
    }

    // Create database record FIRST to get the CMS ID (external_id for Mux)
    const contentId = uuidv4();
    const userEmail = (user as any).name || user.email;
    const dbMetadata = JSON.stringify({
      creatorID: user.userId,
      creatorName: userEmail,
      contentType: content_type,
      ...(metadata || {}),
      tags: tags || [],
    });

    // Insert initial record without mux_upload_id (will update later)
    await query(`
      INSERT INTO streaming_content (
        id, user_id, title, description, content_type,
        mux_status, metadata, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, NOW())
    `, [
      contentId,
      user.userId,
      title,
      description || null,
      content_type,
      'pending',
      dbMetadata
    ]);

    // Prepare metadata object with creatorID and custom tags for passthrough
    const contentMetadata: any = {
      creatorID: user.userId,
      creatorName: userEmail,
      contentType: content_type,
      ...(metadata || {}),
    };

    // Add tags if provided
    if (tags && Array.isArray(tags)) {
      contentMetadata.tags = tags;
    }

    // Create Mux direct upload URL with metadata
    // Note: test: false ensures assets appear in production Mux dashboard
    // Set MUX_TEST_MODE=true in .env if you want test mode for development
    const isTestMode = process.env.MUX_TEST_MODE === 'true';
    
    const muxResponse = await fetch('https://api.mux.com/video/v1/uploads', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${process.env.MUX_TOKEN_ID}:${process.env.MUX_TOKEN_SECRET}`).toString('base64')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        test: isTestMode, // Only use test mode if explicitly set
        new_asset_settings: {
          playback_policy: ['public'],
          mp4_support: 'standard',
          meta: {
            title: title, // Title set by user at upload time
            creator_id: user.userId, // Artist ID (user_id)
            external_id: contentId, // Custom CMS ID (streaming_content.id)
          },
          passthrough: JSON.stringify(contentMetadata), // Additional metadata for filtering
        },
        cors_origin: process.env.CORS_ORIGIN?.split(',')[0] || '*',
      })
    });

    if (!muxResponse.ok) {
      const error = await muxResponse.text();
      console.error('Mux direct upload API error:', error);
      console.error('Mux API Status:', muxResponse.status, muxResponse.statusText);
      console.error('Using credentials:', {
        tokenId: process.env.MUX_TOKEN_ID ? `${process.env.MUX_TOKEN_ID.substring(0, 10)}...` : 'NOT SET',
        tokenSecret: process.env.MUX_TOKEN_SECRET ? 'SET' : 'NOT SET',
        testMode: isTestMode
      });
      // Clean up database record if Mux upload creation fails
      await query('DELETE FROM streaming_content WHERE id = $1', [contentId]);
      return res.status(500).json({ 
        error: 'Failed to create Mux direct upload URL',
        details: error,
        status: muxResponse.status
      });
    }

    const muxUpload = await muxResponse.json() as MuxDirectUploadResponse;
    
    // Update database record with mux_upload_id
    const result = await query(`
      UPDATE streaming_content
      SET mux_upload_id = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `, [muxUpload.data.id, contentId]);
    
    // Log successful upload creation for debugging
    console.log('Mux direct upload created:', {
      uploadId: muxUpload.data.id,
      contentId: contentId,
      testMode: isTestMode,
      userId: user.userId,
      creatorId: user.userId,
      externalId: contentId,
      title: title,
      contentType: content_type
    });

    res.status(201).json({
      success: true,
      content: result.rows[0],
      upload_url: muxUpload.data.url,
      upload_id: muxUpload.data.id,
    });

  } catch (error) {
    console.error('Create Mux direct upload error:', error);
    res.status(500).json({ error: 'Failed to create upload URL' });
  }
});

// POST /api/streaming-content/upload/thumbnail - Upload thumbnail securely
router.post('/upload/thumbnail', authenticateToken, thumbnailUpload.single('thumbnail'), async (req, res) => {
  try {
    const user = req.user!;
    const { title, description } = req.body;
    const file = req.file;
    
    // Parse JSON fields from FormData (they come as strings)
    let metadata = {};
    let tags: string[] = [];
    
    if (req.body.metadata) {
      try {
        metadata = typeof req.body.metadata === 'string' ? JSON.parse(req.body.metadata) : req.body.metadata;
      } catch {
        metadata = {};
      }
    }
    
    if (req.body.tags) {
      try {
        tags = typeof req.body.tags === 'string' ? JSON.parse(req.body.tags) : (Array.isArray(req.body.tags) ? req.body.tags : []);
      } catch {
        tags = [];
      }
    }

    if (!file) {
      return res.status(400).json({ error: 'Thumbnail file is required' });
    }

    if (!title) {
      // Delete uploaded file if title is missing
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      return res.status(400).json({ error: 'Title is required' });
    }

    // Generate secure path (not publicly accessible by default)
    const contentId = uuidv4();
    const publicShareToken = uuidv4();

    // Prepare metadata with creatorID
    const userEmail = (user as any).name || user.email;
    const dbMetadata = JSON.stringify({
      creatorID: user.userId,
      creatorName: userEmail,
      contentType: 'thumbnail',
      ...(metadata || {}),
      tags: tags || [],
    });

    // Create database record
    const result = await query(`
      INSERT INTO streaming_content (
        id, user_id, title, description, content_type,
        thumbnail_filename, thumbnail_path, thumbnail_public_enabled,
        public_share_token, file_size, mime_type, metadata, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb, NOW())
      RETURNING *
    `, [
      contentId,
      user.userId,
      title,
      description || null,
      'thumbnail',
      file.originalname,
      file.path,
      false, // Not public by default
      publicShareToken,
      file.size,
      file.mimetype,
      dbMetadata
    ]);

    res.status(201).json({
      success: true,
      content: result.rows[0],
      message: 'Thumbnail uploaded successfully. Use the share link endpoint to generate a public link if needed.'
    });

  } catch (error) {
    console.error('Thumbnail upload error:', error);
    res.status(500).json({ error: 'Failed to upload thumbnail' });
  }
});

// GET /api/streaming-content/mux-status/:uploadId - Check Mux upload/asset status
router.get('/mux-status/:uploadId', authenticateToken, async (req, res) => {
  try {
    const user = req.user!;
    const { uploadId } = req.params;

    // Verify ownership
    const contentResult = await query(`
      SELECT * FROM streaming_content 
      WHERE (mux_upload_id = $1 OR mux_asset_id = $1) AND user_id = $2
    `, [uploadId, user.userId]);

    if (contentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Content not found' });
    }

    const content = contentResult.rows[0];

    // Check Mux upload/asset status
    let muxResponse;
    if (content.mux_upload_id === uploadId) {
      // Check upload status
      muxResponse = await fetch(`https://api.mux.com/video/v1/uploads/${uploadId}`, {
        headers: {
          'Authorization': `Basic ${Buffer.from(`${process.env.MUX_TOKEN_ID}:${process.env.MUX_TOKEN_SECRET}`).toString('base64')}`,
        }
      });
    } else {
      // Check asset status
      muxResponse = await fetch(`https://api.mux.com/video/v1/assets/${uploadId}`, {
        headers: {
          'Authorization': `Basic ${Buffer.from(`${process.env.MUX_TOKEN_ID}:${process.env.MUX_TOKEN_SECRET}`).toString('base64')}`,
        }
      });
    }

    if (!muxResponse.ok) {
      const error = await muxResponse.text();
      console.error('Mux API error:', error);
      return res.status(500).json({ error: 'Failed to check Mux status' });
    }

    const muxData = await muxResponse.json() as any;

    // If upload is complete and has asset_id, update our database
    if (muxData.data?.asset_id && !content.mux_asset_id) {
      const assetId = muxData.data.asset_id;
      console.log('Upload completed, asset created:', assetId);

      // Get asset details
      const assetResponse = await fetch(`https://api.mux.com/video/v1/assets/${assetId}`, {
        headers: {
          'Authorization': `Basic ${Buffer.from(`${process.env.MUX_TOKEN_ID}:${process.env.MUX_TOKEN_SECRET}`).toString('base64')}`,
        }
      });

      if (assetResponse.ok) {
        const assetData = await assetResponse.json() as MuxAssetResponse;
        const playbackId = assetData.data.playback_ids?.[0]?.id;
        const playbackUrl = assetData.data.playback_ids?.[0]?.playback_url;
        
        console.log('Asset details fetched:', {
          assetId,
          status: assetData.data.status,
          playbackId,
          test: assetData.data.test // Check if asset is in test mode
        });

        await query(`
          UPDATE streaming_content 
          SET mux_asset_id = $1, 
              mux_playback_id = $2,
              mux_playback_url = $3,
              mux_status = $4,
              duration_seconds = $5,
              updated_at = NOW()
          WHERE id = $6
        `, [
          assetId,
          playbackId,
          playbackUrl,
          assetData.data.status === 'ready' ? 'ready' : 'processing',
          assetData.data.duration ? Math.floor(assetData.data.duration) : null,
          content.id
        ]);

        // Reload content
        const updatedResult = await query(
          'SELECT * FROM streaming_content WHERE id = $1',
          [content.id]
        );
        
        return res.json({
          success: true,
          content: updatedResult.rows[0],
          mux_status: assetData.data.status,
          mux_data: muxData.data,
          asset_is_test: assetData.data.test || false // Include test flag in response
        });
      } else {
        const assetError = await assetResponse.text();
        console.error('Failed to fetch asset details:', assetError);
      }
    }

    res.json({
      success: true,
      content,
      mux_status: (muxData as any).data?.status || 'unknown',
      mux_data: (muxData as any).data
    });

  } catch (error) {
    console.error('Check Mux status error:', error);
    res.status(500).json({ error: 'Failed to check status' });
  }
});

// GET /api/streaming-content - Get user's streaming content (filtered by creatorID)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const user = req.user!;

    // Filter by user_id (creatorID) to ensure users only see their own content
    const result = await query(`
      SELECT * FROM streaming_content 
      WHERE user_id = $1
      ORDER BY created_at DESC
    `, [user.userId]);

    res.json(result.rows);

  } catch (error) {
    console.error('Get streaming content error:', error);
    res.status(500).json({ error: 'Failed to fetch streaming content' });
  }
});

// GET /api/streaming-content/:id - Get specific streaming content
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const user = req.user!;
    const { id } = req.params;

    const result = await query(`
      SELECT * FROM streaming_content 
      WHERE id = $1 AND user_id = $2
    `, [id, user.userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Content not found' });
    }

    res.json(result.rows[0]);

  } catch (error) {
    console.error('Get streaming content error:', error);
    res.status(500).json({ error: 'Failed to fetch content' });
  }
});

// POST /api/streaming-content/:id/thumbnail/public-link - Generate public link for thumbnail
router.post('/:id/thumbnail/public-link', authenticateToken, async (req, res) => {
  try {
    const user = req.user!;
    const { id } = req.params;
    const { enable } = req.body;

    // Verify ownership
    const contentResult = await query(`
      SELECT * FROM streaming_content 
      WHERE id = $1 AND user_id = $2 AND content_type = 'thumbnail'
    `, [id, user.userId]);

    if (contentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Thumbnail not found' });
    }

    const content = contentResult.rows[0];

    // Generate public link if enabling
    let publicLink = null;
    if (enable !== false) {
      const baseUrl = process.env.APP_URL || process.env.CORS_ORIGIN?.split(',')[0] || 'http://localhost:8787';
      publicLink = `${baseUrl}/api/streaming-content/thumbnail/${content.public_share_token}`;
    }

    await query(`
      UPDATE streaming_content 
      SET thumbnail_public_enabled = $1,
          thumbnail_public_link = $2,
          updated_at = NOW()
      WHERE id = $3
    `, [
      enable !== false,
      publicLink,
      id
    ]);

    const updatedResult = await query(
      'SELECT * FROM streaming_content WHERE id = $1',
      [id]
    );

    res.json({
      success: true,
      content: updatedResult.rows[0],
      public_link: publicLink
    });

  } catch (error) {
    console.error('Generate public link error:', error);
    res.status(500).json({ error: 'Failed to generate public link' });
  }
});

// GET /api/streaming-content/thumbnail/:token - Serve thumbnail via public token (public endpoint)
router.get('/thumbnail/:token', async (req, res) => {
  try {
    const { token } = req.params;

    // Find content by public share token
    const result = await query(`
      SELECT * FROM streaming_content 
      WHERE public_share_token = $1 
        AND content_type = 'thumbnail' 
        AND thumbnail_public_enabled = true
    `, [token]);

    if (result.rows.length === 0) {
      return res.status(404).send('Thumbnail not found or not publicly shared');
    }

    const content = result.rows[0];

    // Validate file path to prevent path traversal
    const resolvedPath = path.resolve(content.thumbnail_path);
    const uploadsDir = path.resolve('uploads/streaming-content/thumbnails');
    
    if (!resolvedPath.startsWith(uploadsDir)) {
      console.error('Path traversal attempt detected:', content.thumbnail_path);
      return res.status(403).send('Access denied');
    }

    // Check if file exists
    if (!fs.existsSync(resolvedPath)) {
      return res.status(404).send('File not found');
    }

    // Set headers and send file
    res.setHeader('Content-Type', content.mime_type || 'image/jpeg');
    res.setHeader('Content-Disposition', `inline; filename="${content.thumbnail_filename}"`);
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year (public cache)
    
    res.sendFile(resolvedPath);

  } catch (error) {
    console.error('Serve thumbnail error:', error);
    res.status(500).send('Error serving thumbnail');
  }
});

// PUT /api/streaming-content/:id/metadata - Update content metadata and tags
router.put('/:id/metadata', authenticateToken, async (req, res) => {
  try {
    const user = req.user!;
    const { id } = req.params;
    const { metadata, tags } = req.body;

    // Verify ownership (filter by creatorID)
    const contentResult = await query(`
      SELECT * FROM streaming_content 
      WHERE id = $1 AND user_id = $2
    `, [id, user.userId]);

    if (contentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Content not found or access denied' });
    }

    const content = contentResult.rows[0];
    const currentMetadata = content.metadata || {};

    // Merge new metadata with existing, preserving creatorID
    const updatedMetadata = {
      ...currentMetadata,
      ...(metadata || {}),
      creatorID: user.userId, // Always preserve creatorID
      creatorName: currentMetadata.creatorName || ((user as any).name || user.email),
    };

    // Update tags if provided
    if (tags !== undefined) {
      updatedMetadata.tags = Array.isArray(tags) ? tags : [];
    }

    // Update database
    const result = await query(`
      UPDATE streaming_content 
      SET metadata = $1::jsonb, updated_at = NOW()
      WHERE id = $2 AND user_id = $3
      RETURNING *
    `, [JSON.stringify(updatedMetadata), id, user.userId]);

    // Optionally update Mux asset metadata if it exists
    if (content.mux_asset_id) {
      try {
        await fetch(`https://api.mux.com/video/v1/assets/${content.mux_asset_id}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Basic ${Buffer.from(`${process.env.MUX_TOKEN_ID}:${process.env.MUX_TOKEN_SECRET}`).toString('base64')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            passthrough: JSON.stringify(updatedMetadata),
          })
        });
      } catch (muxError) {
        console.error('Failed to update Mux asset metadata:', muxError);
        // Continue even if Mux update fails
      }
    }

    res.json({
      success: true,
      content: result.rows[0],
      message: 'Metadata updated successfully'
    });

  } catch (error) {
    console.error('Update metadata error:', error);
    res.status(500).json({ error: 'Failed to update metadata' });
  }
});

// DELETE /api/streaming-content/:id - Delete streaming content
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const user = req.user!;
    const { id } = req.params;

    // Verify ownership
    const contentResult = await query(`
      SELECT * FROM streaming_content 
      WHERE id = $1 AND user_id = $2
    `, [id, user.userId]);

    if (contentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Content not found' });
    }

    const content = contentResult.rows[0];

    // Delete thumbnail file if it exists
    if (content.content_type === 'thumbnail' && content.thumbnail_path) {
      if (fs.existsSync(content.thumbnail_path)) {
        fs.unlinkSync(content.thumbnail_path);
      }
    }

    // Note: We don't delete Mux assets via API here
    // Mux assets will remain on Mux's servers but won't be accessible through our system

    // Delete from database
    await query('DELETE FROM streaming_content WHERE id = $1', [id]);

    res.json({ success: true, message: 'Content deleted successfully' });

  } catch (error) {
    console.error('Delete streaming content error:', error);
    res.status(500).json({ error: 'Failed to delete content' });
  }
});

export default router;

