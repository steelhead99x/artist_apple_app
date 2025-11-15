import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
}

interface FAQCategory {
  id: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  description: string;
}

const categories: FAQCategory[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: 'rocket-outline',
    description: 'Learn the basics of using Artist Space',
  },
  {
    id: 'bands',
    title: 'Band Management',
    icon: 'people-outline',
    description: 'Create and manage your bands',
  },
  {
    id: 'tours',
    title: 'Tours & Gigs',
    icon: 'calendar-outline',
    description: 'Schedule and organize your tours',
  },
  {
    id: 'payments',
    title: 'Payments & Ledger',
    icon: 'wallet-outline',
    description: 'Track income and expenses',
  },
  {
    id: 'messaging',
    title: 'Messaging',
    icon: 'chatbubbles-outline',
    description: 'Communicate with your band',
  },
  {
    id: 'sessions',
    title: 'Practice Sessions',
    icon: 'musical-notes-outline',
    description: 'Schedule and track rehearsals',
  },
  {
    id: 'account',
    title: 'Account & Settings',
    icon: 'settings-outline',
    description: 'Manage your profile and preferences',
  },
  {
    id: 'troubleshooting',
    title: 'Troubleshooting',
    icon: 'help-buoy-outline',
    description: 'Common issues and solutions',
  },
];

