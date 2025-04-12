import { RsvpEntry, Event } from '../types/rsvp.types';

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class RsvpValidator {
  public static validateRsvp(entry: RsvpEntry): void {
    if (!entry.player || !entry.player.id || !entry.player.name) {
      throw new ValidationError('Invalid player data');
    }

    if (!entry.status || !['yes', 'no', 'maybe'].includes(entry.status)) {
      throw new ValidationError('Invalid RSVP status');
    }

    if (!entry.eventId) {
      throw new ValidationError('Event ID is required');
    }

    if (!entry.updatedAt || !(entry.updatedAt instanceof Date)) {
      throw new ValidationError('Invalid update timestamp');
    }
  }

  public static validateEvent(event: Event): void {
    if (!event.id) {
      throw new ValidationError('Event ID is required');
    }

    if (!event.name) {
      throw new ValidationError('Event name is required');
    }

    if (!event.date || !(event.date instanceof Date)) {
      throw new ValidationError('Invalid event date');
    }

    if (!event.location) {
      throw new ValidationError('Event location is required');
    }

    if (event.maxPlayers !== undefined && (typeof event.maxPlayers !== 'number' || event.maxPlayers < 1)) {
      throw new ValidationError('Invalid max players value');
    }
  }
} 