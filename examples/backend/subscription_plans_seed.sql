-- Seed subscription plans data for PostgreSQL
-- Artist Plans
INSERT INTO subscription_plans (id, name, user_type, price_monthly, price_yearly, features, max_bands, is_active) VALUES
('artist_free', 'Free Artist', 'user', 0, 0, '["Basic profile", "View venues", "Basic booking requests", "Community access", "1 band"]', 1, 1),
('artist_premium', 'Premium Artist', 'user', 8.99, 97.09, '["Everything in Free", "Multi-band support (2 bands)", "Interactive jam sessions", "Priority booking", "Advanced analytics", "Direct messaging"]', 2, 1),
('artist_streaming', 'Artist Streaming Pro', 'user', 14.99, 161.89, '["Everything in Premium", "Live streaming", "Stream recording", "Analytics dashboard", "Priority support", "2 bands"]', 2, 1)
ON CONFLICT (id) DO UPDATE SET max_bands = EXCLUDED.max_bands, features = EXCLUDED.features;

-- Bar/Venue Plans  
INSERT INTO subscription_plans (id, name, user_type, price_monthly, price_yearly, features, max_bands, is_active) VALUES
('venue_free', 'Free Venue', 'bar', 0, 0, '["Basic venue profile", "Booking management", "View band reviews", "Community access", "3% booking fee"]', 0, 1),
('venue_premium', 'Premium Venue', 'bar', 49.99, 539.89, '["Everything in Free", "Premium video content (5 assets)", "Premium band analytics", "No booking fees (0%)", "Advanced analytics", "Priority support"]', 0, 1),
('venue_streaming', 'Venue Streaming Pro', 'bar', 0, 0, '["Everything in Premium", "Live streaming", "Multi-camera support", "Stream recording", "Advanced analytics", "Priority support"]', 0, 1)
ON CONFLICT (id) DO UPDATE SET max_bands = EXCLUDED.max_bands;

-- Recording Studio Plans
INSERT INTO subscription_plans (id, name, user_type, price_monthly, price_yearly, features, max_bands, is_active) VALUES
('studio_free', 'Studio Free', 'studio', 0, 0, '["Basic studio profile", "Session booking", "Basic time tracking", "Community access"]', 0, 1),
('studio_premium', 'Studio Premium', 'studio', 89.99, 971.89, '["Everything in Free", "Live streaming", "Multi-track recording", "Professional tools", "Advanced analytics", "Priority support"]', 0, 0),
('studio_pro', 'Studio Pro', 'studio', 0, 0, '["Everything in Studio Premium", "Unlimited streams", "VR/AR support", "Custom solutions", "Dedicated support", "Price determined by booking agent"]', 0, 1)
ON CONFLICT (id) DO UPDATE SET max_bands = EXCLUDED.max_bands, is_active = EXCLUDED.is_active;
