/**
 * Navigation Type Definitions
 *
 * Centralized navigation types for better type safety across the app.
 * These types improve IDE autocomplete and catch navigation errors at compile time.
 */

/**
 * Base navigation prop with common navigation methods
 */
export interface BaseNavigationProp {
  navigate: (screen: string, params?: Record<string, unknown>) => void;
  goBack: () => void;
  replace?: (screen: string, params?: Record<string, unknown>) => void;
  push?: (screen: string, params?: Record<string, unknown>) => void;
  pop?: (count?: number) => void;
}

/**
 * Route prop with typed params
 */
export interface BaseRouteProp<T = Record<string, unknown>> {
  params: T;
  key: string;
  name: string;
}

/**
 * Screen props combining navigation and route
 */
export interface ScreenProps<
  RouteParams = Record<string, unknown>,
  Nav extends BaseNavigationProp = BaseNavigationProp
> {
  navigation: Nav;
  route: BaseRouteProp<RouteParams>;
}

/**
 * Common screen route params
 */
export interface BandDetailsParams {
  bandId: string;
  bandName?: string;
}

export interface ManageMembersParams {
  bandId: string;
  bandName: string;
}

export interface TourDetailsParams {
  tourId: string;
}

export interface ChatParams {
  userId: string;
  userName?: string;
}

export interface SessionDetailsParams {
  sessionId: string;
}

export interface EventDetailsParams {
  eventId: string;
}

/**
 * Specific navigation props for different screens
 */
export interface BandDetailsNavigationProp extends BaseNavigationProp {
  navigate: (
    screen: 'EditBand' | 'ManageMembers' | 'BandTours' | 'BandMedia' | 'TourDetails',
    params?: Record<string, unknown>
  ) => void;
}

export interface DashboardNavigationProp extends BaseNavigationProp {
  navigate: (
    screen: 'CreateBand' | 'JoinBand' | 'MyBands' | 'BandDetails' | 'TourDetails' | 'PaymentLedger' | 'Messages' | 'Chat' | 'Calendar',
    params?: Record<string, unknown>
  ) => void;
}

export interface CalendarNavigationProp extends BaseNavigationProp {
  navigate: (
    screen: 'TourDetails' | 'CreateTour',
    params?: Record<string, unknown>
  ) => void;
}
