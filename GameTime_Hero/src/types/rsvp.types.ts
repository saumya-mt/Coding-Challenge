export type RsvpStatus = 'Yes' | 'No' | 'Maybe';

export interface Player {
  id: string;
  name: string;
  email: string;
}

export interface Event {
  id: string;
  name: string;
  description: string;
  date: Date;
  location: string;
  maxPlayers: number;
  archived?: boolean;
}

export interface RsvpEntry {
  eventId: string;
  player: Player;
  status: RsvpStatus;
  updatedAt: Date;
  notes?: string;
}

export interface RsvpStats {
  total: number;
  confirmed: number;
  declined: number;
  maybe: number;
  attendanceRate: number;
  responseRate: number;
}

export interface EventStats extends RsvpStats {
  event: Event;
  daysUntilEvent: number;
  maxPlayers: number;
  currentPlayers: number;
}

export interface SearchOptions {
  eventId?: string;
  playerName?: string;
  status?: RsvpStatus;
  startDate?: Date;
}

export interface Logger {
  info(message: string): void;
  error(message: string): void;
  debug(message: string): void;
}

export interface BatchRsvpUpdate {
  eventId: string;
  playerId: string;
  status: RsvpStatus;
  notes?: string;
}

export interface EventUpdate {
  name?: string;
  description?: string;
  date?: Date;
  location?: string;
  maxPlayers?: number;
}

export interface PlayerUpdate {
  name?: string;
  email?: string;
}

export interface WaitlistEntry {
  eventId: string;
  player: Player;
  joinedAt: Date;
  notifiedAt?: Date;
}

export interface EventReminder {
  eventId: string;
  lastSentAt: Date;
  nextSendAt: Date;
  reminderInterval: number; // in days
}

export interface CleanupOptions {
  maxAge?: number; // in days
  archive?: boolean;
  includeRSVPs?: boolean;
}

export interface StorageData {
  rsvpEntries: Map<string, RsvpEntry>;
  events: Map<string, Event>;
  waitlist: Map<string, WaitlistEntry[]>;
  reminders: Map<string, EventReminder>;
} 