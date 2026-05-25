export const mockCustomers = [
  {
    id: 'a06fa78e-64d5-4929-a720-302251a37c01',
    name: 'Aarav Mehta',
    phone: '+91 98765 21010',
    email: 'aarav.mehta@example.com',
    city: 'Delhi',
    source: 'Offline',
    lifetimeValue: 18450,
    orderCount: 9
  },
  {
    id: 'b21fa78e-64d5-4929-a720-302251a37c02',
    name: 'Nisha Kapoor',
    phone: '+91 99880 12344',
    email: 'nisha.kapoor@example.com',
    city: 'Gurugram',
    source: 'Website',
    lifetimeValue: 12600,
    orderCount: 5
  },
  {
    id: 'c32fa78e-64d5-4929-a720-302251a37c03',
    name: 'Canvas & Co Cafe',
    phone: '+91 90909 11223',
    email: 'orders@canvascafe.example',
    city: 'Noida',
    source: 'Offline',
    lifetimeValue: 53200,
    orderCount: 14
  },
  {
    id: 'd43fa78e-64d5-4929-a720-302251a37c04',
    name: 'Priya Sethi',
    phone: '+91 98111 22009',
    email: 'priya.sethi@example.com',
    city: 'Jaipur',
    source: 'Marketplace',
    lifetimeValue: 8700,
    orderCount: 3
  }
];

export const mockPosters = [
  {
    id: 'e04fa78e-64d5-4929-a720-302251a37c05',
    sku: 'KP-MIN-18X24',
    title: 'Minimal Mountain Line Art',
    category: 'Minimal',
    tags: ['line-art', 'nature', 'home'],
    size: '18 x 24 in',
    price: 799,
    stock: 42,
    soldThisMonth: 38,
    active: true
  },
  {
    id: 'f15fa78e-64d5-4929-a720-302251a37c06',
    sku: 'KP-BOL-12X18',
    title: 'Bollywood Retro Collage',
    category: 'Pop Culture',
    tags: ['cinema', 'retro', 'gift'],
    size: '12 x 18 in',
    price: 599,
    stock: 18,
    soldThisMonth: 31,
    active: true
  },
  {
    id: 'a26fa78e-64d5-4929-a720-302251a37c07',
    sku: 'KP-CUS-A3',
    title: 'Personalized Name Poster',
    category: 'Personalized',
    tags: ['custom', 'kids', 'name'],
    size: 'A3',
    price: 999,
    stock: 0,
    soldThisMonth: 24,
    active: true
  },
  {
    id: 'b37fa78e-64d5-4929-a720-302251a37c08',
    sku: 'KP-TRV-A2',
    title: 'India Travel Grid',
    category: 'Travel',
    tags: ['travel', 'india', 'wall'],
    size: 'A2',
    price: 1199,
    stock: 11,
    soldThisMonth: 19,
    active: true
  }
];

export const mockSuppliers = [
  {
    id: 'c48fa78e-64d5-4929-a720-302251a37c09',
    name: 'Shree Paper Mart',
    contact: 'Manish Gupta',
    phone: '+91 93111 11122',
    category: 'Paper Rolls',
    outstanding: 18750
  },
  {
    id: 'd59fa78e-64d5-4929-a720-302251a37c10',
    name: 'FrameCraft India',
    contact: 'Sonal Arora',
    phone: '+91 98989 45454',
    category: 'Frames',
    outstanding: 9200
  },
  {
    id: 'e60fa78e-64d5-4929-a720-302251a37c11',
    name: 'Inkline Supplies',
    contact: 'Rajat Khanna',
    phone: '+91 98100 77770',
    category: 'Ink',
    outstanding: 0
  }
];

