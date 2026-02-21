import { UserRole } from '../enums/user-role.enum';

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  [UserRole.SUPER_ADMIN]: 5,
  [UserRole.MANAGER]: 4,
  [UserRole.FINANCE]: 3,
  [UserRole.SAFETY]: 2,
  [UserRole.DISPATCHER]: 1,
};
