// Core entity types for Before You Trust

export type EntityType = 'person' | 'business' | 'phone' | 'website' | 'service';

export interface Entity {
  id: string;
  type: EntityType;
  name: string;
  identifier: string; // phone number, URL, business registration, etc.
  createdAt: Date;
  incidentCount: number;
}

export interface IncidentReport {
  id: string;
  entityId: string;
  entity?: Entity;
  title: string;
  description: string;
  category: IncidentCategory;
  severity: 'low' | 'medium' | 'high' | 'critical';
  dateOccurred: Date;
  location?: string;
  evidence?: string[]; // URLs to evidence
  status: 'pending' | 'verified' | 'disputed';
  createdAt: Date;
  updatedAt: Date;
}

export type IncidentCategory = 
  | 'fraud'
  | 'scam'
  | 'harassment'
  | 'misrepresentation'
  | 'non_delivery'
  | 'quality_issue'
  | 'safety_concern'
  | 'data_breach'
  | 'unauthorized_charges'
  | 'other';

export interface SearchFilters {
  entityType?: EntityType;
  category?: IncidentCategory;
  severity?: IncidentReport['severity'];
  dateFrom?: Date;
  dateTo?: Date;
}

export interface SearchResult {
  entity: Entity;
  recentIncidents: IncidentReport[];
  totalIncidents: number;
}

// Form types
export interface IncidentSubmission {
  entityType: EntityType;
  entityName: string;
  entityIdentifier: string;
  title: string;
  description: string;
  category: IncidentCategory;
  severity: IncidentReport['severity'];
  dateOccurred: string;
  location?: string;
  evidence?: string[];
}
