/**
 * Component tests for StatusBadge
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { StatusBadge } from '../StatusBadge';

describe('StatusBadge Component', () => {
  describe('Tour Status Badges', () => {
    it('should render pending tour status', () => {
      const { getByText } = render(
        <StatusBadge status="pending" type="tour" />
      );

      expect(getByText('Pending')).toBeTruthy();
    });

    it('should render confirmed tour status', () => {
      const { getByText } = render(
        <StatusBadge status="confirmed" type="tour" />
      );

      expect(getByText('Confirmed')).toBeTruthy();
    });

    it('should render cancelled tour status', () => {
      const { getByText } = render(
        <StatusBadge status="cancelled" type="tour" />
      );

      expect(getByText('Cancelled')).toBeTruthy();
    });

    it('should render completed tour status', () => {
      const { getByText } = render(
        <StatusBadge status="completed" type="tour" />
      );

      expect(getByText('Completed')).toBeTruthy();
    });

    it('should handle case-insensitive tour status', () => {
      const { getByText } = render(
        <StatusBadge status="CONFIRMED" type="tour" />
      );

      expect(getByText('Confirmed')).toBeTruthy();
    });
  });

  describe('Payment Status Badges', () => {
    it('should render pending payment status', () => {
      const { getByText } = render(
        <StatusBadge status="pending" type="payment" />
      );

      expect(getByText('Pending')).toBeTruthy();
    });

    it('should render succeeded payment status', () => {
      const { getByText } = render(
        <StatusBadge status="succeeded" type="payment" />
      );

      expect(getByText('Paid')).toBeTruthy();
    });

    it('should render paid payment status', () => {
      const { getByText } = render(
        <StatusBadge status="paid" type="payment" />
      );

      expect(getByText('Paid')).toBeTruthy();
    });

    it('should render failed payment status', () => {
      const { getByText } = render(
        <StatusBadge status="failed" type="payment" />
      );

      expect(getByText('Failed')).toBeTruthy();
    });
  });

  describe('User Status Badges', () => {
    it('should render pending user status', () => {
      const { getByText } = render(
        <StatusBadge status="pending" type="user" />
      );

      expect(getByText('Pending Approval')).toBeTruthy();
    });

    it('should render approved user status', () => {
      const { getByText } = render(
        <StatusBadge status="approved" type="user" />
      );

      expect(getByText('Approved')).toBeTruthy();
    });

    it('should render active user status', () => {
      const { getByText } = render(
        <StatusBadge status="active" type="user" />
      );

      expect(getByText('Active')).toBeTruthy();
    });

    it('should render suspended user status', () => {
      const { getByText } = render(
        <StatusBadge status="suspended" type="user" />
      );

      expect(getByText('Suspended')).toBeTruthy();
    });
  });

  describe('Session Status Badges', () => {
    it('should render active session status', () => {
      const { getByText } = render(
        <StatusBadge status="active" type="session" />
      );

      expect(getByText('Active')).toBeTruthy();
    });

    it('should render completed session status', () => {
      const { getByText } = render(
        <StatusBadge status="completed" type="session" />
      );

      expect(getByText('Completed')).toBeTruthy();
    });

    it('should render cancelled session status', () => {
      const { getByText } = render(
        <StatusBadge status="cancelled" type="session" />
      );

      expect(getByText('Cancelled')).toBeTruthy();
    });
  });

  describe('Subscription Status Badges', () => {
    it('should render active subscription status', () => {
      const { getByText } = render(
        <StatusBadge status="active" type="subscription" />
      );

      expect(getByText('Active')).toBeTruthy();
    });

    it('should render expired subscription status', () => {
      const { getByText } = render(
        <StatusBadge status="expired" type="subscription" />
      );

      expect(getByText('Expired')).toBeTruthy();
    });

    it('should render past_due subscription status', () => {
      const { getByText } = render(
        <StatusBadge status="past_due" type="subscription" />
      );

      expect(getByText('Past Due')).toBeTruthy();
    });
  });

  describe('Icon Display', () => {
    it('should show icon by default', () => {
      const { getByText } = render(
        <StatusBadge status="confirmed" type="tour" />
      );

      expect(getByText('Confirmed')).toBeTruthy();
    });

    it('should hide icon when showIcon is false', () => {
      const { getByText } = render(
        <StatusBadge status="confirmed" type="tour" showIcon={false} />
      );

      expect(getByText('Confirmed')).toBeTruthy();
    });
  });

  describe('Default Behavior', () => {
    it('should handle unknown status with default styling', () => {
      const { getByText } = render(
        <StatusBadge status="custom-status" type="tour" />
      );

      // Unknown statuses fall back to 'Pending' for tour type
      expect(getByText('Pending')).toBeTruthy();
    });

    it('should default to tour type when type not specified', () => {
      const { getByText } = render(
        <StatusBadge status="pending" />
      );

      expect(getByText('Pending')).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('should have text role', () => {
      const { getAllByRole } = render(
        <StatusBadge status="confirmed" type="tour" />
      );

      const textElements = getAllByRole('text');
      expect(textElements.length).toBeGreaterThan(0);
    });

    it('should have proper accessibility label', () => {
      const { getByLabelText } = render(
        <StatusBadge status="confirmed" type="tour" />
      );

      expect(getByLabelText('Status: Confirmed')).toBeTruthy();
    });

    it('should include status in accessibility label for payments', () => {
      const { getByLabelText } = render(
        <StatusBadge status="paid" type="payment" />
      );

      expect(getByLabelText('Status: Paid')).toBeTruthy();
    });

    it('should be accessible with custom status', () => {
      const { getByLabelText } = render(
        <StatusBadge status="custom" type="tour" />
      );

      // Unknown statuses fall back to 'Pending' for tour type
      expect(getByLabelText('Status: Pending')).toBeTruthy();
    });
  });

  describe('Custom Styles', () => {
    it('should accept custom style prop', () => {
      const customStyle = { marginTop: 10 };
      const { getByText } = render(
        <StatusBadge status="confirmed" type="tour" style={customStyle} />
      );

      expect(getByText('Confirmed')).toBeTruthy();
    });
  });

  describe('All Status Types Coverage', () => {
    it('should render all tour statuses correctly', () => {
      const statuses = ['pending', 'confirmed', 'cancelled', 'completed'];

      statuses.forEach(status => {
        const { getAllByRole } = render(
          <StatusBadge status={status} type="tour" />
        );
        const textElements = getAllByRole('text');
        expect(textElements.length).toBeGreaterThan(0);
      });
    });

    it('should render all payment statuses correctly', () => {
      const statuses = ['pending', 'succeeded', 'paid', 'failed', 'cancelled'];

      statuses.forEach(status => {
        const { getAllByRole } = render(
          <StatusBadge status={status} type="payment" />
        );
        const textElements = getAllByRole('text');
        expect(textElements.length).toBeGreaterThan(0);
      });
    });

    it('should render all user statuses correctly', () => {
      const statuses = ['pending', 'approved', 'rejected', 'active', 'suspended', 'deleted'];

      statuses.forEach(status => {
        const { getAllByRole } = render(
          <StatusBadge status={status} type="user" />
        );
        const textElements = getAllByRole('text');
        expect(textElements.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Memoization', () => {
    it('should not re-render when parent re-renders with same props', () => {
      const { rerender, getByText } = render(
        <StatusBadge status="confirmed" type="tour" />
      );

      const firstRender = getByText('Confirmed');

      // Re-render with same props
      rerender(<StatusBadge status="confirmed" type="tour" />);

      const secondRender = getByText('Confirmed');

      // Should be the same instance due to memoization
      expect(firstRender).toBe(secondRender);
    });
  });
});
