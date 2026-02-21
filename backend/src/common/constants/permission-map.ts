import { UserRole } from '../enums/user-role.enum';

export type Resource =
  | 'trips'
  | 'vehicles'
  | 'drivers'
  | 'maintenance'
  | 'finance'
  | 'analytics';

export type Action =
  | 'create'
  | 'complete'
  | 'cancel'
  | 'view'
  | 'read'
  | 'update'
  | 'delete'
  | 'dispatch';

export interface PermissionConfig {
  minimumRole: UserRole;
  /**
   * If true, the guard checks that the requesting user owns the resource.
   * MANAGER+ always bypass ownership checks (supervisor override).
   * Services are responsible for performing the actual ownership lookup.
   */
  requiresOwnership?: boolean;
}

export const POLICY_VERSION = 'v1';

/**
 * Maps resource:action → PermissionConfig.
 * Evaluated by RolesGuard for every @Permission() decorated endpoint.
 */
export const PERMISSION_MAP: Partial<
  Record<Resource, Partial<Record<Action, PermissionConfig>>>
> = {
  trips: {
    create: { minimumRole: UserRole.DISPATCHER, requiresOwnership: false },
    complete: { minimumRole: UserRole.DISPATCHER, requiresOwnership: true }, // driver completes own trip
    cancel: { minimumRole: UserRole.MANAGER, requiresOwnership: false }, // managers cancel any trip
    dispatch: { minimumRole: UserRole.DISPATCHER, requiresOwnership: false },
  },
  maintenance: {
    create: { minimumRole: UserRole.SAFETY, requiresOwnership: false },
    complete: { minimumRole: UserRole.SAFETY, requiresOwnership: false },
  },
  finance: {
    create: { minimumRole: UserRole.FINANCE, requiresOwnership: false },
  },
  analytics: {
    view: { minimumRole: UserRole.MANAGER, requiresOwnership: false },
    read: { minimumRole: UserRole.MANAGER, requiresOwnership: false },
  },
};
