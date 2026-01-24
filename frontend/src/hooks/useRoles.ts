import { useAuth0 } from '@auth0/auth0-react';

const ROLES_NAMESPACE = 'https://lotg-exams.com/roles';

export function useRoles() {
  const { user, isAuthenticated } = useAuth0();

  const roles: string[] = user?.[ROLES_NAMESPACE] || [];
  const isAdmin = roles.includes('admin');

  return { roles, isAdmin, isAuthenticated };
}
