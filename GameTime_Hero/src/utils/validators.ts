import { Player, RsvpStatus, Event } from '../types/rsvp.types';

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class RsvpValidator {
  static validatePlayer(player: Player): void {
    if (!player.id || typeof player.id !== 'string') {
      throw new ValidationError('Player ID is required and must be a string');
    }
    if (!player.name || typeof player.name !== 'string' || player.name.trim().length === 0) {
      throw new ValidationError('Player name is required and must be a non-empty string');
    }
    if (!player.email || typeof player.email !== 'string' || !this.isValidEmail(player.email)) {
      throw new ValidationError('Valid email is required');
    }
  }

  static validateRsvpStatus(status: RsvpStatus): void {
    const validStatuses: RsvpStatus[] = ['Yes', 'No', 'Maybe'];
    if (!validStatuses.includes(status)) {
      throw new ValidationError(`Invalid RSVP status. Must be one of: ${validStatuses.join(', ')}`);
    }
  }

  static validateEvent(event: Event): void {
    if (!event.id || typeof event.id !== 'string') {
      throw new ValidationError('Event ID is required and must be a string');
    }
    if (!event.name || typeof event.name !== 'string' || event.name.trim().length === 0) {
      throw new ValidationError('Event name is required and must be a non-empty string');
    }
    if (!event.description || typeof event.description !== 'string' || event.description.trim().length === 0) {
      throw new ValidationError('Event description is required and must be a non-empty string');
    }
    if (!event.date || !(event.date instanceof Date) || isNaN(event.date.getTime())) {
      throw new ValidationError('Valid event date is required');
    }
    if (event.date < new Date()) {
      throw new ValidationError('Event date cannot be in the past');
    }
    if (!event.location || typeof event.location !== 'string' || event.location.trim().length === 0) {
      throw new ValidationError('Event location is required and must be a non-empty string');
    }
    if (typeof event.maxPlayers !== 'number' || event.maxPlayers < 1 || !Number.isInteger(event.maxPlayers)) {
      throw new ValidationError('maxPlayers must be a positive integer');
    }
  }

  private static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
} 