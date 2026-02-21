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
    [UserRole.FINANCE]: 3,
    [UserRole.SAFETY]: 2,
    [UserRole.DISPATCHER]: 1,
};

export type MenuItem = {
    title: string;
    path: string;
    icon: string;
    minimumRole: UserRole; // Defines Minimum Tier required to view this module
    allowedRoles?: UserRole[]; // Optional allow-list for role-specific lanes
};

// Define menu modules directly evaluating against explicit Minimum Tiers.
export const MENU_ITEMS: MenuItem[] = [
    {
        title: 'Dashboard',
        path: '/',
        icon: '📊',
        minimumRole: UserRole.DISPATCHER,
        allowedRoles: [
            UserRole.SUPER_ADMIN,
            UserRole.MANAGER,
            UserRole.FINANCE,
            UserRole.SAFETY,
            UserRole.DISPATCHER,
        ],
    },
    {
        title: 'Trip Dispatching',
        path: '/trips',
        icon: '🚚',
        minimumRole: UserRole.DISPATCHER,
        allowedRoles: [UserRole.SUPER_ADMIN, UserRole.MANAGER, UserRole.DISPATCHER],
    },
    {
        title: 'Maintenance Fleet',
        path: '/maintenance',
        icon: '🔧',
        minimumRole: UserRole.SAFETY,
        allowedRoles: [UserRole.SUPER_ADMIN, UserRole.MANAGER, UserRole.SAFETY],
    },
    {
        title: 'Financial Logs',
        path: '/finance',
        icon: '💰',
        minimumRole: UserRole.FINANCE,
        allowedRoles: [UserRole.SUPER_ADMIN, UserRole.MANAGER, UserRole.FINANCE],
    },
    {
        title: 'Analytics',
        path: '/analytics',
        icon: '📈',
        minimumRole: UserRole.FINANCE,
        allowedRoles: [UserRole.SUPER_ADMIN, UserRole.MANAGER, UserRole.FINANCE],
    },
];

/**
 * Validates whether the active User context evaluates safely against a threshold
 */
export const checkAccess = (userRole: UserRole | null | undefined, item: MenuItem): boolean => {
    if (!userRole) return false;

    if (item.allowedRoles && !item.allowedRoles.includes(userRole)) {
        return false;
    }

    const userPriority = ROLE_HIERARCHY[userRole];
    const requiredPriority = ROLE_HIERARCHY[item.minimumRole];

    if (userPriority === undefined || requiredPriority === undefined) return false;

    return userPriority >= requiredPriority;
};
