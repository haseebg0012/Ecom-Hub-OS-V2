// Workspace Data Reset Utility
export function clearAllWorkspaceData() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('ecomhub_leads', JSON.stringify([]));
    localStorage.setItem('ecomhub_clients', JSON.stringify([]));
    localStorage.setItem('ecomhub_client_contacts', JSON.stringify([]));
    localStorage.setItem('ecomhub_client_notes', JSON.stringify([]));
    localStorage.setItem('ecomhub_crm_activities', JSON.stringify([]));
    localStorage.setItem('ecomhub_lead_followups', JSON.stringify([]));
    localStorage.setItem('ecomhub_notifications', JSON.stringify([]));
    localStorage.setItem('ecomhub_employees', JSON.stringify([]));
    localStorage.setItem('ecomhub_members', JSON.stringify([]));

    const allKeys = Object.keys(localStorage);
    const keysToEmpty: string[] = [];

    for (const k of allKeys) {
      if (
        k.startsWith('ecomhub_invoices_') ||
        k.startsWith('ecomhub_invoice_items_') ||
        k.startsWith('ecomhub_payments_') ||
        k.startsWith('ecomhub_expenses_') ||
        k.startsWith('ecomhub_incomes_') ||
        k.startsWith('ecomhub_investments_') ||
        k.startsWith('ecomhub_recurring_') ||
        k.startsWith('ecomhub_transactions_') ||
        k.startsWith('ecomhub_tasks') ||
        k.startsWith('ecomhub_projects')
      ) {
        keysToEmpty.push(k);
      } else if (k.startsWith('ecomhub_accounts_')) {
        try {
          const raw = localStorage.getItem(k);
          if (raw) {
            const accs = JSON.parse(raw);
            const zeroed = (accs || []).map((a: any) => ({
              ...a,
              opening_balance: 0,
              current_balance: 0,
            }));
            localStorage.setItem(k, JSON.stringify(zeroed));
          }
        } catch {}
      }
    }

    keysToEmpty.forEach((k) => {
      localStorage.setItem(k, JSON.stringify([]));
    });

    localStorage.setItem('ecomhub_fresh_clean_v16_accounts_zero', 'true');

    window.dispatchEvent(new Event('ecomhub_leads_updated'));
    window.dispatchEvent(new Event('ecomhub_employees_updated'));
    window.dispatchEvent(new Event('ecomhub_tasks_updated'));
    window.dispatchEvent(new Event('ecomhub_projects_updated'));
    window.dispatchEvent(new Event('ecomhub_crm_activities_updated'));
  } catch (err) {
    console.error('Error executing workspace data reset:', err);
  }
}