const faqData: FAQItem[] = [
  // Getting Started
  {
    id: 'gs-1',
    question: 'What is Artist Space?',
    answer: 'Artist Space is an all-in-one platform for musicians and bands to manage tours, track payments, communicate with band members, and organize practice sessions. It helps you stay organized and focus on your music.',
    category: 'getting-started',
  },
  {
    id: 'gs-2',
    question: 'How do I get started?',
    answer: 'Start by creating your profile, then either create a new band or join an existing one using an invite code. Once you\'re in a band, you can start adding tours, tracking payments, and messaging your bandmates.',
    category: 'getting-started',
  },
  {
    id: 'gs-3',
    question: 'Is Artist Space free to use?',
    answer: 'Artist Space offers both free and premium plans. The free plan includes basic features like band management and messaging. Premium plans unlock advanced features like unlimited tours, detailed payment analytics, and priority support.',
    category: 'getting-started',
  },

  // Band Management
  {
    id: 'band-1',
    question: 'How do I create a band?',
    answer: 'Tap the "Create Band" button on the dashboard. Enter your band name, genre, and other details. You\'ll be set as the band leader and can start inviting members immediately.',
    category: 'bands',
  },
  {
    id: 'band-2',
    question: 'How do I invite members to my band?',
    answer: 'Go to your band details, tap "Manage Members", then "Invite Member". Share the invite code or link with your bandmates. They can join by entering the code in the app.',
    category: 'bands',
  },
  {
    id: 'band-3',
    question: 'Can I be in multiple bands?',
    answer: 'Yes! You can create or join multiple bands. Switch between them from the dashboard. Each band has its own tours, payments, and messages.',
    category: 'bands',
  },
  {
    id: 'band-4',
    question: 'What are member roles?',
    answer: 'Bands have three roles: Leader (full control), Admin (can manage most settings), and Member (can view and participate). Leaders can assign roles in the Manage Members screen.',
    category: 'bands',
  },
  {
    id: 'band-5',
    question: 'How do I leave a band?',
    answer: 'Go to the band details, tap the menu icon, and select "Leave Band". If you\'re the only leader, you\'ll need to assign another leader first or delete the band.',
    category: 'bands',
  },

  // Tours & Gigs
  {
    id: 'tour-1',
    question: 'How do I add a tour?',
    answer: 'From your band dashboard, tap "Add Tour". Enter the tour name, dates, venues, and other details. You can add multiple shows to a single tour.',
    category: 'tours',
  },
  {
    id: 'tour-2',
    question: 'Can I share tours with my band?',
    answer: 'Yes! All tours are automatically shared with your band members. Everyone can view tour details, dates, and venues. Leaders and admins can edit tour information.',
    category: 'tours',
  },
  {
    id: 'tour-3',
    question: 'How do I track tour expenses?',
    answer: 'Each tour has a linked payment ledger. Add expenses like travel, accommodation, and equipment directly to the tour. All band members can see the breakdown.',
    category: 'tours',
  },
  {
    id: 'tour-4',
    question: 'What tour statuses are available?',
    answer: 'Tours can be: Pending (planning stage), Confirmed (booked and confirmed), Cancelled (no longer happening), or Completed (finished). Update status from tour details.',
    category: 'tours',
  },

  // Payments & Ledger
  {
    id: 'pay-1',
    question: 'How does the payment ledger work?',
    answer: 'The payment ledger tracks all band income and expenses. Add transactions manually or link them to specific tours. View totals, splits, and payment history in one place.',
    category: 'payments',
  },
  {
    id: 'pay-2',
    question: 'Can I split payments between members?',
    answer: 'Yes! When adding income, you can specify how to split it between band members. The app calculates each person\'s share automatically based on percentages or custom amounts.',
    category: 'payments',
  },
  {
    id: 'pay-3',
    question: 'How do I add an expense?',
    answer: 'Go to Payment Ledger, tap "Add Transaction", select "Expense", enter the amount, category, and description. You can link it to a specific tour or mark it as general band expense.',
    category: 'payments',
  },
  {
    id: 'pay-4',
    question: 'Can I export payment reports?',
    answer: 'Premium users can export detailed payment reports as PDF or CSV files. This is useful for tax purposes and financial planning. Go to Payment Ledger > Menu > Export.',
    category: 'payments',
  },
  {
    id: 'pay-5',
    question: 'What payment statuses mean?',
    answer: 'Pending (awaiting payment), Paid (completed), Failed (payment unsuccessful), Cancelled (no longer valid). Update statuses to keep accurate records.',
    category: 'payments',
  },

  // Messaging
  {
    id: 'msg-1',
    question: 'How does band messaging work?',
    answer: 'Each band has its own group chat. All messages are end-to-end encrypted for privacy. You can send text, images, and share files with your bandmates.',
    category: 'messaging',
  },
  {
    id: 'msg-2',
    question: 'Can I send direct messages?',
    answer: 'Yes! Tap on any band member\'s name to start a private, encrypted conversation. Direct messages are separate from band group chats.',
    category: 'messaging',
  },
  {
    id: 'msg-3',
    question: 'Are my messages private?',
    answer: 'Absolutely! All messages use end-to-end encryption (E2EE). Only you and your recipients can read the messages. Even we can\'t access your conversations.',
    category: 'messaging',
  },
  {
    id: 'msg-4',
    question: 'Can I share tour details in chat?',
    answer: 'Yes! Tap the attachment icon and select "Share Tour" to send tour information directly in the chat. Members can tap to view full tour details.',
    category: 'messaging',
  },
  {
    id: 'msg-5',
    question: 'How do I enable notifications?',
    answer: 'Go to Profile > Settings > Notifications. You can customize alerts for messages, tour updates, payment reminders, and session notifications.',
    category: 'messaging',
  },

  // Practice Sessions
  {
    id: 'session-1',
    question: 'How do I schedule a practice session?',
    answer: 'Tap "Calendar" on the dashboard, then "Add Session". Enter the date, time, location, and any notes. All band members will be notified automatically.',
    category: 'sessions',
  },
  {
    id: 'session-2',
    question: 'Can I set recurring practice sessions?',
    answer: 'Yes! When creating a session, enable "Recurring" and choose your frequency (weekly, bi-weekly, monthly). The app will create sessions automatically.',
    category: 'sessions',
  },
  {
    id: 'session-3',
    question: 'How do members confirm attendance?',
    answer: 'Members receive session notifications and can mark themselves as "Attending", "Maybe", or "Can\'t Make It". View attendance from the session details screen.',
    category: 'sessions',
  },
  {
    id: 'session-4',
    question: 'Can I add setlists to sessions?',
    answer: 'Yes! Premium users can create setlists for practice sessions. Add songs, notes, and key information. Setlists are saved and can be reused for future sessions or shows.',
    category: 'sessions',
  },

  // Account & Settings
  {
    id: 'acct-1',
    question: 'How do I change my profile picture?',
    answer: 'Go to Profile, tap on your avatar, and select "Change Photo". Choose from your camera or photo library. Your new photo will update across all your bands.',
    category: 'account',
  },
  {
    id: 'acct-2',
    question: 'Can I use biometric login?',
    answer: 'Yes! Enable Face ID or Touch ID in Profile > Settings > Security. Your device must support biometric authentication.',
    category: 'account',
  },
  {
    id: 'acct-3',
    question: 'How do I set up PIN login?',
    answer: 'Go to Profile > Settings > Security > PIN Code. Create a 6-digit PIN for quick access. You can use PIN instead of password for faster login.',
    category: 'account',
  },
  {
    id: 'acct-4',
    question: 'How do I change my password?',
    answer: 'Go to Profile > Settings > Security > Change Password. Enter your current password and your new password. You\'ll be logged out and need to sign in again.',
    category: 'account',
  },
  {
    id: 'acct-5',
    question: 'Can I delete my account?',
    answer: 'Yes, but this is permanent. Go to Profile > Settings > Account > Delete Account. All your data will be removed. If you\'re the only leader of a band, assign a new leader first.',
    category: 'account',
  },

  // Troubleshooting
  {
    id: 'trouble-1',
    question: 'I forgot my password. What do I do?',
    answer: 'On the login screen, tap "Forgot Password". Enter your email and we\'ll send a password reset link. Follow the link to create a new password.',
    category: 'troubleshooting',
  },
  {
    id: 'trouble-2',
    question: 'Messages aren\'t sending. How do I fix this?',
    answer: 'Check your internet connection. If connected, try closing and reopening the app. If the issue persists, go to Profile > Settings > Clear Cache and restart the app.',
    category: 'troubleshooting',
  },
  {
    id: 'trouble-3',
    question: 'Why can\'t I see my band\'s tours?',
    answer: 'Make sure you have an active internet connection and your band membership is active. Try pulling down to refresh. If issues persist, log out and log back in.',
    category: 'troubleshooting',
  },
  {
    id: 'trouble-4',
    question: 'The app is running slowly. What should I do?',
    answer: 'Try clearing the app cache: Profile > Settings > Clear Cache. Also ensure you\'re running the latest version from the App Store. Restart your device if needed.',
    category: 'troubleshooting',
  },
  {
    id: 'trouble-5',
    question: 'How do I report a bug?',
    answer: 'Tap Profile > Help & Support > Report a Bug. Describe the issue and include screenshots if possible. Our support team will investigate and get back to you within 24 hours.',
    category: 'troubleshooting',
  },
  {
    id: 'trouble-6',
    question: 'I\'m not receiving notifications. Why?',
    answer: 'Check that notifications are enabled in your device Settings > Artist Space > Notifications. Also verify notification preferences in the app: Profile > Settings > Notifications.',
    category: 'troubleshooting',
  },
];

