import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export interface AuditLogEntry {
  userId?: string;
  userRole?: string;
  action: string;
  resource?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Persist an audit entry. Always call fire-and-forget:
   *   void this.auditService.log({ ... })
   * Never await inside a hot request path.
   */
  async log(entry: AuditLogEntry): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          ...entry,
          // Prisma requires InputJsonValue for Json fields
          metadata: entry.metadata as Prisma.InputJsonValue | undefined,
        },
      });
    } catch {
      // Audit failure must NEVER crash the application
      console.error(
        '[AuditService] Failed to persist audit log:',
        entry.action,
      );
    }
  }
}
