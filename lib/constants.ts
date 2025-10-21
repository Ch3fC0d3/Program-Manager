export const STAGES = [
  'LEAD',
  'CONTACTED',
  'PENDING',
  'QUALIFIED',
  'NEGOTIATING',
  'ACTIVE',
  'ON_HOLD',
  'WON',
  'LOST',
  'ARCHIVED'
] as const

export const StageLabel: Record<string, string> = {
  LEAD: 'Lead',
  CONTACTED: 'Contacted',
  PENDING: 'Pending',
  QUALIFIED: 'Qualified',
  NEGOTIATING: 'Negotiating',
  ACTIVE: 'Active',
  ON_HOLD: 'On Hold',
  WON: 'Won',
  LOST: 'Lost',
  ARCHIVED: 'Archived',
}
