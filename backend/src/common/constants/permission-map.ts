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

export const POLICY_VERSION = 'v2';

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
    read: { minimumRole: UserRole.DISPATCHER, requiresOwnership: false },
    view: { minimumRole: UserRole.DISPATCHER, requiresOwnership: false },
  },
  vehicles: {
    create: { minimumRole: UserRole.MANAGER, requiresOwnership: false },
    update: { minimumRole: UserRole.MANAGER, requiresOwnership: false },
    delete: { minimumRole: UserRole.MANAGER, requiresOwnership: false },
    read: { minimumRole: UserRole.DISPATCHER, requiresOwnership: false }, // dispatchers need catalog visibility
    view: { minimumRole: UserRole.DISPATCHER, requiresOwnership: false },
  },
  drivers: {
    create: { minimumRole: UserRole.MANAGER, requiresOwnership: false },
    update: { minimumRole: UserRole.SAFETY, requiresOwnership: false }, // safety officers manage compliance & status
    delete: { minimumRole: UserRole.MANAGER, requiresOwnership: false },
    read: { minimumRole: UserRole.DISPATCHER, requiresOwnership: false },
    view: { minimumRole: UserRole.DISPATCHER, requiresOwnership: false },
  },
  maintenance: {
    create: { minimumRole: UserRole.SAFETY, requiresOwnership: false }, // putting a vehicle into shop
    complete: { minimumRole: UserRole.SAFETY, requiresOwnership: false },
    read: { minimumRole: UserRole.DISPATCHER, requiresOwnership: false }, // dispatch needs visibility to filter out in-shop assets
  },
  finance: {
    create: { minimumRole: UserRole.FINANCE, requiresOwnership: false },
    read: { minimumRole: UserRole.FINANCE, requiresOwnership: false },
    view: { minimumRole: UserRole.FINANCE, requiresOwnership: false },
  },
  analytics: {
    // Allow all authenticated roles to view high-level dashboard metrics
    view: { minimumRole: UserRole.DISPATCHER, requiresOwnership: false },
    read: { minimumRole: UserRole.DISPATCHER, requiresOwnership: false },
  },
};
