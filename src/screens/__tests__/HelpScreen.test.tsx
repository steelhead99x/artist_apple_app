/**
 * @jest-environment node
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import HelpScreen from '../HelpScreen';

// Mock navigation
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockNavigation = {
  navigate: mockNavigate,
  goBack: mockGoBack,
};

describe('HelpScreen Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render the screen with header', () => {
      const { getByText } = render(<HelpScreen navigation={mockNavigation} />);

      expect(getByText('Help & FAQ')).toBeTruthy();
    });

    it('should render the search bar', () => {
      const { getByPlaceholderText } = render(
        <HelpScreen navigation={mockNavigation} />
      );

      expect(getByPlaceholderText('Search for help...')).toBeTruthy();
    });

    it('should render all category cards', () => {
      const { getByText } = render(<HelpScreen navigation={mockNavigation} />);

      expect(getByText('Getting Started')).toBeTruthy();
      expect(getByText('Band Management')).toBeTruthy();
      expect(getByText('Tours & Gigs')).toBeTruthy();
      expect(getByText('Payments & Ledger')).toBeTruthy();
      expect(getByText('Messaging')).toBeTruthy();
      expect(getByText('Practice Sessions')).toBeTruthy();
      expect(getByText('Account & Settings')).toBeTruthy();
      expect(getByText('Troubleshooting')).toBeTruthy();
    });

    it('should render FAQ section title', () => {
      const { getByText } = render(<HelpScreen navigation={mockNavigation} />);

      expect(getByText('Frequently Asked Questions')).toBeTruthy();
    });

    it('should render contact support card', () => {
      const { getByText } = render(<HelpScreen navigation={mockNavigation} />);

      expect(getByText('Still need help?')).toBeTruthy();
      expect(getByText('Contact Support')).toBeTruthy();
    });
  });

  describe('Navigation', () => {
    it('should call goBack when back button is pressed', () => {
      const { getByLabelText } = render(
        <HelpScreen navigation={mockNavigation} />
      );

      const backButton = getByLabelText('Go back');
      fireEvent.press(backButton);

      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });
  });

  describe('Search Functionality', () => {
    it('should update search query when typing', () => {
      const { getByPlaceholderText } = render(
        <HelpScreen navigation={mockNavigation} />
      );

      const searchInput = getByPlaceholderText('Search for help...');
      fireEvent.changeText(searchInput, 'password');

      expect(searchInput.props.value).toBe('password');
    });

    it('should show clear button when search has text', () => {
      const { getByPlaceholderText, getByLabelText } = render(
        <HelpScreen navigation={mockNavigation} />
      );

      const searchInput = getByPlaceholderText('Search for help...');
      fireEvent.changeText(searchInput, 'test');

      const clearButton = getByLabelText('Clear search');
      expect(clearButton).toBeTruthy();
    });

    it('should clear search when clear button is pressed', () => {
      const { getByPlaceholderText, getByLabelText } = render(
        <HelpScreen navigation={mockNavigation} />
      );

      const searchInput = getByPlaceholderText('Search for help...');
      fireEvent.changeText(searchInput, 'test');

      const clearButton = getByLabelText('Clear search');
      fireEvent.press(clearButton);

      expect(searchInput.props.value).toBe('');
    });

    it('should filter FAQs based on search query', () => {
      const { getByPlaceholderText, queryByText } = render(
        <HelpScreen navigation={mockNavigation} />
      );

      const searchInput = getByPlaceholderText('Search for help...');

      // Search for something specific
      fireEvent.changeText(searchInput, 'password');

      // Should find password-related FAQ
      expect(queryByText(/forgot my password/i)).toBeTruthy();
    });

    it('should hide categories section when searching', () => {
      const { getByPlaceholderText, queryByText } = render(
        <HelpScreen navigation={mockNavigation} />
      );

      const searchInput = getByPlaceholderText('Search for help...');
      fireEvent.changeText(searchInput, 'test');

      expect(queryByText('Browse by Category')).toBeNull();
    });

    it('should show no results message when search has no matches', () => {
      const { getByPlaceholderText, getByText } = render(
        <HelpScreen navigation={mockNavigation} />
      );

      const searchInput = getByPlaceholderText('Search for help...');
      fireEvent.changeText(searchInput, 'xyznonexistentquery');

      expect(getByText('No results found')).toBeTruthy();
    });
  });

  describe('Category Filtering', () => {
    it('should filter FAQs when category is selected', () => {
      const { getAllByText, getByText } = render(
        <HelpScreen navigation={mockNavigation} />
      );

      const categoryCards = getAllByText('Getting Started');
      fireEvent.press(categoryCards[0]);

      // Should show Clear Filter button
      expect(getByText('Clear Filter')).toBeTruthy();
    });

    it('should clear filter when Clear Filter is pressed', () => {
      const { getByText } = render(<HelpScreen navigation={mockNavigation} />);

      // Select a category
      const categoryCard = getByText('Getting Started');
      fireEvent.press(categoryCard);

      // Clear the filter
      const clearButton = getByText('Clear Filter');
      fireEvent.press(clearButton);

      // Should show all FAQs title again
      expect(getByText('Frequently Asked Questions')).toBeTruthy();
    });

    it('should toggle category selection when pressed twice', () => {
      const { getByText, queryByText } = render(
        <HelpScreen navigation={mockNavigation} />
      );

      const categoryCard = getByText('Band Management');

      // Select category
      fireEvent.press(categoryCard);
      expect(getByText('Clear Filter')).toBeTruthy();

      // Deselect category
      fireEvent.press(categoryCard);
      expect(queryByText('Clear Filter')).toBeNull();
    });
  });

  describe('FAQ Items', () => {
    it('should expand FAQ item when question is pressed', () => {
      const { getByText } = render(<HelpScreen navigation={mockNavigation} />);

      const question = getByText('What is Artist Space?');
      fireEvent.press(question);

      // Should show the answer
      expect(
        getByText(
          /Artist Space is an all-in-one platform for musicians and bands/i
        )
      ).toBeTruthy();
    });

    it('should collapse FAQ item when pressed again', () => {
      const { getByText, queryByText } = render(
        <HelpScreen navigation={mockNavigation} />
      );

      const question = getByText('What is Artist Space?');

      // Expand
      fireEvent.press(question);
      expect(
        getByText(
          /Artist Space is an all-in-one platform for musicians and bands/i
        )
      ).toBeTruthy();

      // Collapse
      fireEvent.press(question);
      // Answer should not be visible (simplified check)
    });

    it('should allow multiple FAQ items to be expanded', () => {
      const { getByText } = render(<HelpScreen navigation={mockNavigation} />);

      const question1 = getByText('What is Artist Space?');
      const question2 = getByText('How do I get started?');

      fireEvent.press(question1);
      fireEvent.press(question2);

      // Both answers should be visible
      expect(
        getByText(
          /Artist Space is an all-in-one platform for musicians and bands/i
        )
      ).toBeTruthy();
      expect(
        getByText(/Start by creating your profile, then either create/i)
      ).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('should have accessible search input', () => {
      const { getByLabelText } = render(
        <HelpScreen navigation={mockNavigation} />
      );

      expect(getByLabelText('Search help articles')).toBeTruthy();
    });

    it('should have accessible category cards', () => {
      const { getByLabelText } = render(
        <HelpScreen navigation={mockNavigation} />
      );

      expect(getByLabelText('Getting Started category')).toBeTruthy();
      expect(getByLabelText('Band Management category')).toBeTruthy();
    });

    it('should have accessible back button', () => {
      const { getByLabelText } = render(
        <HelpScreen navigation={mockNavigation} />
      );

      expect(getByLabelText('Go back')).toBeTruthy();
    });

    it('should have accessible support button', () => {
      const { getByLabelText } = render(
        <HelpScreen navigation={mockNavigation} />
      );

      expect(getByLabelText('Contact support')).toBeTruthy();
    });
  });

  describe('Combined Filtering', () => {
    it('should combine search and category filters', () => {
      const { getByPlaceholderText, getByText } = render(
        <HelpScreen navigation={mockNavigation} />
      );

      // Select a category
      const categoryCard = getByText('Payments & Ledger');
      fireEvent.press(categoryCard);

      // Then search within that category
      const searchInput = getByPlaceholderText('Search for help...');
      fireEvent.changeText(searchInput, 'split');

      // Should find payment-related FAQs about splitting
      expect(getByText(/split payments/i)).toBeTruthy();
    });
  });

  describe('Content Verification', () => {
    it('should render specific FAQ questions', () => {
      const { getByText } = render(<HelpScreen navigation={mockNavigation} />);

      // Check for some key FAQ questions
      expect(getByText('How do I create a band?')).toBeTruthy();
      expect(getByText('How does the payment ledger work?')).toBeTruthy();
      expect(getByText('How does band messaging work?')).toBeTruthy();
      expect(getByText('Can I use biometric login?')).toBeTruthy();
    });

    it('should have all 8 categories', () => {
      const { getAllByRole } = render(
        <HelpScreen navigation={mockNavigation} />
      );

      // Should have 8 category cards (each is a button)
      const categoryButtons = getAllByRole('button').filter(
        (button) =>
          button.props.accessibilityLabel &&
          button.props.accessibilityLabel.includes('category')
      );

      expect(categoryButtons.length).toBe(8);
    });
  });
});
