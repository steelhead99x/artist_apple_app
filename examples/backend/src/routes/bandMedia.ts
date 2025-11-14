import { Router } from 'express';
import { query } from '../db.js';
import { authenticateToken } from '../utils/auth.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/band-media';
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

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow thumbnails (images), videos, and audio only
    const allowedTypes = /jpeg|jpg|png|gif|webp|mp4|mov|avi|webm|mp3|wav|flac|m4a/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = /image\/|video\/|audio\//.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only thumbnails (images), videos, and audio files are allowed.'));
    }
  }
});

// POST /api/band-media/upload - Upload media files for a band
router.post('/upload', authenticateToken, upload.array('files', 10), async (req, res) => {
  try {
    const user = req.user;
    const { band_id } = req.body;
    const files = req.files as Express.Multer.File[];

    if (!band_id) {
      return res.status(400).json({ error: 'Band ID is required' });
    }

    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files provided' });
    }

    // Verify band exists and user has permission
    const bandResult = await query(
      'SELECT user_id, booking_manager_id FROM bands WHERE id = $1',
      [band_id]
    );

    if (bandResult.rows.length === 0) {
      return res.status(404).json({ error: 'Band not found' });
    }

    const band = bandResult.rows[0];

    // Check permissions: band owner, band members, or booking agent
    let hasPermission = false;
    
    if (user?.userType === 'booking_agent' && band.booking_manager_id === user.userId) {
      hasPermission = true;
    } else if (user?.userType === 'band' && band.user_id === user.userId) {
      hasPermission = true;
    } else if (user?.userType === 'user') {
      // Check if user is the band owner OR a band member
      if (band.user_id === user.userId) {
        hasPermission = true;
      } else {
        const memberResult = await query(
          'SELECT id FROM band_members WHERE band_id = $1 AND user_id = $2 AND status = $3',
          [band_id, user.userId, 'active']
        );
        if (memberResult.rows.length > 0) {
          hasPermission = true;
        }
      }
    }

    if (!hasPermission) {
      return res.status(403).json({ error: 'Only band members and booking agents can upload media' });
    }

    const uploadedMedia = [];

    for (const file of files) {
      // Determine media type: thumbnail, video, or audio
      let mediaType = 'audio';
      if (file.mimetype.startsWith('image/')) {
        mediaType = 'thumbnail';
      } else if (file.mimetype.startsWith('video/')) {
        mediaType = 'video';
      } else if (file.mimetype.startsWith('audio/')) {
        mediaType = 'audio';
      }

      // Save metadata to database
      const result = await query(`
        INSERT INTO band_media (band_id, file_name, file_path, file_size, mime_type, media_type, uploaded_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `, [
        band_id,
        file.originalname,
        file.path,
        file.size,
        file.mimetype,
        mediaType,
        user?.userId
      ]);

      uploadedMedia.push(result.rows[0]);
    }

    res.json({
      success: true,
      media: uploadedMedia,
      message: `Successfully uploaded ${uploadedMedia.length} file(s)`
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// GET /api/band-media/:bandId - Get media files for a band
router.get('/:bandId', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    const { bandId } = req.params;

    // Get band info
    const bandResult = await query(
      'SELECT user_id, booking_manager_id FROM bands WHERE id = $1',
      [bandId]
    );

    if (bandResult.rows.length === 0) {
      return res.status(404).json({ error: 'Band not found' });
    }

    const band = bandResult.rows[0];

    // Check permissions: band owner, band members, or booking agent
    let hasPermission = false;
    
    if (user?.userType === 'booking_agent' && band.booking_manager_id === user.userId) {
      hasPermission = true;
    } else if (user?.userType === 'band' && band.user_id === user.userId) {
      hasPermission = true;
    } else if (user?.userType === 'user') {
      // Check if user is the band owner OR a band member
      if (band.user_id === user.userId) {
        hasPermission = true;
      } else {
        const memberResult = await query(
          'SELECT id FROM band_members WHERE band_id = $1 AND user_id = $2 AND status = $3',
          [bandId, user.userId, 'active']
        );
        if (memberResult.rows.length > 0) {
          hasPermission = true;
        }
      }
    }

    if (!hasPermission) {
      return res.status(403).json({ error: 'Only band members and booking agents can view media' });
    }

    const result = await query(`
      SELECT bm.*, u.name as uploaded_by_name
      FROM band_media bm
      JOIN users u ON bm.uploaded_by = u.id
      WHERE bm.band_id = $1
      ORDER BY bm.created_at DESC
    `, [bandId]);

    res.json(result.rows);

  } catch (error) {
    console.error('Get media error:', error);
    res.status(500).json({ error: 'Failed to fetch media' });
  }
});

// DELETE /api/band-media/:id - Delete media file
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;

    // Get media info
    const mediaResult = await query(`
      SELECT bm.*, b.user_id, b.booking_manager_id
      FROM band_media bm
      JOIN bands b ON bm.band_id = b.id
      WHERE bm.id = $1
    `, [id]);

    if (mediaResult.rows.length === 0) {
      return res.status(404).json({ error: 'Media not found' });
    }

    const media = mediaResult.rows[0];

    // Check permissions: band owner, band members, booking agent, or file uploader
    let hasPermission = false;
    
    if (user?.userType === 'booking_agent' && media.booking_manager_id === user.userId) {
      hasPermission = true;
    } else if (user?.userType === 'band' && media.user_id === user.userId) {
      hasPermission = true;
    } else if (user && media.uploaded_by === user.userId) {
      // User uploaded the file themselves
      hasPermission = true;
    } else if (user?.userType === 'user') {
      // Check if user is the band owner OR a band member
      if (media.user_id === user.userId) {
        hasPermission = true;
      } else {
        const memberResult = await query(
          'SELECT id FROM band_members WHERE band_id = $1 AND user_id = $2 AND status = $3',
          [media.band_id, user.userId, 'active']
        );
        if (memberResult.rows.length > 0) {
          hasPermission = true;
        }
      }
    }

    if (!hasPermission) {
      return res.status(403).json({ error: 'Only band members, booking agents, or the uploader can delete media' });
    }

    // Delete file from filesystem
    if (fs.existsSync(media.file_path)) {
      fs.unlinkSync(media.file_path);
    }

    // Delete from database
    await query('DELETE FROM band_media WHERE id = $1', [id]);

    res.json({ success: true });

  } catch (error) {
    console.error('Delete media error:', error);
    res.status(500).json({ error: 'Failed to delete media' });
  }
});

