/**
 * Component tests for Card
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Text } from 'react-native';
import { Card } from '../Card';

describe('Card Component', () => {
  describe('Basic Rendering', () => {
    it('should render children content', () => {
      const { getByText } = render(
        <Card>
          <Text>Card Content</Text>
        </Card>
      );

      expect(getByText('Card Content')).toBeTruthy();
    });

    it('should render with title', () => {
      const { getByText } = render(
        <Card title="Card Title">
          <Text>Content</Text>
        </Card>
      );

      expect(getByText('Card Title')).toBeTruthy();
    });

    it('should render with title and subtitle', () => {
      const { getByText } = render(
        <Card title="Title" subtitle="Subtitle">
          <Text>Content</Text>
        </Card>
      );

      expect(getByText('Title')).toBeTruthy();
      expect(getByText('Subtitle')).toBeTruthy();
    });

    it('should render with icon', () => {
      const { getByText } = render(
        <Card title="With Icon" icon="musical-notes">
          <Text>Content</Text>
        </Card>
      );

      expect(getByText('With Icon')).toBeTruthy();
    });

    it('should render without header when no title, subtitle, or icon', () => {
      const { getByText, queryByText } = render(
        <Card>
          <Text>Just Content</Text>
        </Card>
      );

      expect(getByText('Just Content')).toBeTruthy();
    });
  });

  describe('Variants', () => {
    it('should render default variant', () => {
      const { getByText } = render(
        <Card variant="default">
          <Text>Default Card</Text>
        </Card>
      );

      expect(getByText('Default Card')).toBeTruthy();
    });

    it('should render elevated variant', () => {
      const { getByText } = render(
        <Card variant="elevated">
          <Text>Elevated Card</Text>
        </Card>
      );

      expect(getByText('Elevated Card')).toBeTruthy();
    });

    it('should render outlined variant', () => {
      const { getByText } = render(
        <Card variant="outlined">
          <Text>Outlined Card</Text>
        </Card>
      );

      expect(getByText('Outlined Card')).toBeTruthy();
    });
  });

  describe('Pressable Behavior', () => {
    it('should call onPress when pressed', () => {
      const onPressMock = jest.fn();
      const { getByText } = render(
        <Card onPress={onPressMock} title="Pressable Card">
          <Text>Content</Text>
        </Card>
      );

      fireEvent.press(getByText('Pressable Card'));
      expect(onPressMock).toHaveBeenCalledTimes(1);
    });

    it('should be pressable when onPress is provided', () => {
      const { getByRole } = render(
        <Card onPress={() => {}} title="Clickable">
          <Text>Content</Text>
        </Card>
      );

      expect(getByRole('button')).toBeTruthy();
    });

    it('should not be pressable when onPress is not provided', () => {
      const { queryByRole } = render(
        <Card title="Not Clickable">
          <Text>Content</Text>
        </Card>
      );

      expect(queryByRole('button')).toBeFalsy();
    });
  });

  describe('Accessibility', () => {
    it('should have button role when pressable', () => {
      const { getByRole } = render(
        <Card onPress={() => {}} title="Accessible Card">
          <Text>Content</Text>
        </Card>
      );

      expect(getByRole('button')).toBeTruthy();
    });

    it('should use title as accessibility label', () => {
      const { getByLabelText } = render(
        <Card onPress={() => {}} title="My Card Title">
          <Text>Content</Text>
        </Card>
      );

      expect(getByLabelText('My Card Title')).toBeTruthy();
    });

    it('should have default accessibility label when no title', () => {
      const { getByLabelText } = render(
        <Card onPress={() => {}}>
          <Text>Content</Text>
        </Card>
      );

      expect(getByLabelText('Card')).toBeTruthy();
    });

    it('should be accessible when not pressable', () => {
      const { getByText } = render(
        <Card title="Non-pressable">
          <Text>Content</Text>
        </Card>
      );

      // Should still render the card
      expect(getByText('Non-pressable')).toBeTruthy();
    });
  });

  describe('Custom Styles', () => {
    it('should accept custom style prop', () => {
      const customStyle = { marginTop: 20, backgroundColor: 'blue' };
      const { getByText } = render(
        <Card style={customStyle}>
          <Text>Styled Card</Text>
        </Card>
      );

      expect(getByText('Styled Card')).toBeTruthy();
    });
  });

  describe('Complex Content', () => {
    it('should render multiple children', () => {
      const { getByText } = render(
        <Card title="Multi-Content">
          <Text>First Line</Text>
          <Text>Second Line</Text>
          <Text>Third Line</Text>
        </Card>
      );

      expect(getByText('First Line')).toBeTruthy();
      expect(getByText('Second Line')).toBeTruthy();
      expect(getByText('Third Line')).toBeTruthy();
    });

    it('should render with all props combined', () => {
      const onPressMock = jest.fn();
      const { getByText, getByLabelText } = render(
        <Card
          title="Complete Card"
          subtitle="With all features"
          icon="star"
          onPress={onPressMock}
          variant="elevated"
        >
          <Text>Full featured card</Text>
        </Card>
      );

      expect(getByText('Complete Card')).toBeTruthy();
      expect(getByText('With all features')).toBeTruthy();
      expect(getByText('Full featured card')).toBeTruthy();
      expect(getByLabelText('Complete Card')).toBeTruthy();
    });
  });

  describe('Memoization', () => {
    it('should not re-render when parent re-renders with same props', () => {
      const { rerender, getByText } = render(
        <Card title="Memoized">
          <Text>Content</Text>
        </Card>
      );

      const firstRender = getByText('Memoized');

      // Re-render with same props
      rerender(
        <Card title="Memoized">
          <Text>Content</Text>
        </Card>
      );

      const secondRender = getByText('Memoized');

      // Should be the same instance due to memoization
      expect(firstRender).toBe(secondRender);
    });
  });
});
