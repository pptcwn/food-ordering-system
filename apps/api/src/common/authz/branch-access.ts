import { ForbiddenException } from '@nestjs/common';
import { UserRole } from '@food-ordering/types';

type Principal = {
  role?: UserRole;
  staff?: { branchId?: string | null } | null;
};

/** Enforce persisted staff branch scope; only super-admin may cross branches. */
export function requireBranchAccess(user: Principal | undefined, branchId: string | null | undefined): string | undefined {
  if (!user || !user.role) throw new ForbiddenException('Branch access denied');
  if (user.role === UserRole.SUPER_ADMIN) return branchId ?? undefined;
  const staffBranchId = user.staff?.branchId;
  if (!staffBranchId || !branchId || staffBranchId !== branchId) {
    throw new ForbiddenException('Branch access denied');
  }
  return staffBranchId;
}

/** Reject a caller-supplied foreign branch filter and return the effective branch. */
export function effectiveBranchScope(user: Principal | undefined, requestedBranchId?: string): string | undefined {
  if (!user || !user.role) throw new ForbiddenException('Branch access denied');
  if (user.role === UserRole.SUPER_ADMIN) return requestedBranchId;
  const staffBranchId = user.staff?.branchId;
  if (!staffBranchId || (requestedBranchId && requestedBranchId !== staffBranchId)) {
    throw new ForbiddenException('Branch access denied');
  }
  return staffBranchId;
}
