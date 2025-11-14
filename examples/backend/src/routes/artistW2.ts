import { Router } from 'express';
import multer from 'multer';
import { query } from '../db.js';
import { authenticateToken } from '../utils/auth.js';
import { sendEmail, emailTemplates, getAppUrl } from '../utils/email.js';
import crypto from 'crypto';

const router = Router();

// Encryption key from environment (should be set in production)
// If not set, generate a key but warn that it won't work across restarts
let ENCRYPTION_KEY: string;
if (process.env.W2_ENCRYPTION_KEY) {
  ENCRYPTION_KEY = process.env.W2_ENCRYPTION_KEY;
  // Ensure it's 64 hex characters (32 bytes) for AES-256
  if (ENCRYPTION_KEY.length !== 64) {
    console.error('WARNING: W2_ENCRYPTION_KEY must be 64 hex characters (32 bytes) for AES-256');
    // Generate a fallback but data encrypted with this won't be decryptable after restart
    ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
  }
} else {
  console.warn('WARNING: W2_ENCRYPTION_KEY not set. Generating temporary key. Encrypted data will not be decryptable after server restart!');
  ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
}

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16; // For AES, this is always 16

/**
 * Encrypt file data
 */
function encryptData(data: Buffer): { encrypted: Buffer; iv: Buffer; hash: string } {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  
  const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
  const hash = crypto.createHash('sha256').update(data).digest('hex');
  
  // Combine IV and encrypted data
  const result = Buffer.concat([iv, encrypted]);
  
  return { encrypted: result, iv, hash };
}

/**
 * Decrypt file data
 */
function decryptData(encryptedData: Buffer): Buffer {
  const iv = encryptedData.slice(0, IV_LENGTH);
  const encrypted = encryptedData.slice(IV_LENGTH);
  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  
  return Buffer.concat([decipher.update(encrypted), decipher.final()]);
}

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

// POST /api/artist-w2/upload - Upload W-2 document (artist only)
router.post('/upload', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    const user = (req as any).user;

    // Only artists (user_type = 'user') can upload
    if (user.userType !== 'user') {
      return res.status(403).json({ error: 'Only artists can upload W-2 forms' });
    }

    const file = req.file;
    const year = req.body.year;

    if (!file || !year) {
      return res.status(400).json({ error: 'File and year required' });
    }

    // Validate year
    const yearInt = parseInt(year);
    if (isNaN(yearInt) || yearInt < 2000 || yearInt > new Date().getFullYear() + 1) {
      return res.status(400).json({ error: 'Invalid year' });
    }

    // Check if artist already has a W-2 for this year
    const existingCheck = await query(
      'SELECT id FROM artist_w2_documents WHERE user_id = $1 AND year = $2',
      [user.userId, yearInt]
    );

    if (existingCheck.rows.length > 0) {
      return res.status(400).json({ 
        error: 'You have already uploaded a W-2 for this year. Please contact your booking agent to update it.' 
      });
    }

    // Get the artist's assigned booking agent
    const agentResult = await query(`
      SELECT manager_id 
      FROM booking_manager_assignments 
      WHERE user_id = $1
      LIMIT 1
    `, [user.userId]);

    if (agentResult.rows.length === 0) {
      return res.status(400).json({ 
        error: 'You do not have an assigned booking agent. Please contact support.' 
      });
    }

    const bookingAgentId = agentResult.rows[0].manager_id;

    // Verify booking agent is a valid booking_agent or booking_manager
    const agentVerify = await query(
      'SELECT id, user_type FROM users WHERE id = $1 AND user_type IN ($2, $3)',
      [bookingAgentId, 'booking_agent', 'booking_manager']
    );

    if (agentVerify.rows.length === 0) {
      return res.status(400).json({ 
        error: 'Invalid booking agent assignment. Please contact support.' 
      });
    }

    // Encrypt file data
    const { encrypted, hash } = encryptData(file.buffer);

    // Store encrypted file data in PostgreSQL BYTEA column
    const result = await query(`
      INSERT INTO artist_w2_documents (
        user_id, 
        booking_agent_id, 
        year, 
        file_path, 
        file_name, 
        file_data, 
        file_size, 
        mime_type,
        encryption_key_hash,
        artist_can_access
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id
    `, [
      user.userId,
      bookingAgentId,
      yearInt,
      `artist-w2/${user.userId}/${yearInt}/${file.originalname}`,
      file.originalname,
      encrypted,
      file.size,
      file.mimetype,
      hash,
      false // Artist cannot access after upload
    ]);

    // Get artist and booking agent details for email notifications
    const artistInfo = await query(
      'SELECT name, email FROM users WHERE id = $1',
      [user.userId]
    );
    
    const agentInfo = await query(
      'SELECT name, email FROM users WHERE id = $1',
      [bookingAgentId]
    );

    const artistName = artistInfo.rows[0]?.name || 'Artist';
    const artistEmail = artistInfo.rows[0]?.email;
    const agentName = agentInfo.rows[0]?.name || 'Booking Agent';
    const agentEmail = agentInfo.rows[0]?.email;

    // Send confirmation emails to both parties (without security-sensitive details)
    try {
      // Email to artist
      if (artistEmail) {
        const artistEmailContent = emailTemplates.w2UploadArtistConfirmation(
          artistName,
          yearInt,
          agentName,
          getAppUrl()
        );
        await sendEmail({
          to: artistEmail,
          subject: artistEmailContent.subject,
          html: artistEmailContent.html,
        });
      }

      // Email to booking agent
      if (agentEmail) {
        const agentEmailContent = emailTemplates.w2UploadBookingAgentNotification(
          agentName,
          artistName,
          artistEmail || 'N/A',
          yearInt,
          getAppUrl()
        );
        await sendEmail({
          to: agentEmail,
          subject: agentEmailContent.subject,
          html: agentEmailContent.html,
        });
      }
    } catch (emailError) {
      console.error('Failed to send W-2 upload notification emails:', emailError);
      // Don't fail the upload if emails fail - the upload was successful
    }

    res.status(201).json({ 
      success: true, 
      documentId: result.rows[0].id,
      message: 'W-2 form uploaded successfully. Your booking agent has been notified. You will not be able to access this document after upload for security reasons.'
    });
  } catch (error: any) {
    console.error('Upload artist W2 error:', error);
    res.status(500).json({ error: 'Failed to upload W-2 form: ' + error.message });
  }
});