// GET /api/band-media/file/:id - Serve media file
// SECURITY FIX: Require authentication to access media files
router.get('/file/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    // Get media info with band ownership
    const result = await query(`
      SELECT bm.file_path, bm.mime_type, bm.file_name, bm.band_id, b.user_id, b.booking_manager_id
      FROM band_media bm
      JOIN bands b ON bm.band_id = b.id
      WHERE bm.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).send('Media not found');
    }

    const media = result.rows[0];

    // SECURITY: Check permissions before serving file
    let hasPermission = false;
    
    if (user?.userType === 'booking_agent' && media.booking_manager_id === user.userId) {
      hasPermission = true;
    } else if (user?.userType === 'band' && media.user_id === user.userId) {
      hasPermission = true;
    } else if (user?.userType === 'user') {
      // Check if user is the band owner OR a band member
      if (media.user_id === user.userId) {
        hasPermission = true;
      } else {
        const memberResult = await query(
          'SELECT id FROM band_members WHERE band_id = $1 AND user_id = $2 AND status = $3',
          [media.band_id, user.userId, 'active']
        );
        if (memberResult.rows.length > 0) {
          hasPermission = true;
        }
      }
    }

    if (!hasPermission) {
      return res.status(403).send('Access denied');
    }

    // SECURITY: Validate file path to prevent path traversal
    const resolvedPath = path.resolve(media.file_path);
    const uploadsDir = path.resolve('uploads/band-media');
    
    if (!resolvedPath.startsWith(uploadsDir)) {
      console.error('Path traversal attempt detected:', media.file_path);
      return res.status(403).send('Access denied');
    }

    // Check if file exists
    if (!fs.existsSync(resolvedPath)) {
      return res.status(404).send('File not found');
    }

    // Set headers and send file
    res.setHeader('Content-Type', media.mime_type);
    res.setHeader('Content-Disposition', `inline; filename="${media.file_name}"`);
    res.setHeader('Cache-Control', 'private, max-age=3600'); // Cache for 1 hour (private cache)
    
    res.sendFile(resolvedPath);

  } catch (error) {
    console.error('Serve file error:', error);
    res.status(500).send('Error serving file');
  }
});

export default router;
