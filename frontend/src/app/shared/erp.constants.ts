/** Shared order / production stage strings — keep in sync with backend constants/stages.ts */
export const ORDER_STATUSES = [
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

export const PRODUCTION_KANBAN_STAGES = [
  'Design Approved',
  'Printing Queued',
  'Printing In Progress',
  'Lamination',
  'Framing',
  'Packaging',
  'Ready for Pickup',
  'Ready for Shipping',
] as const;

export const PRINT_QUEUE_STAGES = [
  'Printing Queued',
  'Printing In Progress',
  'Lamination',
  'Framing',
  'Packaging',
  'Ready for Pickup',
  'Ready for Shipping',
] as const;

export const PAYMENT_METHODS = ['Cash', 'UPI', 'Card', 'Bank Transfer'] as const;

export const SETUP_CONFIRM_TOKEN = 'RESET_PROD' as const;
