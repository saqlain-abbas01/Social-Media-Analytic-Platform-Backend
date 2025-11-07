export type Granularity = "hourly" | "daily" | "weekly";

export interface EngagementTrend {
  date: Date;
  totalEngagement: number;
  avgEngagement: number;
  movingAvg7?: number;
  movingAvg30?: number;
}

export interface TrendSummary {
  total: number;
  avg: number;
}

export interface TrendApiResponse {
  granularity: Granularity;
  period: string;
  summary: TrendSummary;
  percentChange: number;
  data: EngagementTrend[];
}

export interface TrendQuery {
  period?: string; // e.g. "30d"
  granularity?: Granularity;
  metric?: string;
}

export interface PlatformPerformance {
  platform: string;
  totalEngagement: number;
  engagementRate: number;
  clickThroughRate: number;
  performanceScore: number;
  percentageShare: number;
}

export interface PlatformSummary {
  totalEngagement: number;
}

export interface PlatformResponse {
  period: string;
  data: PlatformPerformance[];
}

export interface PlatformQuery {
  period?: string; // "7d", "30d"
}
