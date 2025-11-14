import { query } from '../db.js';

/**
 * Subscription tier hierarchy for bands
 * Higher number = higher tier
 */
const SUBSCRIPTION_TIER_MAP: Record<string, number> = {
  'artist_free': 0,
  'artist_premium': 1,
  'artist_streaming': 2, // Pro tier
};

/**
 * Get the subscription level for a band based on its members' subscriptions
 * Rules:
 * 1. If solo artist creates band, band gets same subscription as artist
 * 2. If multiple artists, band gets highest subscription tier among all active members
 * 3. Free tier if no premium members
 */
export async function getBandSubscriptionLevel(bandId: string): Promise<{
  tier: 'free' | 'premium' | 'pro';
  planId: string | null;
  planName: string;
  hasStreaming: boolean;
  hasMeet: boolean;
  hasChat: boolean;
}> {
  try {
    // Get all active members of the band (including band owner)
    const membersResult = await query(`
      SELECT DISTINCT u.id as user_id
      FROM bands b
      JOIN users u ON u.id = b.user_id
      WHERE b.id = $1 
        AND u.status = 'approved'
        AND (u.deleted_at IS NULL OR u.deleted_at > NOW())
      
      UNION
      
      SELECT DISTINCT u.id as user_id
      FROM bands b
      JOIN band_members bm ON b.id = bm.band_id AND bm.status = 'active'
      JOIN users u ON u.id = bm.user_id
      WHERE b.id = $1
        AND u.status = 'approved'
        AND (u.deleted_at IS NULL OR u.deleted_at > NOW())
    `, [bandId]);

    if (membersResult.rows.length === 0) {
      // No members found, default to free
      return {
        tier: 'free',
        planId: 'artist_free',
        planName: 'Free Artist',
        hasStreaming: false,
        hasMeet: false,
        hasChat: true, // Chat is available to all
      };
    }

    const memberIds = membersResult.rows.map((row: any) => row.user_id);

    // Get all active subscriptions for band members
    const subscriptionsResult = await query(`
      SELECT DISTINCT sp.id, sp.name, sp.user_type
      FROM user_subscriptions us
      JOIN subscription_plans sp ON us.plan_id = sp.id
      WHERE us.user_id = ANY($1::uuid[])
        AND us.status = 'active'
        AND sp.user_type = 'user'
        AND sp.id IN ('artist_free', 'artist_premium', 'artist_streaming')
      ORDER BY 
        CASE sp.id
          WHEN 'artist_streaming' THEN 3
          WHEN 'artist_premium' THEN 2
          WHEN 'artist_free' THEN 1
        END DESC
      LIMIT 1
    `, [memberIds]);

    // If no subscriptions found, check if any member exists (might be free users)
    let highestPlan = subscriptionsResult.rows[0] || null;

    // If no subscription found, default to free
    if (!highestPlan) {
      return {
        tier: 'free',
        planId: 'artist_free',
        planName: 'Free Artist',
        hasStreaming: false,
        hasMeet: false,
        hasChat: true,
      };
    }

    // Determine tier based on plan
    let tier: 'free' | 'premium' | 'pro';
    let hasStreaming = false;
    let hasMeet = false;
    let hasChat = true; // Chat available to all

    if (highestPlan.id === 'artist_streaming') {
      tier = 'pro';
      hasStreaming = true;
      hasMeet = true;
      hasChat = true;
    } else if (highestPlan.id === 'artist_premium') {
      tier = 'premium';
      hasStreaming = false;
      hasMeet = true;
      hasChat = true;
    } else {
      tier = 'free';
      hasStreaming = false;
      hasMeet = false;
      hasChat = true;
    }

    return {
      tier,
      planId: highestPlan.id,
      planName: highestPlan.name,
      hasStreaming,
      hasMeet,
      hasChat,
    };
  } catch (error) {
    console.error('Error getting band subscription level:', error);
    // Default to free on error
    return {
      tier: 'free',
      planId: 'artist_free',
      planName: 'Free Artist',
      hasStreaming: false,
      hasMeet: false,
      hasChat: true,
    };
  }
}

