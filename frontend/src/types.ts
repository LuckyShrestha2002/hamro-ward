// Shared domain types for Hamro Ward.

export type Category =
  | 'Pothole / Road'
  | 'Streetlight'
  | 'Water Supply'
  | 'Waste Management'
  | 'Other';

export type Severity = 'Low' | 'Medium' | 'High';

// Status workflow (expanded in the status-workflow phase).
export type ReportStatus = 'Reported' | 'Under Review' | 'In Progress' | 'Resolved';

/** AI vision categorization result. */
export interface Detection {
  category: Category | string;
  description_en: string;
  description_np: string;
  severity: Severity | string;
}

/** A report row as stored in / read from Supabase. */
export interface Report {
  id: string;
  tracking_id: string | null;
  category: string;
  severity: string | null;
  description_en: string | null;
  description_np: string | null;
  ward: string | null;
  municipality: string | null;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  reporter_name: string | null;
  contact: string | null;
  nibedan: string | null;
  english_letter: string | null;
  recommendation: Recommendation | null;
  image_url: string | null;
  status: ReportStatus;
  created_at: string;
}

/** Fields we send when creating a report (DB fills id, tracking_id, created_at). */
export type NewReport = Omit<Report, 'id' | 'tracking_id' | 'created_at' | 'status'> & {
  status?: ReportStatus;
};

export interface ReportStatusHistory {
  id: string;
  report_id: string;
  status: ReportStatus;
  note: string | null;
  created_at: string;
}

/** AI recommendation (recommendations phase). */
export interface Recommendation {
  recommended_action: string;
  suggested_priority: Severity | string;
  urgency: string;
}
