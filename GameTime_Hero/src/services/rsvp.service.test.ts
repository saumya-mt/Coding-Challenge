import { RsvpService } from './rsvp.service';
import { ConsoleLogger } from '../utils/console-logger';
import { Player, RsvpStatus, Event } from '../types/rsvp.types';
import { RsvpError } from './rsvp.service';
import { ValidationError } from '../utils/validators';
import * as fs from 'fs';
import * as path from 'path';

describe('RsvpService', () => {
  let service: RsvpService;
  let logger: ConsoleLogger;
  let testPlayer: Player;
  let testEvent: Event;
  const testStorageDir = path.join(process.cwd(), 'test-data');

  beforeEach(async () => {
    // Clean up test storage directory
    if (fs.existsSync(testStorageDir)) {
      fs.rmSync(testStorageDir, { recursive: true, force: true });
    }
    fs.mkdirSync(testStorageDir, { recursive: true });

    logger = new ConsoleLogger();
    service = new RsvpService(logger, testStorageDir);
    testPlayer = {
      id: '1',
      name: 'Test Player',
      email: 'test@example.com'
    };
    testEvent = {
      id: '1',
      name: 'Test Event',
      description: 'Test Description',
      date: new Date(Date.now() + 86400000), // Tomorrow
      location: 'Test Location',
      maxPlayers: 2
    };
  });

  afterEach(() => {
    // Clean up test storage directory
    if (fs.existsSync(testStorageDir)) {
      fs.rmSync(testStorageDir, { recursive: true, force: true });
    }
  });

  describe('createEvent', () => {
    it('should create a new event', async () => {
      const event = await service.createEvent(testEvent);
      expect(event).toEqual(testEvent);
    });

    it('should throw error for invalid maxPlayers', async () => {
      const invalidEvent = { ...testEvent, maxPlayers: 0 };
      await expect(service.createEvent(invalidEvent)).rejects.toThrow(ValidationError);
    });

    it('should throw error for non-integer maxPlayers', async () => {
      const invalidEvent = { ...testEvent, maxPlayers: 1.5 };
      await expect(service.createEvent(invalidEvent)).rejects.toThrow(ValidationError);
    });

    it('should throw error for past event date', async () => {
      const invalidEvent = { ...testEvent, date: new Date('2020-01-01') };
      await expect(service.createEvent(invalidEvent)).rejects.toThrow(ValidationError);
    });

    it('should throw error for empty event name', async () => {
      const invalidEvent = { ...testEvent, name: '' };
      await expect(service.createEvent(invalidEvent)).rejects.toThrow(ValidationError);
    });
  });

  describe('updateRsvp', () => {
    beforeEach(async () => {
      await service.createEvent(testEvent);
    });

    it('should update RSVP status', async () => {
      const entry = await service.updateRsvp(testEvent.id, testPlayer, 'Yes');
      expect(entry.status).toBe('Yes');
      expect(entry.player).toEqual(testPlayer);
    });

    it('should throw error for invalid status', async () => {
      await expect(service.updateRsvp(testEvent.id, testPlayer, 'Invalid' as RsvpStatus))
        .rejects.toThrow(ValidationError);
    });

    it('should throw error for non-existent event', async () => {
      await expect(service.updateRsvp('non-existent', testPlayer, 'Yes'))
        .rejects.toThrow(ValidationError);
    });

    it('should throw error when event is at capacity', async () => {
      // Add two players to reach capacity
      await service.updateRsvp(testEvent.id, testPlayer, 'Yes');
      await service.updateRsvp(testEvent.id, { ...testPlayer, id: '2' }, 'Yes');
      
      // Try to add one more
      await expect(service.updateRsvp(testEvent.id, { ...testPlayer, id: '3' }, 'Yes'))
        .rejects.toThrow(ValidationError);
    });

    it('should allow changing from Yes to No when at capacity', async () => {
      // Add two players to reach capacity
      await service.updateRsvp(testEvent.id, testPlayer, 'Yes');
      await service.updateRsvp(testEvent.id, { ...testPlayer, id: '2' }, 'Yes');
      
      // Change one to No
      const entry = await service.updateRsvp(testEvent.id, testPlayer, 'No');
      expect(entry.status).toBe('No');
    });
  });

  describe('getConfirmedAttendees', () => {
    beforeEach(async () => {
      await service.createEvent(testEvent);
      await service.updateRsvp(testEvent.id, testPlayer, 'Yes');
    });

    it('should return confirmed attendees', () => {
      const attendees = service.getConfirmedAttendees();
      expect(attendees.length).toBe(1);
      expect(attendees[0].player).toEqual(testPlayer);
    });
  });

  describe('getRsvpStats', () => {
    beforeEach(async () => {
      await service.createEvent(testEvent);
      await service.updateRsvp(testEvent.id, testPlayer, 'Yes');
    });

    it('should return correct statistics', () => {
      const stats = service.getRsvpStats();
      expect(stats.total).toBe(1);
      expect(stats.confirmed).toBe(1);
      expect(stats.attendanceRate).toBe(100);
    });
  });

  describe('getEventStats', () => {
    beforeEach(async () => {
      await service.createEvent(testEvent);
      await service.updateRsvp(testEvent.id, testPlayer, 'Yes');
    });

    it('should return event statistics', () => {
      const stats = service.getEventStats(testEvent.id);
      expect(stats.event).toEqual(testEvent);
      expect(stats.currentPlayers).toBe(1);
      expect(stats.maxPlayers).toBe(2);
    });

    it('should throw error for non-existent event', () => {
      expect(() => service.getEventStats('non-existent')).toThrow(ValidationError);
    });
  });

  describe('searchRsvps', () => {
    beforeEach(async () => {
      await service.createEvent(testEvent);
      await service.updateRsvp(testEvent.id, testPlayer, 'Yes');
    });

    it('should search by player name', () => {
      const results = service.searchRsvps({ playerName: 'Test' });
      expect(results.length).toBe(1);
      expect(results[0].player).toEqual(testPlayer);
    });

    it('should search by status', () => {
      const results = service.searchRsvps({ status: 'Yes' });
      expect(results.length).toBe(1);
      expect(results[0].status).toBe('Yes');
    });
  });
}); 