// GET /api/artist-w2/status - Check if artist has uploaded W-2 for a year (artist only, no file access)
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const user = (req as any).user;

    if (user.userType !== 'user') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const { year } = req.query;

    if (year) {
      const yearInt = parseInt(year as string);
      const result = await query(
        'SELECT id, year, file_name, uploaded_at FROM artist_w2_documents WHERE user_id = $1 AND year = $2',
        [user.userId, yearInt]
      );

      if (result.rows.length === 0) {
        return res.json({ uploaded: false });
      }

      return res.json({
        uploaded: true,
        year: result.rows[0].year,
        fileName: result.rows[0].file_name,
        uploadedAt: result.rows[0].uploaded_at,
        canAccess: false // Artists cannot access after upload
      });
    } else {
      // Get all years with W-2s
      const result = await query(
        'SELECT year, file_name, uploaded_at FROM artist_w2_documents WHERE user_id = $1 ORDER BY year DESC',
        [user.userId]
      );

      return res.json({
        documents: result.rows.map(row => ({
          year: row.year,
          fileName: row.file_name,
          uploadedAt: row.uploaded_at,
          canAccess: false // Artists cannot access after upload
        }))
      });
    }
  } catch (error: any) {
    console.error('Get artist W2 status error:', error);
    res.status(500).json({ error: 'Failed to check W-2 status' });
  }
});

// GET /api/artist-w2/list - List W-2 documents for assigned artists (booking agent only)
router.get('/list', authenticateToken, async (req, res) => {
  try {
    const user = (req as any).user;

    if (user.userType !== 'booking_agent' && user.userType !== 'booking_manager') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const { user_id, year } = req.query;
    
    let queryText = `
      SELECT 
        w.id, 
        w.user_id, 
        w.year, 
        w.file_name, 
        w.file_size,
        w.uploaded_at,
        w.access_count,
        w.last_accessed_at,
        u.name as artist_name,
        u.email as artist_email
      FROM artist_w2_documents w
      JOIN users u ON w.user_id = u.id
      WHERE w.booking_agent_id = $1
    `;
    const params: any[] = [user.userId];

    let paramIndex = 2;
    if (user_id) {
      queryText += ` AND w.user_id = $${paramIndex}`;
      params.push(user_id);
      paramIndex++;
    }

    if (year) {
      queryText += ` AND w.year = $${paramIndex}`;
      params.push(parseInt(year as string));
    }

    queryText += ' ORDER BY w.year DESC, w.uploaded_at DESC';

    const result = await query(queryText, params);
    res.json(result.rows);
  } catch (error: any) {
    console.error('List artist W2s error:', error);
    res.status(500).json({ error: 'Failed to fetch W-2 documents' });
  }
});

// GET /api/artist-w2/download/:id - Download W-2 document (booking agent only)
router.get('/download/:id', authenticateToken, async (req, res) => {
  try {
    const user = (req as any).user;

    if (user.userType !== 'booking_agent' && user.userType !== 'booking_manager') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;

    // Get document and verify booking agent has access
    const result = await query(
      `SELECT 
        file_name, 
        file_data, 
        mime_type,
        booking_agent_id,
        encryption_key_hash
      FROM artist_w2_documents 
      WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const doc = result.rows[0];

    // Verify booking agent has access to this document
    if (doc.booking_agent_id !== user.userId) {
      return res.status(403).json({ error: 'You do not have access to this document' });
    }

    // Decrypt file data
    let decryptedData: Buffer;
    try {
      decryptedData = decryptData(doc.file_data);
    } catch (decryptError) {
      console.error('Decryption error:', decryptError);
      return res.status(500).json({ error: 'Failed to decrypt document' });
    }

    // Update access tracking
    await query(
      `UPDATE artist_w2_documents 
       SET access_count = access_count + 1, 
           last_accessed_at = NOW() 
       WHERE id = $1`,
      [id]
    );

    // Send decrypted file
    res.setHeader('Content-Type', doc.mime_type || 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${doc.file_name}"`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.send(decryptedData);
  } catch (error: any) {
    console.error('Download artist W2 error:', error);
    res.status(500).json({ error: 'Failed to download W-2 document' });
  }
});

// DELETE /api/artist-w2/:id - Delete W-2 document (booking agent only, for compliance)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const user = (req as any).user;

    if (user.userType !== 'booking_agent' && user.userType !== 'booking_manager') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;

    // Verify booking agent has access
    const check = await query(
      'SELECT booking_agent_id FROM artist_w2_documents WHERE id = $1',
      [id]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    if (check.rows[0].booking_agent_id !== user.userId) {
      return res.status(403).json({ error: 'You do not have access to this document' });
    }

    await query('DELETE FROM artist_w2_documents WHERE id = $1', [id]);

    res.json({ success: true, message: 'W-2 document deleted successfully' });
  } catch (error: any) {
    console.error('Delete artist W2 error:', error);
    res.status(500).json({ error: 'Failed to delete W-2 document' });
  }
});

export default router;

