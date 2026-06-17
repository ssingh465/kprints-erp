/** All order / production stage strings shared across services. */
export const PRODUCTION_JOB_STAGES = [
  'Draft',
  'Design Pending',
  'Design Approved',
  'Printing Queued',
  'Printing In Progress',
  'Lamination',
  'Framing',
  'Packaging',
  'Ready for Pickup',
  'Ready for Shipping',
  'Delivered',
  'Cancelled',
] as const;

export type ProductionJobStage = (typeof PRODUCTION_JOB_STAGES)[number];

export const PRODUCTION_JOB_CREATE_STAGES = [
  'Design Approved',
  'Printing Queued',
  'Printing In Progress',
  'Lamination',
  'Framing',
  'Packaging',
] as const;
