import { Router } from 'express';
import multer from 'multer';
import { query } from '../db.js';
import { authenticateToken } from '../utils/auth.js';

const router = Router();

// Configure multer for file uploads (store in memory)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB default
  },
  fileFilter: (req, file, cb) => {
    // Only allow PDF files
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  },
});

// POST /api/w2/upload - Upload W-2 document
router.post('/upload', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    const user = (req as any).user;

    if (user.userType !== 'band') {
      return res.status(403).json({ error: 'Only bands can upload W-2s' });
    }

    const file = req.file;
    const year = req.body.year;

    if (!file || !year) {
      return res.status(400).json({ error: 'File and year required' });
    }

    // Get band ID
    const bandResult = await query(
      'SELECT id FROM bands WHERE user_id = $1',
      [user.userId]
    );

    if (bandResult.rows.length === 0) {
      return res.status(404).json({ error: 'Band profile not found' });
    }

    const band = bandResult.rows[0];

    // Store file data in PostgreSQL BYTEA column
    const result = await query(`
      INSERT INTO w2_documents (band_id, year, file_path, file_name, file_data)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `, [
      band.id,
      parseInt(year),
      `w2/${band.id}/${year}/${file.originalname}`,
      file.originalname,
      file.buffer // Store binary data
    ]);

    res.status(201).json({ 
      success: true, 
      documentId: result.rows[0].id 
    });
  } catch (error) {
    console.error('Upload W2 error:', error);
    res.status(500).json({ error: 'Failed to upload W-2' });
  }
});

// GET /api/w2/list - List W-2 documents (booking agent only)
router.get('/list', authenticateToken, async (req, res) => {
  try {
    const user = (req as any).user;

    if (user.userType !== 'booking_agent') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const { band_id } = req.query;
    
    let queryText = `
      SELECT w.id, w.band_id, w.year, w.file_name, w.uploaded_at, b.band_name
      FROM w2_documents w
      JOIN bands b ON w.band_id = b.id
    `;
    const params: any[] = [];

    if (band_id) {
      queryText += ' WHERE w.band_id = $1';
      params.push(band_id);
    }

    queryText += ' ORDER BY w.year DESC, w.uploaded_at DESC';

    const result = await query(queryText, params);
    res.json(result.rows);
  } catch (error) {
    console.error('List W2s error:', error);
    res.status(500).json({ error: 'Failed to fetch W-2 documents' });
  }
});

// GET /api/w2/download/:id - Download W-2 document (booking agent only)
router.get('/download/:id', authenticateToken, async (req, res) => {
  try {
    const user = (req as any).user;

    if (user.userType !== 'booking_agent') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;

    const result = await query(
      'SELECT file_name, file_data FROM w2_documents WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const doc = result.rows[0];

    // Send file data as PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${doc.file_name}"`);
    res.send(doc.file_data);
  } catch (error) {
    console.error('Download W2 error:', error);
    res.status(500).json({ error: 'Failed to download W-2' });
  }
});

export default router;