export const mockInventory = [
  {
    id: 'f71fa78e-64d5-4929-a720-302251a37c12',
    sku: 'MAT-PAPER-MATTE-24',
    name: 'Matte Paper Roll 24 inch',
    category: 'Paper Rolls',
    supplierId: 'c48fa78e-64d5-4929-a720-302251a37c09',
    unit: 'roll',
    quantity: 7,
    reorderLevel: 6,
    unitCost: 2450,
    lastMovement: 'Consumed for ORD-1048'
  },
  {
    id: 'a82fa78e-64d5-4929-a720-302251a37c13',
    sku: 'MAT-INK-CYAN-1L',
    name: 'Cyan Ink 1L',
    category: 'Ink',
    supplierId: 'e60fa78e-64d5-4929-a720-302251a37c11',
    unit: 'bottle',
    quantity: 3,
    reorderLevel: 5,
    unitCost: 1650,
    lastMovement: 'Purchase received'
  },
  {
    id: 'b93fa78e-64d5-4929-a720-302251a37c14',
    sku: 'MAT-FRM-BLK-A3',
    name: 'Black Frame A3',
    category: 'Frames',
    supplierId: 'd59fa78e-64d5-4929-a720-302251a37c10',
    unit: 'piece',
    quantity: 56,
    reorderLevel: 20,
    unitCost: 190,
    lastMovement: 'Reserved for custom jobs'
  },
  {
    id: 'c04fa78e-64d5-4929-a720-302251a37c15',
    sku: 'MAT-PACK-TUBE',
    name: 'Poster Shipping Tube',
    category: 'Packaging Material',
    supplierId: 'c48fa78e-64d5-4929-a720-302251a37c09',
    unit: 'piece',
    quantity: 14,
    reorderLevel: 25,
    unitCost: 38,
    lastMovement: 'Website shipments'
  }
];

export const mockOrders = [
  {
    id: 'd14fa78e-64d5-4929-a720-302251a37c16',
    orderNo: 'ORD-1048',
    customerId: 'a06fa78e-64d5-4929-a720-302251a37c01',
    customerName: 'Aarav Mehta',
    type: 'Custom Design',
    channel: 'Offline',
    status: 'Printing In Progress',
    priority: 'Rush',
    dueDate: new Date('2026-05-25T18:00:00.000Z'),
    total: 3499,
    paid: 1500,
    lines: [
      {
        id: '111fa78e-64d5-4929-a720-302251a37c17',
        description: 'Custom family collage poster',
        size: '24 x 36 in',
        quantity: 1,
        unitPrice: 3499,
        framing: 'Black frame'
      }
    ]
  },
  {
    id: 'e25fa78e-64d5-4929-a720-302251a37c18',
    orderNo: 'ORD-1049',
    customerId: 'b21fa78e-64d5-4929-a720-302251a37c02',
    customerName: 'Nisha Kapoor',
    type: 'Ready-made',
    channel: 'Website',
    status: 'Ready for Shipping',
    priority: 'Normal',
    dueDate: new Date('2026-05-24T18:00:00.000Z'),
    total: 1598,
    paid: 1598,
    lines: [
      {
        id: '222fa78e-64d5-4929-a720-302251a37c19',
        posterId: 'e04fa78e-64d5-4929-a720-302251a37c05',
        description: 'Minimal Mountain Line Art',
        size: '18 x 24 in',
        quantity: 2,
        unitPrice: 799,
        framing: 'No frame'
      }
    ]
  },
  {
    id: 'f36fa78e-64d5-4929-a720-302251a37c20',
    orderNo: 'ORD-1050',
    customerId: 'c32fa78e-64d5-4929-a720-302251a37c03',
    customerName: 'Canvas & Co Cafe',
    type: 'Personalized',
    channel: 'Offline',
    status: 'Lamination',
    priority: 'High',
    dueDate: new Date('2026-05-27T18:00:00.000Z'),
    total: 9800,
    paid: 5000,
    lines: [
      {
        id: '333fa78e-64d5-4929-a720-302251a37c21',
        description: 'Cafe menu wall posters set',
        size: 'A2',
        quantity: 7,
        unitPrice: 1400,
        framing: 'Wood frame'
      }
    ]
  },
  {
    id: 'a47fa78e-64d5-4929-a720-302251a37c22',
    orderNo: 'ORD-1051',
    customerId: 'd43fa78e-64d5-4929-a720-302251a37c04',
    customerName: 'Priya Sethi',
    type: 'Ready-made',
    channel: 'Marketplace',
    status: 'Delivered',
    priority: 'Normal',
    dueDate: new Date('2026-05-23T18:00:00.000Z'),
    total: 1199,
    paid: 1199,
    lines: [
      {
        id: '444fa78e-64d5-4929-a720-302251a37c23',
        posterId: 'b37fa78e-64d5-4929-a720-302251a37c08',
        description: 'India Travel Grid',
        size: 'A2',
        quantity: 1,
        unitPrice: 1199,
        framing: 'No frame'
      }
    ]
  }
];