export default function HelpScreen({ navigation }: any) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  const filteredFAQs = faqData.filter((item) => {
    const matchesSearch =
      searchQuery === '' ||
      item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === null || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const renderCategoryCard = (category: FAQCategory) => (
    <TouchableOpacity
      key={category.id}
      style={[
        styles.categoryCard,
        selectedCategory === category.id && styles.categoryCardActive,
      ]}
      onPress={() =>
        setSelectedCategory(
          selectedCategory === category.id ? null : category.id
        )
      }
      accessibilityLabel={`${category.title} category`}
      accessibilityRole="button"
    >
      <View
        style={[
          styles.categoryIconContainer,
          selectedCategory === category.id && styles.categoryIconActive,
        ]}
      >
        <Ionicons
          name={category.icon}
          size={24}
          color={selectedCategory === category.id ? '#fff' : '#6366f1'}
        />
      </View>
      <View style={styles.categoryContent}>
        <Text
          style={[
            styles.categoryTitle,
            selectedCategory === category.id && styles.categoryTitleActive,
          ]}
        >
          {category.title}
        </Text>
        <Text
          style={[
            styles.categoryDescription,
            selectedCategory === category.id && styles.categoryDescriptionActive,
          ]}
        >
          {category.description}
        </Text>
      </View>
      {selectedCategory === category.id && (
        <Ionicons name="checkmark-circle" size={20} color="#6366f1" />
      )}
    </TouchableOpacity>
  );

  const renderFAQItem = (item: FAQItem) => {
    const isExpanded = expandedItems.has(item.id);

    return (
      <View key={item.id} style={styles.faqItem}>
        <TouchableOpacity
          style={styles.faqQuestion}
          onPress={() => toggleExpanded(item.id)}
          accessibilityLabel={item.question}
          accessibilityRole="button"
          accessibilityHint={
            isExpanded ? 'Collapse answer' : 'Expand to see answer'
          }
        >
          <View style={styles.questionContent}>
            <Ionicons
              name={isExpanded ? 'chevron-down' : 'chevron-forward'}
              size={20}
              color="#6366f1"
              style={styles.chevronIcon}
            />
            <Text style={styles.questionText}>{item.question}</Text>
          </View>
        </TouchableOpacity>
        {isExpanded && (
          <View style={styles.faqAnswer}>
            <Text style={styles.answerText}>{item.answer}</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help & FAQ</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons
          name="search"
          size={20}
          color="#9ca3af"
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Search for help..."
          placeholderTextColor="#9ca3af"
          value={searchQuery}
          onChangeText={setSearchQuery}
          accessibilityLabel="Search help articles"
        />
        {searchQuery !== '' && (
          <TouchableOpacity
            onPress={() => setSearchQuery('')}
            accessibilityLabel="Clear search"
            accessibilityRole="button"
          >
            <Ionicons name="close-circle" size={20} color="#9ca3af" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Categories Section */}
        {searchQuery === '' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Browse by Category</Text>
            <Text style={styles.sectionSubtitle}>
              Select a category to filter help topics
            </Text>
            <View style={styles.categoriesGrid}>
              {categories.map(renderCategoryCard)}
            </View>
          </View>
        )}

        {/* FAQ Items */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {selectedCategory
                ? categories.find((c) => c.id === selectedCategory)?.title
                : 'Frequently Asked Questions'}
            </Text>
            {selectedCategory && (
              <TouchableOpacity
                onPress={() => setSelectedCategory(null)}
                accessibilityLabel="Clear category filter"
                accessibilityRole="button"
              >
                <Text style={styles.clearFilter}>Clear Filter</Text>
              </TouchableOpacity>
            )}
          </View>
          {filteredFAQs.length > 0 ? (
            <View style={styles.faqList}>
              {filteredFAQs.map(renderFAQItem)}
            </View>
          ) : (
            <View style={styles.noResults}>
              <Ionicons name="search-outline" size={48} color="#d1d5db" />
              <Text style={styles.noResultsText}>No results found</Text>
              <Text style={styles.noResultsSubtext}>
                Try adjusting your search or browse by category
              </Text>
            </View>
          )}
        </View>

        {/* Contact Support */}
        <View style={styles.section}>
          <View style={styles.supportCard}>
            <View style={styles.supportIconContainer}>
              <Ionicons name="headset-outline" size={32} color="#6366f1" />
            </View>
            <Text style={styles.supportTitle}>Still need help?</Text>
            <Text style={styles.supportText}>
              Our support team is available 24/7 to assist you with any questions
              or issues.
            </Text>
            <TouchableOpacity
              style={styles.supportButton}
              accessibilityLabel="Contact support"
              accessibilityRole="button"
            >
              <Ionicons name="mail-outline" size={20} color="#fff" />
              <Text style={styles.supportButtonText}>Contact Support</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Bottom Spacing */}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  headerSpacer: {
    width: 40,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1f2937',
  },
  content: {
    flex: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  clearFilter: {
    fontSize: 14,
    color: '#6366f1',
    fontWeight: '600',
  },
  categoriesGrid: {
    paddingHorizontal: 16,
  },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  categoryCardActive: {
    borderColor: '#6366f1',
    backgroundColor: '#f0f0ff',
  },
  categoryIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ede9fe',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  categoryIconActive: {
    backgroundColor: '#6366f1',
  },
  categoryContent: {
    flex: 1,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  categoryTitleActive: {
    color: '#6366f1',
  },
  categoryDescription: {
    fontSize: 13,
    color: '#6b7280',
  },
  categoryDescriptionActive: {
    color: '#818cf8',
  },
  faqList: {
    paddingHorizontal: 16,
  },
  faqItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
  },
  faqQuestion: {
    padding: 16,
  },
  questionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chevronIcon: {
    marginRight: 12,
  },
  questionText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
  },
  faqAnswer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingLeft: 48,
  },
  answerText: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
  },
  noResults: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  noResultsText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#9ca3af',
    marginTop: 16,
  },
  noResultsSubtext: {
    fontSize: 14,
    color: '#d1d5db',
    marginTop: 4,
  },
  supportCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  supportIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#ede9fe',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  supportTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 8,
  },
  supportText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  supportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6366f1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  supportButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 8,
  },
  bottomSpacer: {
    height: 32,
  },
});
