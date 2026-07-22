/**
 * Roster of Cyber Crime Branch officers available for case assignment.
 *
 * This is seed/reference data for the assignment workflow. When a real
 * officer-directory backend endpoint exists, replace this array with a
 * fetch — every consumer reads from here, so nothing else changes.
 */
export const OFFICERS = [
  { id: 'off-01', name: 'Insp. A. Sharma', unit: 'Cyber Crime Cell' },
  { id: 'off-02', name: 'SI R. Nair', unit: 'Financial Fraud' },
  { id: 'off-03', name: 'Insp. P. Deshmukh', unit: 'Phishing & Malware' },
  { id: 'off-04', name: 'SI K. Verma', unit: 'Social Media Crimes' },
  { id: 'off-05', name: 'ASI M. Iqbal', unit: 'Threat Intelligence' },
  { id: 'off-06', name: 'Insp. S. Reddy', unit: 'Crypto Investigations' },
]

export function officerByName(name) {
  return OFFICERS.find((o) => o.name === name) || null
}
