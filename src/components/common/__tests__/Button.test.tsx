/**
 * Component tests for Button
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Button } from '../Button';

describe('Button Component', () => {
  describe('Basic Rendering', () => {
    it('should render button with title', () => {
      const { getByText } = render(
        <Button title="Click Me" onPress={() => {}} />
      );
      expect(getByText('Click Me')).toBeTruthy();
    });

    it('should render with different variants', () => {
      const variants = ['primary', 'secondary', 'outline', 'danger', 'success'] as const;

      variants.forEach(variant => {
        const { getByText } = render(
          <Button title={`${variant} Button`} onPress={() => {}} variant={variant} />
        );
        expect(getByText(`${variant} Button`)).toBeTruthy();
      });
    });

    it('should render with different sizes', () => {
      const sizes = ['small', 'medium', 'large'] as const;

      sizes.forEach(size => {
        const { getByText } = render(
          <Button title={`${size} Button`} onPress={() => {}} size={size} />
        );
        expect(getByText(`${size} Button`)).toBeTruthy();
      });
    });

    it('should render with icon on left', () => {
      const { getByText } = render(
        <Button title="With Icon" onPress={() => {}} icon="checkmark" iconPosition="left" />
      );
      expect(getByText('With Icon')).toBeTruthy();
    });

    it('should render with icon on right', () => {
      const { getByText } = render(
        <Button title="With Icon" onPress={() => {}} icon="checkmark" iconPosition="right" />
      );
      expect(getByText('With Icon')).toBeTruthy();
    });
  });

  describe('Interaction', () => {
    it('should call onPress when pressed', () => {
      const onPressMock = jest.fn();
      const { getByText } = render(
        <Button title="Press Me" onPress={onPressMock} />
      );

      fireEvent.press(getByText('Press Me'));
      expect(onPressMock).toHaveBeenCalledTimes(1);
    });

    it('should not call onPress when disabled', () => {
      const onPressMock = jest.fn();
      const { getByText } = render(
        <Button title="Disabled" onPress={onPressMock} disabled={true} />
      );

      fireEvent.press(getByText('Disabled'));
      expect(onPressMock).not.toHaveBeenCalled();
    });

    it('should not call onPress when loading', () => {
      const onPressMock = jest.fn();
      const { getByRole } = render(
        <Button title="Loading" onPress={onPressMock} loading={true} />
      );

      const button = getByRole('button');
      fireEvent.press(button);
      expect(onPressMock).not.toHaveBeenCalled();
    });
  });

  describe('Loading State', () => {
    it('should show loading indicator when loading', () => {
      const { queryByText, getByRole } = render(
        <Button title="Submit" onPress={() => {}} loading={true} />
      );

      // Title should not be visible when loading
      expect(queryByText('Submit')).toBeFalsy();

      // Button should still exist
      expect(getByRole('button')).toBeTruthy();
    });

    it('should show title when not loading', () => {
      const { getByText } = render(
        <Button title="Submit" onPress={() => {}} loading={false} />
      );

      expect(getByText('Submit')).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('should have button role', () => {
      const { getByRole } = render(
        <Button title="Accessible" onPress={() => {}} />
      );

      expect(getByRole('button')).toBeTruthy();
    });

    it('should use title as default accessibility label', () => {
      const { getByLabelText } = render(
        <Button title="Submit Form" onPress={() => {}} />
      );

      expect(getByLabelText('Submit Form')).toBeTruthy();
    });

    it('should use custom accessibility label when provided', () => {
      const { getByLabelText } = render(
        <Button
          title="Submit"
          onPress={() => {}}
          accessibilityLabel="Submit registration form"
        />
      );

      expect(getByLabelText('Submit registration form')).toBeTruthy();
    });

    it('should have disabled state in accessibility', () => {
      const { getByRole } = render(
        <Button title="Disabled" onPress={() => {}} disabled={true} />
      );

      const button = getByRole('button');
      expect(button.props.accessibilityState.disabled).toBe(true);
    });

    it('should have busy state when loading', () => {
      const { getByRole } = render(
        <Button title="Loading" onPress={() => {}} loading={true} />
      );

      const button = getByRole('button');
      expect(button.props.accessibilityState.busy).toBe(true);
    });

    it('should include accessibility hint when provided', () => {
      const { getByRole } = render(
        <Button
          title="Save"
          onPress={() => {}}
          accessibilityHint="Saves your changes to the server"
        />
      );

      const button = getByRole('button');
      expect(button.props.accessibilityHint).toBe('Saves your changes to the server');
    });
  });

  describe('Full Width', () => {
    it('should render full width when specified', () => {
      const { getByRole } = render(
        <Button title="Full Width" onPress={() => {}} fullWidth={true} />
      );

      const button = getByRole('button');
      expect(button.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ width: '100%' })
        ])
      );
    });

    it('should not be full width by default', () => {
      const { getByRole } = render(
        <Button title="Normal" onPress={() => {}} />
      );

      const button = getByRole('button');
      const styles = Array.isArray(button.props.style) ? button.props.style : [button.props.style];
      const hasFullWidth = styles.some((style: any) => style?.width === '100%');
      expect(hasFullWidth).toBe(false);
    });
  });

  describe('Custom Styles', () => {
    it('should accept custom style prop', () => {
      const customStyle = { marginTop: 20, backgroundColor: 'red' };
      const { getByRole } = render(
        <Button title="Custom" onPress={() => {}} style={customStyle} />
      );

      const button = getByRole('button');
      expect(button.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ marginTop: 20 })
        ])
      );
    });

    it('should accept custom text style', () => {
      const customTextStyle = { fontSize: 20, fontWeight: 'bold' as const };
      const { getByText } = render(
        <Button title="Custom Text" onPress={() => {}} textStyle={customTextStyle} />
      );

      expect(getByText('Custom Text')).toBeTruthy();
    });
  });

  describe('Memoization', () => {
    it('should not re-render when parent re-renders with same props', () => {
      const onPressMock = jest.fn();
      const { rerender, getByText } = render(
        <Button title="Memoized" onPress={onPressMock} />
      );

      const firstRender = getByText('Memoized');

      // Re-render with same props
      rerender(<Button title="Memoized" onPress={onPressMock} />);

      const secondRender = getByText('Memoized');

      // Should be the same instance due to memoization
      expect(firstRender).toBe(secondRender);
    });
  });
});