export const mockPrintJobs = [
  {
    id: 'a58fa78e-64d5-4929-a720-302251a37c24',
    jobNo: 'JOB-501',
    orderId: 'd14fa78e-64d5-4929-a720-302251a37c16',
    orderNo: 'ORD-1048',
    customerName: 'Aarav Mehta',
    stage: 'Printing In Progress',
    priority: 'Rush',
    size: '24 x 36 in',
    material: 'Matte paper',
    estimatedCompletion: new Date('2026-05-24T18:00:00.000Z'),
    operator: 'Imran'
  },
  {
    id: 'b69fa78e-64d5-4929-a720-302251a37c25',
    jobNo: 'JOB-502',
    orderId: 'f36fa78e-64d5-4929-a720-302251a37c20',
    orderNo: 'ORD-1050',
    customerName: 'Canvas & Co Cafe',
    stage: 'Lamination',
    priority: 'High',
    size: 'A2',
    material: 'Gloss paper',
    estimatedCompletion: new Date('2026-05-25T13:00:00.000Z'),
    operator: 'Simran'
  },
  {
    id: 'c70fa78e-64d5-4929-a720-302251a37c26',
    jobNo: 'JOB-503',
    orderId: 'e25fa78e-64d5-4929-a720-302251a37c18',
    orderNo: 'ORD-1049',
    customerName: 'Nisha Kapoor',
    stage: 'Packaging',
    priority: 'Normal',
    size: '18 x 24 in',
    material: 'Poster stock',
    estimatedCompletion: new Date('2026-05-24T16:00:00.000Z'),
    operator: 'Vikram'
  }
];

export const mockShipments = [
  {
    id: 'd81fa78e-64d5-4929-a720-302251a37c27',
    orderId: 'e25fa78e-64d5-4929-a720-302251a37c18',
    orderNo: 'ORD-1049',
    customerName: 'Nisha Kapoor',
    carrier: 'Delhivery',
    trackingNo: 'DLV9218871',
    status: 'Packed',
    city: 'Gurugram',
    eta: new Date('2026-05-26T18:00:00.000Z')
  },
  {
    id: 'e92fa78e-64d5-4929-a720-302251a37c28',
    orderId: 'a47fa78e-64d5-4929-a720-302251a37c22',
    orderNo: 'ORD-1051',
    customerName: 'Priya Sethi',
    carrier: 'Blue Dart',
    trackingNo: 'BD7701298',
    status: 'Delivered',
    city: 'Jaipur',
    eta: new Date('2026-05-23T18:00:00.000Z')
  }
];

export const mockExpenses = [
  {
    id: 'fa3fa78e-64d5-4929-a720-302251a37c29',
    date: new Date('2026-05-20T00:00:00.000Z'),
    category: 'Materials',
    vendor: 'Shree Paper Mart',
    supplierId: 'c48fa78e-64d5-4929-a720-302251a37c09',
    amount: 28400,
    paymentMode: 'Bank Transfer',
    notes: 'Matte and gloss paper rolls'
  },
  {
    id: 'ab4fa78e-64d5-4929-a720-302251a37c30',
    date: new Date('2026-05-21T00:00:00.000Z'),
    category: 'Packaging',
    vendor: 'Local Packaging Depot',
    amount: 4200,
    paymentMode: 'UPI',
    notes: 'Shipping tubes and labels'
  },
  {
    id: 'bc5fa78e-64d5-4929-a720-302251a37c31',
    date: new Date('2026-05-22T00:00:00.000Z'),
    category: 'Utilities',
    vendor: 'Power Distribution',
    amount: 7650,
    paymentMode: 'Bank Transfer',
    notes: 'Monthly electricity advance'
  }
];

export const mockMonthlyMetrics = [
  { month: 'Jan', revenue: 148000, expenses: 72000, orders: 96 },
  { month: 'Feb', revenue: 164000, expenses: 76000, orders: 108 },
  { month: 'Mar', revenue: 189000, expenses: 84000, orders: 124 },
  { month: 'Apr', revenue: 211000, expenses: 91000, orders: 139 },
  { month: 'May', revenue: 236000, expenses: 97000, orders: 151 }
];
