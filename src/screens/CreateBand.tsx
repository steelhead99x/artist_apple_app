import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { bandService } from '../services';
import { Button } from '../components/common';
import theme from '../theme';

interface CreateBandProps {
  navigation: {
    goBack: () => void;
    navigate: (screen: string, params?: Record<string, unknown>) => void;
  };
}

const GENRES = [
  'Rock',
  'Pop',
  'Jazz',
  'Blues',
  'Country',
  'Electronic',
  'Hip Hop',
  'R&B',
  'Metal',
  'Punk',
  'Indie',
  'Alternative',
  'Folk',
  'Classical',
  'Reggae',
  'Latin',
  'Other',
];

export default function CreateBand({ navigation }: CreateBandProps) {
  const [loading, setLoading] = useState(false);

  // Form data
  const [bandName, setBandName] = useState('');
  const [genre, setGenre] = useState('');
  const [description, setDescription] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [showGenrePicker, setShowGenrePicker] = useState(false);

  const handleSubmit = async () => {
    if (!bandName.trim()) {
      Alert.alert('Error', 'Please enter a band name');
      return;
    }

    if (bandName.trim().length < 2) {
      Alert.alert('Error', 'Band name must be at least 2 characters');
      return;
    }

    if (!genre) {
      Alert.alert('Error', 'Please select a genre');
      return;
    }

    // Validate state code if provided
    if (state.trim() && state.trim().length !== 2) {
      Alert.alert('Error', 'Please enter a valid 2-letter state code (e.g., NY, CA)');
      return;
    }

    setLoading(true);
    try {
      const bandData = {
        band_name: bandName.trim(),
        genre,
        description: description.trim() || undefined,
        city: city.trim() || undefined,
        state: state.trim().toUpperCase() || undefined,
      };

      const result = await bandService.createBand(bandData);

      if (result && result.success) {
        Alert.alert(
          'Success',
          result.requiresApproval
            ? `${bandName} has been created and is pending approval.`
            : `${bandName} has been created successfully!`,
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        throw new Error(result?.message || 'Failed to create band');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create band';
      Alert.alert('Error', errorMessage);
      console.error('Create band error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Band</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.iconContainer}>
          <Ionicons name="musical-notes" size={48} color={theme.colors.primary[600]} />
        </View>

        <Text style={styles.pageTitle}>Start Your Band</Text>
        <Text style={styles.pageSubtitle}>
          Create a new band profile to manage gigs, members, and more
        </Text>

        {/* Band Name */}
        <View style={styles.section}>
          <Text style={styles.label}>Band Name *</Text>
          <View style={styles.input}>
            <Ionicons name="musical-note" size={20} color={theme.colors.text.secondary} />
            <TextInput
              style={styles.textInput}
              placeholder="Enter band name"
              placeholderTextColor={theme.colors.text.tertiary}
              value={bandName}
              onChangeText={setBandName}
              maxLength={100}
            />
          </View>
        </View>

        {/* Genre */}
        <View style={styles.section}>
          <Text style={styles.label}>Genre *</Text>
          <TouchableOpacity
            style={styles.picker}
            onPress={() => setShowGenrePicker(!showGenrePicker)}
          >
            <Ionicons name="disc" size={20} color={theme.colors.text.secondary} />
            <Text style={[styles.pickerText, !genre && styles.pickerPlaceholder]}>
              {genre || 'Select genre'}
            </Text>
            <Ionicons name="chevron-down" size={20} color={theme.colors.text.secondary} />
          </TouchableOpacity>
          {showGenrePicker && (
            <View style={styles.pickerOptions}>
              <ScrollView style={{ maxHeight: 250 }}>
                {GENRES.map((g) => (
                  <TouchableOpacity
                    key={g}
                    style={styles.pickerOption}
                    onPress={() => {
                      setGenre(g);
                      setShowGenrePicker(false);
                    }}
                  >
                    <Text style={styles.pickerOptionText}>{g}</Text>
                    {g === genre && (
                      <Ionicons name="checkmark" size={20} color={theme.colors.primary[600]} />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.label}>Description</Text>
          <View style={[styles.input, styles.textAreaContainer]}>
            <TextInput
              style={styles.textArea}
              placeholder="Tell people about your band..."
              placeholderTextColor={theme.colors.text.tertiary}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              maxLength={500}
            />
          </View>
        </View>

        {/* Location */}
        <View style={styles.section}>
          <Text style={styles.label}>Location</Text>
          <View style={styles.row}>
            <View style={[styles.input, styles.inputHalf]}>
              <Ionicons name="location" size={20} color={theme.colors.text.secondary} />
              <TextInput
                style={styles.textInput}
                placeholder="City"
                placeholderTextColor={theme.colors.text.tertiary}
                value={city}
                onChangeText={setCity}
                maxLength={50}
              />
            </View>
            <View style={[styles.input, styles.inputHalf]}>
              <TextInput
                style={styles.textInput}
                placeholder="State"
                placeholderTextColor={theme.colors.text.tertiary}
                value={state}
                onChangeText={setState}
                maxLength={2}
                autoCapitalize="characters"
              />
            </View>
          </View>
        </View>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={20} color={theme.colors.primary[600]} />
          <Text style={styles.infoText}>
            After creating your band, you can invite members, add songs, and start booking gigs.
          </Text>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Submit Button */}
      <View style={styles.footer}>
        <Button
          title={loading ? 'Creating...' : 'Create Band'}
          onPress={handleSubmit}
          disabled={loading || !bandName.trim() || !genre}
          gradient={theme.gradients.primary}
          fullWidth
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.base,
    paddingTop: 60,
    paddingBottom: theme.spacing.base,
    backgroundColor: theme.colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray[200],
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.text.primary,
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: theme.spacing.base,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: theme.borderRadius.xl,
    backgroundColor: theme.colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginTop: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
  },
  pageTitle: {
    fontSize: theme.typography.sizes['2xl'],
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.text.primary,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  pageSubtitle: {
    fontSize: theme.typography.sizes.base,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
  },
  section: {
    marginBottom: theme.spacing.lg,
  },
  label: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.fontWeights.semibold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
  },
  input: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background.secondary,
    borderWidth: 1,
    borderColor: theme.colors.gray[300],
    borderRadius: theme.borderRadius.lg,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  textInput: {
    flex: 1,
    fontSize: theme.typography.sizes.base,
    color: theme.colors.text.primary,
    padding: 0,
  },
  textAreaContainer: {
    paddingTop: theme.spacing.md,
    alignItems: 'flex-start',
  },
  textArea: {
    width: '100%',
    height: 100,
    fontSize: theme.typography.sizes.base,
    color: theme.colors.text.primary,
    padding: 0,
  },
  row: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  inputHalf: {
    flex: 1,
  },
  picker: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background.secondary,
    borderWidth: 1,
    borderColor: theme.colors.gray[300],
    borderRadius: theme.borderRadius.lg,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  pickerText: {
    flex: 1,
    fontSize: theme.typography.sizes.base,
    color: theme.colors.text.primary,
  },
  pickerPlaceholder: {
    color: theme.colors.text.tertiary,
  },
  pickerOptions: {
    marginTop: theme.spacing.sm,
    backgroundColor: theme.colors.background.primary,
    borderWidth: 1,
    borderColor: theme.colors.gray[300],
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    ...theme.shadows.md,
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray[200],
  },
  pickerOptionText: {
    fontSize: theme.typography.sizes.base,
    color: theme.colors.text.primary,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: theme.colors.primary[50],
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    gap: theme.spacing.sm,
  },
  infoText: {
    flex: 1,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.primary[700],
    lineHeight: 20,
  },
  footer: {
    paddingHorizontal: theme.spacing.base,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.base,
    backgroundColor: theme.colors.background.primary,
    borderTopWidth: 1,
    borderTopColor: theme.colors.gray[200],
    ...(Platform.OS === 'ios' && {
      paddingBottom: Math.max(theme.spacing.base, 20),
    }),
    ...(Platform.OS === 'web' && {
      position: 'sticky' as any,
      bottom: 0,
      zIndex: 100,
      boxShadow: '0 -2px 8px rgba(0, 0, 0, 0.1)',
    }),
  },
  bottomPadding: {
    height: 100,
  },
});
