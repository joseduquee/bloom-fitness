import { roleLabels, userStatusLabels, type Role, type UserStatus } from '@bloom/shared';
import { Badge, type BadgeTone } from '../../components/ui/badge';

const statusTones: Record<UserStatus, BadgeTone> = {
  ACTIVE: 'success',
  PENDING: 'warning',
  INACTIVE: 'neutral',
};

export function StatusBadge({ status }: { status: UserStatus }) {
  return <Badge tone={statusTones[status]}>{userStatusLabels[status]}</Badge>;
}

export function RoleBadge({ role }: { role: Role }) {
  return <Badge tone={role === 'CLIENT' ? 'neutral' : 'brand'}>{roleLabels[role]}</Badge>;
}
