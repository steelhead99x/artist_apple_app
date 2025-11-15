import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../services/AuthContext';
import { bandService } from '../services';
import { Input, Button, Card } from '../components/common';
import CheckBox from '@react-native-community/checkbox';

const MUSIC_GENRES = [
  'Rock', 'Pop', 'Jazz', 'Blues', 'Country', 'Hip Hop',
  'R&B', 'Electronic', 'Folk', 'Classical', 'Metal',
  'Indie', 'Alternative', 'Reggae', 'Latin', 'Other'
];

export default function CreateBandScreen({ navigation }: any) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [isSoloArtist, setIsSoloArtist] = useState(false);

  // Form fields
  const [bandName, setBandName] = useState('');
  const [description, setDescription] = useState('');
  const [genre, setGenre] = useState('');
  const [website, setWebsite] = useState('');
  const [instagram, setInstagram] = useState('');
  const [facebook, setFacebook] = useState('');
  const [twitter, setTwitter] = useState('');
  const [spotify, setSpotify] = useState('');
  const [adminEmail, setAdminEmail] = useState('');

  // Form errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Band name is required unless solo artist
    if (!isSoloArtist && !bandName.trim()) {
      newErrors.bandName = 'Band name is required';
    }

    // Email validation if provided
    if (adminEmail.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(adminEmail)) {
        newErrors.adminEmail = 'Please enter a valid email address';
      }
    }

    // URL validation for website
    if (website.trim() && !website.startsWith('http')) {
      newErrors.website = 'Website URL should start with http:// or https://';
    }

    // Social media handle validation (remove @ if present)
    if (instagram.trim() && instagram.includes('@')) {
      setInstagram(instagram.replace('@', ''));
    }
    if (twitter.trim() && twitter.includes('@')) {
      setTwitter(twitter.replace('@', ''));
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreateBand = async () => {
    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please fix the errors in the form');
      return;
    }

    try {
      setLoading(true);

      // Auto-generate band name for solo artists
      const finalBandName = isSoloArtist ? user?.name || 'Solo Artist' : bandName.trim();

      const bandData = {
        band_name: finalBandName,
        description: description.trim() || undefined,
        genre: genre.trim() || undefined,
        website: website.trim() || undefined,
        instagram: instagram.trim() || undefined,
        facebook: facebook.trim() || undefined,
        twitter: twitter.trim() || undefined,
        spotify: spotify.trim() || undefined,
        admin_email: adminEmail.trim() || undefined,
      };

      const result = await bandService.createBand(bandData);

      if (result.success) {
        Alert.alert(
          'Success!',
          result.requiresApproval
            ? `Your band "${finalBandName}" has been created and is pending approval from your booking agent.`
            : `Your band "${finalBandName}" has been created successfully!`,
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      }
    } catch (err: any) {
      console.error('Create band error:', err);
      Alert.alert(
        'Failed to Create Band',
        err.message || 'There was a problem creating your band. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scrollView} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <Ionicons name="musical-notes" size={48} color="#6366f1" />
          <Text style={styles.headerTitle}>Create Your Band</Text>
          <Text style={styles.headerSubtitle}>
            Set up your band profile to start booking gigs and managing your music career
          </Text>
        </View>

        {/* Solo Artist Option */}
        <Card style={styles.soloCard}>
          <View style={styles.checkboxContainer}>
            <CheckBox
              value={isSoloArtist}
              onValueChange={setIsSoloArtist}
              tintColors={{ true: '#6366f1', false: '#cbd5e1' }}
            />
            <View style={styles.checkboxLabel}>
              <Text style={styles.checkboxText}>I'm a solo artist</Text>
              <Text style={styles.checkboxHint}>
                We'll use your name as the band name
              </Text>
            </View>
          </View>
        </Card>

        {/* Form */}
        <View style={styles.form}>
          {/* Band Name */}
          {!isSoloArtist && (
            <Input
              label="Band Name"
              placeholder="The Awesome Band"
              value={bandName}
              onChangeText={setBandName}
              error={errors.bandName}
              icon="musical-notes-outline"
              required
              autoCapitalize="words"
            />
          )}

          {/* Description */}
          <Input
            label="Description"
            placeholder="Tell us about your band's style and sound..."
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            icon="document-text-outline"
            hint="This will be visible on your band profile"
          />

          {/* Genre */}
          <Input
            label="Genre"
            placeholder="Rock, Pop, Jazz, etc."
            value={genre}
            onChangeText={setGenre}
            icon="radio-outline"
            hint="What type of music do you play?"
            autoCapitalize="words"
          />

          {/* Social Media Section */}
          <View style={styles.sectionHeader}>
            <Ionicons name="share-social" size={20} color="#6366f1" />
            <Text style={styles.sectionTitle}>Social Media (Optional)</Text>
          </View>

          <Input
            label="Website"
            placeholder="https://yourband.com"
            value={website}
            onChangeText={setWebsite}
            error={errors.website}
            icon="globe-outline"
            keyboardType="url"
            autoCapitalize="none"
          />

          <Input
            label="Instagram"
            placeholder="yourbandname"
            value={instagram}
            onChangeText={setInstagram}
            icon="logo-instagram"
            autoCapitalize="none"
            hint="Your Instagram username (without @)"
          />

          <Input
            label="Facebook"
            placeholder="facebook.com/yourband"
            value={facebook}
            onChangeText={setFacebook}
            icon="logo-facebook"
            autoCapitalize="none"
          />

          <Input
            label="Twitter"
            placeholder="yourbandname"
            value={twitter}
            onChangeText={setTwitter}
            icon="logo-twitter"
            autoCapitalize="none"
            hint="Your Twitter handle (without @)"
          />

          <Input
            label="Spotify"
            placeholder="spotify.com/artist/yourband"
            value={spotify}
            onChangeText={setSpotify}
            icon="musical-note"
            autoCapitalize="none"
          />

          {/* Contact Section */}
          <View style={styles.sectionHeader}>
            <Ionicons name="mail" size={20} color="#6366f1" />
            <Text style={styles.sectionTitle}>Contact Information (Optional)</Text>
          </View>

          <Input
            label="Admin Email"
            placeholder="band@example.com"
            value={adminEmail}
            onChangeText={setAdminEmail}
            error={errors.adminEmail}
            icon="mail-outline"
            keyboardType="email-address"
            autoCapitalize="none"
            hint="For booking inquiries and important notifications"
          />

          {/* Info Card */}
          <Card style={styles.infoCard}>
            <View style={styles.infoContent}>
              <Ionicons name="information-circle" size={24} color="#6366f1" />
              <Text style={styles.infoText}>
                Once created, your band profile can be edited at any time. You can add members,
                upload photos, and manage your booking calendar from the band details page.
              </Text>
            </View>
          </Card>

          {/* Action Buttons */}
          <Button
            title="Create Band"
            onPress={handleCreateBand}
            variant="primary"
            size="large"
            loading={loading}
            disabled={loading}
            icon="checkmark-circle-outline"
            fullWidth
            style={styles.createButton}
          />

          <Button
            title="Cancel"
            onPress={() => navigation.goBack()}
            variant="outline"
            size="large"
            disabled={loading}
            fullWidth
          />
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    backgroundColor: '#ffffff',
    padding: 24,
    paddingTop: 60,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
    marginTop: 16,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 300,
  },
  soloCard: {
    margin: 16,
    marginBottom: 8,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkboxLabel: {
    flex: 1,
    marginLeft: 12,
  },
  checkboxText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 2,
  },
  checkboxHint: {
    fontSize: 13,
    color: '#64748b',
  },
  form: {
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginLeft: 8,
  },
  infoCard: {
    backgroundColor: '#eef2ff',
    borderColor: '#c7d2fe',
    borderWidth: 1,
    marginTop: 16,
    marginBottom: 24,
  },
  infoContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
    marginLeft: 12,
  },
  createButton: {
    marginBottom: 12,
  },
  bottomPadding: {
    height: 40,
  },
});
