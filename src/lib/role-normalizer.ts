/**
 * EcomHub OS — Role Key Normalization Layer
 * Guardrail B: A human-facing role label and its database role key must map predictably.
 * Creates ONE explicit role mapping layer to prevent misclassification or accidental privilege escalation.
 */

export interface RoleDefinition {
  canonicalKey: string;      // Stable explicit key: e.g. 'sales_representative'
  legacyKey: string;         // Existing DB key: e.g. 'Sales'
  label: string;             // Human-readable job label: e.g. 'Sales Representative'
  department: string;        // Department: e.g. 'Sales & Growth'
  description: string;       // Role responsibilities summary
}

export const CANONICAL_ROLES: Record<string, RoleDefinition> = {
  owner: {
    canonicalKey: 'owner',
    legacyKey: 'Owner',
    label: 'Owner / Master',
    department: 'Executive',
    description: 'Root platform authority with unrestricted access to all workspaces, data, and settings.',
  },
  business_admin: {
    canonicalKey: 'business_admin',
    legacyKey: 'Admin',
    label: 'Business Admin',
    department: 'Management',
    description: 'Workspace administrator with full operational, team management, and business control.',
  },
  operations_specialist: {
    canonicalKey: 'operations_specialist',
    legacyKey: 'Operations',
    label: 'Operations Specialist',
    department: 'Operations',
    description: 'Manages projects, tasks, workflows, client deliverables, and team coordination.',
  },
  sales_representative: {
    canonicalKey: 'sales_representative',
    legacyKey: 'Sales',
    label: 'Sales Representative',
    department: 'Sales & Growth',
    description: 'Handles lead qualification, pipeline management, client communication, and deal closing.',
  },
  marketing_manager: {
    canonicalKey: 'marketing_manager',
    legacyKey: 'Manager',
    label: 'Marketing Manager',
    department: 'Marketing & Campaigns',
    description: 'Oversees marketing campaigns, acquisition funnels, lead generation, and promotional projects.',
  },
  finance_manager: {
    canonicalKey: 'finance_manager',
    legacyKey: 'Finance',
    label: 'Finance Manager',
    department: 'Finance & Accounts',
    description: 'Responsible for invoicing, expense tracking, accounts payable/receivable, and P&L financial reports.',
  },
  employee_default: {
    canonicalKey: 'employee_default',
    legacyKey: 'Employee',
    label: 'Employee Default',
    department: 'General',
    description: 'Standard team member with access to assigned tasks, projects, and personal notifications.',
  },
  stakeholder_viewer: {
    canonicalKey: 'stakeholder_viewer',
    legacyKey: 'Viewer',
    label: 'Stakeholder / Viewer',
    department: 'External / Advisory',
    description: 'Read-only stakeholder with non-destructive view privileges across authorized modules.',
  },
};

/**
 * Normalizes any role input (canonical key, legacy key, or display label)
 * to its canonical definition.
 */
export function resolveRoleDefinition(roleInput: string | null | undefined): RoleDefinition {
  if (!roleInput || typeof roleInput !== 'string') {
    return CANONICAL_ROLES.employee_default;
  }

  const clean = roleInput.trim().toLowerCase().replace(/[\s\-_/]+/g, '_');

  // Direct match on canonicalKey
  if (CANONICAL_ROLES[clean]) {
    return CANONICAL_ROLES[clean];
  }

  // Match aliases and legacy keys
  switch (clean) {
    case 'owner':
    case 'owner_master':
    case 'master':
      return CANONICAL_ROLES.owner;

    case 'admin':
    case 'business_admin':
      return CANONICAL_ROLES.business_admin;

    case 'operations':
    case 'operations_specialist':
    case 'ops':
      return CANONICAL_ROLES.operations_specialist;

    case 'sales':
    case 'sales_representative':
    case 'sales_rep':
    case 'growth':
      return CANONICAL_ROLES.sales_representative;

    case 'manager':
    case 'marketing_manager':
    case 'marketing':
      return CANONICAL_ROLES.marketing_manager;

    case 'finance':
    case 'finance_manager':
    case 'accountant':
      return CANONICAL_ROLES.finance_manager;

    case 'employee':
    case 'employee_default':
    case 'team_member':
      return CANONICAL_ROLES.employee_default;

    case 'viewer':
    case 'stakeholder_viewer':
    case 'stakeholder':
    case 'guest':
      return CANONICAL_ROLES.stakeholder_viewer;

    default:
      return {
        canonicalKey: clean,
        legacyKey: roleInput,
        label: roleInput,
        department: 'General',
        description: `Custom assigned role: ${roleInput}`,
      };
  }
}

/**
 * Returns all recognized alias keys for a role so lookup across
 * legacy database rows and normalized keys works seamlessly.
 */
export function getRoleAliases(roleInput: string): string[] {
  const def = resolveRoleDefinition(roleInput);
  return Array.from(new Set([
    def.canonicalKey,
    def.legacyKey,
    def.label,
    def.legacyKey.toLowerCase(),
    def.canonicalKey.toLowerCase(),
  ]));
}

/**
 * Normalizes an array of role strings into an array of deduplicated canonical keys.
 */
export function normalizeRoleList(roles: (string | null | undefined)[]): string[] {
  if (!Array.isArray(roles)) return [];
  return Array.from(new Set(roles.map((r) => resolveRoleDefinition(r).canonicalKey)));
}
