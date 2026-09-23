export const mockAnalyses = [
  {
    id: 'ana-101',
    product: 'Industrial Safety Helmet',
    requirement: 'Industrial safety helmets for construction workers with 50J impact protection and electrical insulation.',
    category: 'Safety & Personal Protection',
    status: 'Ready',
    standardsCount: 6,
    date: 'Today',
    updated: 'Today',
    extracted: {
      product: 'Industrial Safety Helmet',
      application: 'Construction Site',
      purpose: 'Worker Head Protection',
      technical: '50J Impact, 1000V Insulation',
      keyRequirements: ['Impact Protection', 'Industrial Use', 'Electrical Insulation']
    }
  },
  {
    id: 'ana-102',
    product: 'Electrical Switchgear Panel',
    requirement: 'Low voltage switchgear equipment rated for 415V 3-phase industrial power distribution.',
    category: 'Electrical Distribution',
    status: 'Ready',
    standardsCount: 4,
    date: 'Yesterday',
    updated: 'Yesterday',
    extracted: {
      product: 'Low Voltage Switchgear',
      application: 'Industrial Power Distribution',
      purpose: 'Power Control & Circuit Protection',
      technical: '415V Rating, IP54 Enclosure',
      keyRequirements: ['Low Voltage', 'Circuit Breaking', 'Enclosure Protection']
    }
  },
  {
    id: 'ana-103',
    product: 'Ergonomic Office Seating',
    requirement: 'Adjustable high-back ergonomic mesh swivel chairs for office workspace.',
    category: 'Office & Facilities',
    status: 'Needs review',
    standardsCount: 3,
    date: '2 days ago',
    updated: '2 days ago',
    extracted: {
      product: 'Office Work Chair',
      application: 'Office Environment',
      purpose: 'Seating Ergonomics',
      technical: 'Height Adjustment, Lumbar Support',
      keyRequirements: ['Height Adjustability', 'Lumbar Support', 'Durability']
    }
  }
];
