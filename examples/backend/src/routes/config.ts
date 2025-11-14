import { Router } from 'express';

const router = Router();

// GET /api/config/video - Get featured/autoplay video configuration
router.get('/video', (req, res) => {
  res.json({
    playbackId: process.env.MUX_AUTOPLAY_PLAYBACK_ID || null,
    title: process.env.MUX_AUTOPLAY_TITLE || 'Featured Video',
    autoPlay: process.env.MUX_AUTOPLAY_ENABLED === 'true',
  });
});

// GET /api/config/public - Get all public configuration
router.get('/public', (req, res) => {
  res.json({
    video: {
      playbackId: process.env.MUX_AUTOPLAY_PLAYBACK_ID || null,
      title: process.env.MUX_AUTOPLAY_TITLE || 'Featured Video',
      autoPlay: process.env.MUX_AUTOPLAY_ENABLED === 'true',
    },
    siteName: process.env.SITE_NAME || 'Artist Space',
  });
});

export default router;

