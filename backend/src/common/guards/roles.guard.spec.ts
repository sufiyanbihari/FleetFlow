import { RolesGuard } from './roles.guard';
import { Reflector } from '@nestjs/core';
import {
  ExecutionContext,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { UserRole } from '../enums/user-role.enum';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { PERMISSION_KEY } from '../decorators/permission.decorator';
import { Resource, Action } from '../constants/permission-map';
import { AuditService } from '../../modules/audit/audit.service';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: jest.Mocked<Reflector>;
  let mockAudit: jest.Mocked<AuditService>;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as unknown as jest.Mocked<Reflector>;

    // AuditService is fire-and-forget — mock it silently
    mockAudit = {
      log: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<AuditService>;

    guard = new RolesGuard(reflector, mockAudit);
  });

  const createMockContext = (role?: string) => {
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({
          user: role ? { role } : undefined,
          ip: '127.0.0.1',
        }),
      }),
    } as unknown as ExecutionContext;
  };

  it('should allow access if no decorators are present', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    const context = createMockContext(UserRole.DISPATCHER);
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should throw ForbiddenException if user identity is missing', () => {
    reflector.getAllAndOverride.mockImplementation((key) => {
      if (key === ROLES_KEY) return UserRole.MANAGER;
      return undefined;
    });
    const context = createMockContext(); // No user
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    expect(() => guard.canActivate(context)).toThrow(
      'User identity missing or unauthenticated',
    );
  });

  describe('Hierarchy Evaluation (@Roles)', () => {
    beforeEach(() => {
      reflector.getAllAndOverride.mockImplementation((key) => {
        if (key === ROLES_KEY) return UserRole.MANAGER;
        return undefined;
      });
    });

    it('should grant access if user priority exceeds minimum role (SUPER_ADMIN > MANAGER)', () => {
      const context = createMockContext(UserRole.SUPER_ADMIN);
      expect(guard.canActivate(context)).toBe(true);
    });

    it('should grant access if user priority equals minimum role (MANAGER == MANAGER)', () => {
      const context = createMockContext(UserRole.MANAGER);
      expect(guard.canActivate(context)).toBe(true);
    });

    it('should throw ForbiddenException if user priority is below minimum role (DISPATCHER < MANAGER)', () => {
      const context = createMockContext(UserRole.DISPATCHER);
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should throw InternalServerErrorException if an undefined UserRole is required', () => {
      reflector.getAllAndOverride.mockImplementation((key) => {
        if (key === ROLES_KEY) return 'FAKE_ROLE' as UserRole;
        return undefined;
      });
      const context = createMockContext(UserRole.SUPER_ADMIN);
      expect(() => guard.canActivate(context)).toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('Permission Evaluation (@Permission) - Overrides @Roles', () => {
    it('should evaluate Permission mapping OVER Roles mapping if both exist', () => {
      reflector.getAllAndOverride.mockImplementation((key) => {
        if (key === ROLES_KEY) return UserRole.SUPER_ADMIN;
        if (key === PERMISSION_KEY)
          return { resource: 'trips', action: 'cancel' }; // requires MANAGER
        return undefined;
      });
      const context = createMockContext(UserRole.MANAGER);
      expect(guard.canActivate(context)).toBe(true);
    });

    it('should grant access if user meets Permission threshold', () => {
      reflector.getAllAndOverride.mockImplementation((key) => {
        if (key === PERMISSION_KEY)
          return { resource: 'finance', action: 'create' }; // requires FINANCE (L1)
        return undefined;
      });
      const context = createMockContext(UserRole.SAFETY); // SAFETY (L2) >= FINANCE (L1)
      expect(guard.canActivate(context)).toBe(true);
    });

    it('should throw ForbiddenException if user fails Permission threshold', () => {
      reflector.getAllAndOverride.mockImplementation((key) => {
        if (key === PERMISSION_KEY)
          return { resource: 'maintenance', action: 'create' }; // requires SAFETY (L2)
        return undefined;
      });
      const context = createMockContext(UserRole.FINANCE); // FINANCE (L1) < SAFETY (L2)
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(context)).toThrow(
        'Resource access prohibited',
      );
    });

    it('should throw InternalServerErrorException if resource does not exist in Map', () => {
      reflector.getAllAndOverride.mockImplementation((key) => {
        if (key === PERMISSION_KEY)
          return {
            resource: 'invalid_resource' as unknown as Resource,
            action: 'create',
          };
        return undefined;
      });
      const context = createMockContext(UserRole.SUPER_ADMIN);
      expect(() => guard.canActivate(context)).toThrow(
        InternalServerErrorException,
      );
    });

    it('should throw InternalServerErrorException if action does not exist on a valid resource', () => {
      reflector.getAllAndOverride.mockImplementation((key) => {
        if (key === PERMISSION_KEY)
          return {
            resource: 'trips',
            action: 'invalid_action' as unknown as Action,
          };
        return undefined;
      });
      const context = createMockContext(UserRole.SUPER_ADMIN);
      expect(() => guard.canActivate(context)).toThrow(
        InternalServerErrorException,
      );
    });
  });
});
