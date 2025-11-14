-- Fix pending solo bands for approved solo artists
-- This script approves any pending bands owned by approved users
-- Run this to fix users who were approved but their solo bands are still pending

UPDATE bands 
SET status = 'approved'
WHERE status = 'pending'
  AND user_id IN (
    SELECT id FROM users WHERE status = 'approved' AND deleted_at IS NULL
  );

-- Also ensure band_members status is active for solo artists
UPDATE band_members bm
SET status = 'active'
WHERE bm.status != 'active'
  AND bm.band_id IN (
    SELECT id FROM bands WHERE user_id = bm.user_id AND band_name LIKE 'solo - %'
  );

-- Show summary of what was fixed
SELECT 
  COUNT(*) as bands_approved,
  'Bands approved for approved users' as description
FROM bands 
WHERE status = 'approved'
  AND user_id IN (
    SELECT id FROM users WHERE status = 'approved' AND deleted_at IS NULL
  )
  AND (status = 'pending' OR status IS NULL) = false; -- This will show 0 after the update above, but helps verify

-- Show users who were approved but have no bands at all
SELECT 
  u.id,
  u.name,
  u.email,
  u.status,
  u.created_at,
  COUNT(b.id) as band_count
FROM users u
LEFT JOIN bands b ON u.id = b.user_id
WHERE u.status = 'approved'
  AND u.deleted_at IS NULL
  AND u.user_type IN ('user', 'band')
  AND (u.user_type = 'user' OR u.user_type = 'band')
GROUP BY u.id, u.name, u.email, u.status, u.created_at
HAVING COUNT(b.id) = 0;




