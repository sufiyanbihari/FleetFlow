import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../enums/user-role.enum';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { PERMISSION_KEY } from '../decorators/permission.decorator';
import { ROLE_HIERARCHY } from '../constants/role-hierarchy';
import { PERMISSION_MAP, Resource, Action } from '../constants/permission-map';
import { AuditService } from '../../modules/audit/audit.service';

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly auditService: AuditService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredMinimumRole = this.reflector.getAllAndOverride<UserRole>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    const requiredPermission = this.reflector.getAllAndOverride<{
      resource: Resource;
      action: Action;
    }>(PERMISSION_KEY, [context.getHandler(), context.getClass()]);

    const req = context.switchToHttp().getRequest<{
      user?: { id?: string; role?: UserRole };
      ip?: string;
      headers?: Record<string, string>;
    }>();
    const user = req.user;

    if (!requiredMinimumRole && !requiredPermission) {
      return true;
    }

    if (!user || user.role === undefined) {
      this.logger.warn(
        'Authorization blocked: Unauthenticated or missing role identity',
      );
      void this.auditService.log({
        action: 'RBAC_DENIAL',
        ipAddress: req.ip,
        metadata: { reason: 'Unauthenticated request' },
      });
      throw new ForbiddenException('User identity missing or unauthenticated');
    }

    const activeRole = user.role;
    const userPriority = ROLE_HIERARCHY[activeRole];
    const isProd = process.env['NODE_ENV'] === 'production';

    // ── 1. Permission-based check ──────────────────────────────────────────
    if (requiredPermission) {
      const { resource, action } = requiredPermission;
      const resourceMap = PERMISSION_MAP[resource];

      if (!resourceMap) {
        void this.auditService.log({
          userId: user.id,
          userRole: activeRole,
          action: 'RBAC_CONFIG_ERROR',
          resource,
          metadata: { reason: 'Resource not in PERMISSION_MAP' },
        });
        if (isProd) throw new ForbiddenException('Access denied');
        throw new InternalServerErrorException(
          `System Exception: Resource '${resource}' is not defined inside authorization map.`,
        );
      }

      const permConfig = resourceMap[action];
      if (!permConfig) {
        void this.auditService.log({
          userId: user.id,
          userRole: activeRole,
          action: 'RBAC_CONFIG_ERROR',
          resource,
          metadata: { reason: `Action '${action}' has no config` },
        });
        if (isProd) throw new ForbiddenException('Access denied');
        throw new InternalServerErrorException(
          `System Exception: Action '${action}' on resource '${resource}' lacks defined role threshold.`,
        );
      }

      const requiredPriority = ROLE_HIERARCHY[permConfig.minimumRole];
      if (requiredPriority === undefined || requiredPriority === null) {
        if (isProd) throw new ForbiddenException('Access denied');
        throw new InternalServerErrorException(
          'System Exception: Configuration exception across permissions and Role Map definitions',
        );
      }

      if (userPriority >= requiredPriority) {
        // Ownership check is enforced at the service layer (canActivate only checks role level)
        return true;
      }

      this.logger.warn(
        `ABAC Denial [User: ${user.id ?? 'unknown'}] - Lacks clearance for ${resource}:${action}`,
      );
      void this.auditService.log({
        userId: user.id,
        userRole: activeRole,
        action: 'RBAC_DENIAL',
        resource,
        ipAddress: req.ip,
        metadata: {
          required: permConfig.minimumRole,
          userRole: activeRole,
          action,
        },
      });
      throw new ForbiddenException('Resource access prohibited');
    }

    // ── 2. Role-only threshold check ──────────────────────────────────────
    if (requiredMinimumRole) {
      const requiredPriority = ROLE_HIERARCHY[requiredMinimumRole];
      if (requiredPriority === undefined || requiredPriority === null) {
        if (isProd) throw new ForbiddenException('Access denied');
        throw new InternalServerErrorException(
          'System Exception: Required Minimum Role maps to an undefined hierarchical state.',
        );
      }

      if (userPriority >= requiredPriority) {
        return true;
      }

      this.logger.warn(
        `RBAC Denial [User: ${user.id ?? 'unknown'}] - Lacks role minimum ${requiredMinimumRole}`,
      );
      void this.auditService.log({
        userId: user.id,
        userRole: activeRole,
        action: 'RBAC_DENIAL',
        ipAddress: req.ip,
        metadata: { requiredMinimumRole, userRole: activeRole },
      });
      throw new ForbiddenException('Insufficient role');
    }

    this.logger.warn(
      `Authorization blocked: Default fallback denial for user ${user.id ?? 'unknown'}`,
    );
    throw new ForbiddenException(
      'Access denied securely in default fallback condition',
    );
  }
}
