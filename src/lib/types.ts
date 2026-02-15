export type WorkType = 'book' | 'audiobook';

export type WorkStatus = 'read' | 'reading' | 'toread' | 'dnf';

export interface Work {
  id: string;
  title: string;
  author: string;
  type: WorkType;
  status: WorkStatus;
  rating?: number; // 0-5 stars
  dateRead?: string; // ISO date string
  dateAdded: string; // ISO date string
  coverImage?: string; // URL
  description?: string; // Book summary/blurb
  pageCount?: number; // For books
  wordCount?: number; // Estimated or actual
  durationMinutes?: number; // For audiobooks
  genres: string[];
  seriesName?: string;
  seriesIndex?: number;
  platform: 'goodreads' | 'audible' | 'manual';
  notes?: string;
  quotes?: (string | { text: string; character: string })[];
}

export interface Metric {
  label: string;
  value: string | number;
  trend?: {
    value: number; // percentage
    direction: 'up' | 'down' | 'neutral';
  };
  description?: string;
}

export interface GenreStat {
  genre: string;
  count: number;
  percentage: number;
}
