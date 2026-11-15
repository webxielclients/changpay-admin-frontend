export type PermissionName = string;

export function hasPermission(
  permissions: readonly PermissionName[] | null | undefined,
  required: PermissionName,
): boolean {
  return Boolean(permissions?.includes(required));
}

export function canView(
  permissions: readonly PermissionName[] | null | undefined,
  required?: PermissionName,
): boolean {
  return !required || hasPermission(permissions, required);
}

