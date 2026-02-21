// Mirror definition from Backend: src/common/enums/user-role.enum.ts
export enum UserRole {
    SUPER_ADMIN = 'SUPER_ADMIN',
    MANAGER = 'MANAGER',
    DISPATCHER = 'DISPATCHER',
    SAFETY = 'SAFETY',
    FINANCE = 'FINANCE',
}

// Map Numeric Hierarchy securely defining true threshold priorities.
export const ROLE_HIERARCHY: Record<UserRole, number> = {
    [UserRole.SUPER_ADMIN]: 5,
    [UserRole.MANAGER]: 4,
    [UserRole.DISPATCHER]: 3,
    [UserRole.SAFETY]: 2,
    [UserRole.FINANCE]: 1,
};

export type MenuItem = {
    title: string;
    path: string;
    icon: string;
    minimumRole: UserRole; // Defines Minimum Tier required to view this module
};

// Define menu modules directly evaluating against explicit Minimum Tiers.
export const MENU_ITEMS: MenuItem[] = [
    {
        title: 'Dashboard',
        path: '/',
        icon: '📊',
        minimumRole: UserRole.FINANCE, // Lowest level, everybody can view basic
    },
    {
        title: 'Trip Dispatching',
        path: '/trips',
        icon: '🚚',
        minimumRole: UserRole.DISPATCHER, // Level 3+
    },
    {
        title: 'Maintenance Fleet',
        path: '/maintenance',
        icon: '🔧',
        minimumRole: UserRole.SAFETY, // Level 2+
    },
    {
        title: 'Financial Logs',
        path: '/finance',
        icon: '💰',
        minimumRole: UserRole.FINANCE, // Level 1+
    },
    {
        title: 'Analytics',
        path: '/analytics',
        icon: '📈',
        minimumRole: UserRole.MANAGER, // Level 4+ — MANAGER and above only
    },
];

/**
 * Validates whether the active User context evaluates safely against a threshold
 */
export const checkAccess = (userRole: UserRole | null | undefined, minimumRole: UserRole): boolean => {
    if (!userRole) return false;

    const userPriority = ROLE_HIERARCHY[userRole];
    const requiredPriority = ROLE_HIERARCHY[minimumRole];

    if (userPriority === undefined || requiredPriority === undefined) return false;

    return userPriority >= requiredPriority;
};