/**
 * Check if a user has access to features through their band memberships
 * Returns the highest subscription tier from all bands user is in
 */
export async function getUserBandSubscriptionLevel(userId: string): Promise<{
  tier: 'free' | 'premium' | 'pro';
  planId: string | null;
  planName: string;
  hasStreaming: boolean;
  hasMeet: boolean;
  hasChat: boolean;
}> {
  try {
    // Get all bands user is a member of or owns
    const bandsResult = await query(`
      SELECT DISTINCT b.id as band_id
      FROM bands b
      LEFT JOIN band_members bm ON b.id = bm.band_id
      WHERE (b.user_id = $1 OR (bm.user_id = $1 AND bm.status = 'active'))
        AND b.status = 'approved'
    `, [userId]);

    if (bandsResult.rows.length === 0) {
      // User not in any bands, check their personal subscription
      const personalSubResult = await query(`
        SELECT sp.id, sp.name
        FROM user_subscriptions us
        JOIN subscription_plans sp ON us.plan_id = sp.id
        WHERE us.user_id = $1 
          AND us.status = 'active'
          AND sp.user_type = 'user'
        ORDER BY us.created_at DESC
        LIMIT 1
      `, [userId]);

      if (personalSubResult.rows.length > 0) {
        const plan = personalSubResult.rows[0];
        return getFeaturesFromPlan(plan.id, plan.name);
      }

      return {
        tier: 'free',
        planId: 'artist_free',
        planName: 'Free Artist',
        hasStreaming: false,
        hasMeet: false,
        hasChat: true,
      };
    }

    // Get highest subscription from all bands
    let highestTier = 0;
    let bestPlan: any = null;

    for (const bandRow of bandsResult.rows) {
      const bandSub = await getBandSubscriptionLevel(bandRow.band_id);
      const tierLevel = SUBSCRIPTION_TIER_MAP[bandSub.planId || 'artist_free'] || 0;
      
      if (tierLevel > highestTier) {
        highestTier = tierLevel;
        bestPlan = bandSub;
      }
    }

    // Also check user's personal subscription
    const personalSubResult = await query(`
      SELECT sp.id, sp.name
      FROM user_subscriptions us
      JOIN subscription_plans sp ON us.plan_id = sp.id
      WHERE us.user_id = $1 
        AND us.status = 'active'
        AND sp.user_type = 'user'
      ORDER BY us.created_at DESC
      LIMIT 1
    `, [userId]);

    if (personalSubResult.rows.length > 0) {
      const plan = personalSubResult.rows[0];
      const personalTierLevel = SUBSCRIPTION_TIER_MAP[plan.id] || 0;
      if (personalTierLevel > highestTier) {
        return getFeaturesFromPlan(plan.id, plan.name);
      }
    }

    // Return best plan from bands, or default to free
    return bestPlan || {
      tier: 'free',
      planId: 'artist_free',
      planName: 'Free Artist',
      hasStreaming: false,
      hasMeet: false,
      hasChat: true,
    };
  } catch (error) {
    console.error('Error getting user band subscription level:', error);
    return {
      tier: 'free',
      planId: 'artist_free',
      planName: 'Free Artist',
      hasStreaming: false,
      hasMeet: false,
      hasChat: true,
    };
  }
}

/**
 * Helper function to get features from a plan ID
 */
function getFeaturesFromPlan(planId: string, planName: string): {
  tier: 'free' | 'premium' | 'pro';
  planId: string;
  planName: string;
  hasStreaming: boolean;
  hasMeet: boolean;
  hasChat: boolean;
} {
  if (planId === 'artist_streaming') {
    return {
      tier: 'pro',
      planId,
      planName,
      hasStreaming: true,
      hasMeet: true,
      hasChat: true,
    };
  } else if (planId === 'artist_premium') {
    return {
      tier: 'premium',
      planId,
      planName,
      hasStreaming: false,
      hasMeet: true,
      hasChat: true,
    };
  } else {
    return {
      tier: 'free',
      planId: planId || 'artist_free',
      planName: planName || 'Free Artist',
      hasStreaming: false,
      hasMeet: false,
      hasChat: true,
    };
  }
}

