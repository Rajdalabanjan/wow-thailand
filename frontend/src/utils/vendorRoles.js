// Every role a vehicle (cab / transfer) vendor login can have.
// The backend gives vehicle vendor accounts the role "transfer_vendor"; older accounts may use the others.
export const CAB_VENDOR_ROLES = ['vendor', 'cab_vendor', 'transfer_vendor', 'vehicle_vendor'];

export function isCabVendorRole(role) {
  return CAB_VENDOR_ROLES.includes(String(role || '').toLowerCase());
}

// B2B travel partner logins. Partner accounts in the database have the role "b2b_agent".
export const B2B_ROLES = ['b2b_agent', 'b2b', 'agent'];

export function isB2BRole(role) {
  return B2B_ROLES.includes(String(role || '').toLowerCase());
}
