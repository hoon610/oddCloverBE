// A generic response from the Odds API
export interface OddsApiResponse {
  status: number;
  statusText: string;
  data: Sport[] | Event[];
}

// sportsUpdater
/**
 * Represents a sport from the Odds API
 */
export interface Sport {
  key: string;
  active: boolean;
  group: string;
  description: string;
  title: string;
  has_outrights: boolean;
  outrights: string[];
}
/**
 * Represents a processed sport for writing to the Firebase Realtime Database
 */
export interface ProcessedSport {
  group: string;
  title: string;
  description: string;
  active: boolean;
  has_outrights: boolean;
  lastUpdated: number;
}

// oddsUpdater
/**
 * Represents an outcome from the Odds API
 */
export interface Outcome {
  name: string;
  price: number;
  point?: number;
  description?: string;
  link?: string;
  sid?: string;
  bet_limit?: number;
}

/**
 * Represents a market from the Odds API
 */
export interface Market {
  key: "h2h" | "spreads" | "totals" | "outrights";
  last_update: string;
  outcomes: Outcome[];
  link?: string;
  sid?: string;
}

/**
 * Represents a bookmaker from the Odds API
 */
export interface Bookmaker {
  key: string;
  title: string;
  last_update: string;
  markets: Market[];
  link?: string;
  sid?: string;
}

/**
 * Represents an event from the Odds API
 */
export interface Event {
  id: string;
  sport_key: string;
  sport_title: string;
  commence_time: string;
  home_team: string | null;
  away_team: string | null;
  bookmakers: Bookmaker[];
}

export interface CombinedOddsData {
  [key: string]: Event[];
}
