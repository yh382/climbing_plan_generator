// Stub API for Window AF. Backend endpoints (GET /reports/mine + POST /reports)
// don't exist yet. When the real endpoints land, replace listMine/create with
// api.get / api.post calls.

export interface Report {
  id: string;
  kind: 'broken_bolt' | 'access_issue' | 'incorrect_info' | 'other';
  subject_type: 'route' | 'crag' | 'area';
  subject_id: string;
  subject_name: string;
  description: string;
  status: 'open' | 'resolved' | 'dismissed';
  created_at: string;
}

export const reportsApi = {
  listMine: async (): Promise<Report[]> => {
    return [];
  },
};
