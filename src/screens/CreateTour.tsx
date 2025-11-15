import React, { useState, useEffect } from 'react';
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
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from '../services/AuthContext';
import { tourService, bandService, venueService } from '../services';
import { LoadingSpinner, Button } from '../components/common';
import theme from '../theme';

interface CreateTourProps {
  navigation: {
    goBack: () => void;
    navigate: (screen: string, params?: Record<string, unknown>) => void;
  };
}

export default function CreateTour({ navigation }: CreateTourProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  // Form data
  const [bands, setBands] = useState<any[]>([]);
  const [venues, setVenues] = useState<any[]>([]);
  const [selectedBandId, setSelectedBandId] = useState('');
  const [selectedVenueId, setSelectedVenueId] = useState('');
  const [date, setDate] = useState(new Date());
  const [startTime, setStartTime] = useState(new Date());
  const [endTime, setEndTime] = useState(new Date());
  const [paymentAmount, setPaymentAmount] = useState('');
  const [notes, setNotes] = useState('');

  // UI state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [showBandPicker, setShowBandPicker] = useState(false);
  const [showVenuePicker, setShowVenuePicker] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [bandsData, venuesData] = await Promise.all([
        bandService.getMyBands(),
        venueService.getVenues(),
      ]);
      setBands(bandsData);
      setVenues(venuesData);

      // Set default selections
      if (bandsData.length > 0) setSelectedBandId(bandsData[0].id);
      if (venuesData.length > 0) setSelectedVenueId(venuesData[0].id);
    } catch (error) {
      Alert.alert('Error', 'Failed to load bands and venues');
      console.error(error);
    } finally {
      setLoadingData(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedBandId || !selectedVenueId) {
      Alert.alert('Error', 'Please select a band and venue');
      return;
    }

    setLoading(true);
    try {
      const tourData = {
        band_id: selectedBandId,
        venue_id: selectedVenueId,
        date: date.toISOString().split('T')[0],
        start_time: startTime.toLocaleTimeString('en-US', { hour12: false }),
        end_time: endTime.toLocaleTimeString('en-US', { hour12: false }),
        payment_amount: paymentAmount ? parseFloat(paymentAmount) : undefined,
        payment_currency: 'USD',
        notes: notes || undefined,
      };

      await tourService.createTour(tourData);
      Alert.alert('Success', 'Gig created successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to create gig. Please try again.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return <LoadingSpinner message="Loading..." fullScreen />;
  }

  const selectedBand = bands.find((b) => b.id === selectedBandId);
  const selectedVenue = venues.find((v) => v.id === selectedVenueId);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Gig</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Band Selection */}
        <View style={styles.section}>
          <Text style={styles.label}>Band *</Text>
          <TouchableOpacity
            style={styles.picker}
            onPress={() => setShowBandPicker(!showBandPicker)}
          >
            <Text style={styles.pickerText}>
              {selectedBand?.band_name || 'Select Band'}
            </Text>
            <Ionicons name="chevron-down" size={20} color={theme.colors.text.secondary} />
          </TouchableOpacity>
          {showBandPicker && (
            <View style={styles.pickerOptions}>
              {bands.map((band) => (
                <TouchableOpacity
                  key={band.id}
                  style={styles.pickerOption}
                  onPress={() => {
                    setSelectedBandId(band.id);
                    setShowBandPicker(false);
                  }}
                >
                  <Text style={styles.pickerOptionText}>{band.band_name}</Text>
                  {band.id === selectedBandId && (
                    <Ionicons name="checkmark" size={20} color={theme.colors.primary[600]} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Venue Selection */}
        <View style={styles.section}>
          <Text style={styles.label}>Venue *</Text>
          <TouchableOpacity
            style={styles.picker}
            onPress={() => setShowVenuePicker(!showVenuePicker)}
          >
            <Text style={styles.pickerText}>
              {selectedVenue?.venue_name || 'Select Venue'}
            </Text>
            <Ionicons name="chevron-down" size={20} color={theme.colors.text.secondary} />
          </TouchableOpacity>
          {showVenuePicker && (
            <View style={styles.pickerOptions}>
              <ScrollView style={{ maxHeight: 200 }}>
                {venues.map((venue) => (
                  <TouchableOpacity
                    key={venue.id}
                    style={styles.pickerOption}
                    onPress={() => {
                      setSelectedVenueId(venue.id);
                      setShowVenuePicker(false);
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.pickerOptionText}>{venue.venue_name}</Text>
                      {venue.city && venue.state && (
                        <Text style={styles.pickerOptionSubtext}>
                          {venue.city}, {venue.state}
                        </Text>
                      )}
                    </View>
                    {venue.id === selectedVenueId && (
                      <Ionicons name="checkmark" size={20} color={theme.colors.primary[600]} />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        {/* Date */}
        <View style={styles.section}>
          <Text style={styles.label}>Date *</Text>
          <TouchableOpacity
            style={styles.input}
            onPress={() => setShowDatePicker(true)}
          >
            <Ionicons name="calendar-outline" size={20} color={theme.colors.text.secondary} />
            <Text style={styles.inputText}>
              {date.toLocaleDateString('en-US', {
                weekday: 'short',
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={date}
              mode="date"
              display="default"
              onChange={(event, selectedDate) => {
                setShowDatePicker(Platform.OS === 'ios');
                if (selectedDate) setDate(selectedDate);
              }}
            />
          )}
        </View>

        {/* Start Time */}
        <View style={styles.section}>
          <Text style={styles.label}>Start Time *</Text>
          <TouchableOpacity
            style={styles.input}
            onPress={() => setShowStartTimePicker(true)}
          >
            <Ionicons name="time-outline" size={20} color={theme.colors.text.secondary} />
            <Text style={styles.inputText}>
              {startTime.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </TouchableOpacity>
          {showStartTimePicker && (
            <DateTimePicker
              value={startTime}
              mode="time"
              display="default"
              onChange={(event, selectedTime) => {
                setShowStartTimePicker(Platform.OS === 'ios');
                if (selectedTime) setStartTime(selectedTime);
              }}
            />
          )}
        </View>

        {/* End Time */}
        <View style={styles.section}>
          <Text style={styles.label}>End Time</Text>
          <TouchableOpacity
            style={styles.input}
            onPress={() => setShowEndTimePicker(true)}
          >
            <Ionicons name="time-outline" size={20} color={theme.colors.text.secondary} />
            <Text style={styles.inputText}>
              {endTime.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </TouchableOpacity>
          {showEndTimePicker && (
            <DateTimePicker
              value={endTime}
              mode="time"
              display="default"
              onChange={(event, selectedTime) => {
                setShowEndTimePicker(Platform.OS === 'ios');
                if (selectedTime) setEndTime(selectedTime);
              }}
            />
          )}
        </View>

        {/* Payment Amount */}
        <View style={styles.section}>
          <Text style={styles.label}>Payment Amount (USD)</Text>
          <View style={styles.input}>
            <Ionicons name="cash-outline" size={20} color={theme.colors.text.secondary} />
            <TextInput
              style={styles.textInput}
              placeholder="0.00"
              placeholderTextColor={theme.colors.text.tertiary}
              value={paymentAmount}
              onChangeText={setPaymentAmount}
              keyboardType="decimal-pad"
            />
          </View>
        </View>

        {/* Notes */}
        <View style={styles.section}>
          <Text style={styles.label}>Notes</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Add any additional notes or requirements..."
            placeholderTextColor={theme.colors.text.tertiary}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Submit Button */}
      <View style={styles.footer}>
        <Button
          title={loading ? 'Creating...' : 'Create Gig'}
          onPress={handleSubmit}
          disabled={loading || !selectedBandId || !selectedVenueId}
          gradient={theme.gradients.primary}
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
  section: {
    marginTop: theme.spacing.lg,
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
  inputText: {
    flex: 1,
    fontSize: theme.typography.sizes.base,
    color: theme.colors.text.primary,
  },
  textInput: {
    flex: 1,
    fontSize: theme.typography.sizes.base,
    color: theme.colors.text.primary,
    padding: 0,
  },
  textArea: {
    height: 100,
    alignItems: 'flex-start',
    paddingTop: theme.spacing.md,
  },
  picker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.background.secondary,
    borderWidth: 1,
    borderColor: theme.colors.gray[300],
    borderRadius: theme.borderRadius.lg,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
  },
  pickerText: {
    fontSize: theme.typography.sizes.base,
    color: theme.colors.text.primary,
  },
  pickerOptions: {
    marginTop: theme.spacing.sm,
    backgroundColor: theme.colors.background.primary,
    borderWidth: 1,
    borderColor: theme.colors.gray[300],
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
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
  pickerOptionSubtext: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.text.secondary,
    marginTop: 2,
  },
  footer: {
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.base,
    backgroundColor: theme.colors.background.primary,
    borderTopWidth: 1,
    borderTopColor: theme.colors.gray[200],
  },
  bottomPadding: {
    height: 20,
  },
});
