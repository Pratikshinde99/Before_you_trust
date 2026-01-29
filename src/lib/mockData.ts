import { Entity, IncidentReport, EntityType } from '@/types';

// Mock data for demonstration - will be replaced with real API calls
export const mockEntities: Entity[] = [
  {
    id: '1',
    type: 'business',
    name: 'QuickLoans Pro',
    identifier: 'quickloanspro.com',
    createdAt: new Date('2024-01-15'),
    incidentCount: 23,
  },
  {
    id: '2',
    type: 'phone',
    name: 'Unknown Caller',
    identifier: '+1-555-0123',
    createdAt: new Date('2024-02-20'),
    incidentCount: 156,
  },
  {
    id: '3',
    type: 'website',
    name: 'FakeTechDeals',
    identifier: 'faketechdeals.net',
    createdAt: new Date('2024-03-10'),
    incidentCount: 89,
  },
  {
    id: '4',
    type: 'person',
    name: 'John D.',
    identifier: 'Freelance Developer - NYC',
    createdAt: new Date('2024-04-05'),
    incidentCount: 3,
  },
  {
    id: '5',
    type: 'service',
    name: 'FastShip Delivery',
    identifier: 'fastship-delivery.com',
    createdAt: new Date('2024-05-12'),
    incidentCount: 47,
  },
];

export const mockIncidents: IncidentReport[] = [
  {
    id: 'inc-1',
    entityId: '1',
    title: 'Hidden fees not disclosed upfront',
    description: 'Applied for a loan and was approved, but at signing discovered multiple hidden fees that were never mentioned. Total cost ended up being 3x what was advertised.',
    category: 'misrepresentation',
    severity: 'high',
    dateOccurred: new Date('2024-11-15'),
    location: 'Online',
    status: 'verified',
    createdAt: new Date('2024-11-16'),
    updatedAt: new Date('2024-11-16'),
  },
  {
    id: 'inc-2',
    entityId: '2',
    title: 'IRS impersonation scam call',
    description: 'Received call claiming to be from IRS demanding immediate payment via gift cards. Threatened arrest if not complied.',
    category: 'scam',
    severity: 'critical',
    dateOccurred: new Date('2024-12-01'),
    location: 'Phone',
    status: 'verified',
    createdAt: new Date('2024-12-01'),
    updatedAt: new Date('2024-12-02'),
  },
  {
    id: 'inc-3',
    entityId: '3',
    title: 'Never received ordered electronics',
    description: 'Ordered a laptop for $499. Payment was processed but product never shipped. No response to emails or calls.',
    category: 'non_delivery',
    severity: 'high',
    dateOccurred: new Date('2024-10-20'),
    location: 'Online',
    status: 'verified',
    createdAt: new Date('2024-10-25'),
    updatedAt: new Date('2024-10-25'),
  },
  {
    id: 'inc-4',
    entityId: '2',
    title: 'Repeated harassment calls',
    description: 'This number calls 5-10 times daily despite being asked to stop. Uses different variations of the same pitch.',
    category: 'harassment',
    severity: 'medium',
    dateOccurred: new Date('2024-11-28'),
    location: 'Phone',
    status: 'pending',
    createdAt: new Date('2024-11-29'),
    updatedAt: new Date('2024-11-29'),
  },
  {
    id: 'inc-5',
    entityId: '5',
    title: 'Package marked delivered but never received',
    description: 'Multiple packages marked as delivered over the past month but none actually arrived. Dispute claims denied.',
    category: 'non_delivery',
    severity: 'medium',
    dateOccurred: new Date('2024-12-10'),
    location: 'Boston, MA',
    status: 'pending',
    createdAt: new Date('2024-12-11'),
    updatedAt: new Date('2024-12-11'),
  },
];

export function searchEntities(query: string, entityType?: EntityType): Entity[] {
  const normalizedQuery = query.toLowerCase().trim();
  
  return mockEntities.filter(entity => {
    const matchesQuery = 
      entity.name.toLowerCase().includes(normalizedQuery) ||
      entity.identifier.toLowerCase().includes(normalizedQuery);
    
    const matchesType = !entityType || entity.type === entityType;
    
    return matchesQuery && matchesType;
  });
}

export function getEntityById(id: string): Entity | undefined {
  return mockEntities.find(e => e.id === id);
}

export function getIncidentsByEntityId(entityId: string): IncidentReport[] {
  return mockIncidents.filter(inc => inc.entityId === entityId);
}

export function getRecentIncidents(limit: number = 5): IncidentReport[] {
  return [...mockIncidents]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, limit)
    .map(inc => ({
      ...inc,
      entity: mockEntities.find(e => e.id === inc.entityId),
    }));
}
