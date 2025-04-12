import { 
  Logger, 
  Player, 
  RsvpEntry, 
  RsvpStatus, 
  RsvpStats, 
  Event,
  EventStats,
  SearchOptions,
  BatchRsvpUpdate,
  EventUpdate,
  PlayerUpdate,
  WaitlistEntry,
  EventReminder,
  CleanupOptions
} from '../types/rsvp.types';
import { RsvpValidator, ValidationError } from '../utils/validators';
import { FileStorage, StorageError } from '../utils/storage';

/**
 * Custom error class for RSVP-related errors
 */
export class RsvpError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RsvpError';
  }
}

/**
 * Service for managing RSVPs and events
 * Handles all RSVP-related operations including creation, updates, and statistics
 */
export class RsvpService {
  private rsvpEntries: Map<string, RsvpEntry>;
  private events: Map<string, Event>;
  private waitlist: Map<string, WaitlistEntry[]>;
  private reminders: Map<string, EventReminder>;
  private storage: FileStorage;
  private initialized: boolean = false;

  /**
   * Creates a new RsvpService instance
   * @param logger - Logger instance for logging operations
   * @param storageDir - Optional directory for storing RSVP data
   */
  constructor(private readonly logger: Logger, storageDir?: string) {
    this.rsvpEntries = new Map();
    this.events = new Map();
    this.waitlist = new Map();
    this.reminders = new Map();
    this.storage = new FileStorage(storageDir);
  }

  /**
   * Ensures the service is initialized and data is loaded
   * @throws {RsvpError} If initialization fails
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      try {
        const data = await this.storage.load();
        this.rsvpEntries = data.rsvpEntries || new Map();
        this.events = data.events || new Map();
        this.waitlist = data.waitlist || new Map();
        this.reminders = data.reminders || new Map();
        this.logger.info('Successfully loaded RSVP data from storage');
      } catch (error) {
        this.logger.error(`Failed to load RSVP data: ${error}`);
        throw new RsvpError('Failed to initialize RSVP service');
      }
      this.initialized = true;
    }
  }

  /**
   * Saves current RSVP and event data to storage
   * @throws {RsvpError} If save operation fails
   */
  private async saveData(): Promise<void> {
    try {
      await this.storage.save({
        rsvpEntries: this.rsvpEntries,
        events: this.events,
        waitlist: this.waitlist,
        reminders: this.reminders
      });
    } catch (error) {
      this.logger.error(`Failed to save data: ${error}`);
      throw new RsvpError('Failed to save RSVP data');
    }
  }

  /**
   * Creates a new event
   * @param event - Event to create
   * @returns The created event
   * @throws {RsvpError} If event creation fails
   * @throws {ValidationError} If event data is invalid
   */
  public async createEvent(event: Event): Promise<Event> {
    try {
      await this.ensureInitialized();
      RsvpValidator.validateEvent(event);
      
      if (event.maxPlayers <= 0) {
        throw new ValidationError('maxPlayers must be a positive number');
      }
      
      this.events.set(event.id, event);
      await this.saveData();
      
      this.logger.info(`Created event: ${event.name} with maxPlayers: ${event.maxPlayers}`);
      return event;
    } catch (error) {
      if (error instanceof ValidationError) {
        this.logger.error(`Validation error: ${error.message}`);
        throw error;
      }
      this.logger.error(`Failed to create event: ${error}`);
      throw new RsvpError('Failed to create event');
    }
  }

  /**
   * Retrieves an event by ID
   * @param eventId - ID of the event to retrieve
   * @returns The event if found, undefined otherwise
   * @throws {RsvpError} If retrieval fails
   */
  public async getEvent(eventId: string): Promise<Event | undefined> {
    try {
      await this.ensureInitialized();
      return this.events.get(eventId);
    } catch (error) {
      this.logger.error(`Failed to get event: ${error}`);
      throw new RsvpError('Failed to get event');
    }
  }

  /**
   * Updates a player's RSVP status for an event
   * @param eventId - ID of the event
   * @param player - Player to update RSVP for
   * @param status - New RSVP status
   * @param notes - Optional notes for the RSVP
   * @returns The updated RSVP entry
   * @throws {RsvpError} If update fails
   * @throws {ValidationError} If input is invalid
   */
  public async updateRsvp(
    eventId: string, 
    player: Player, 
    status: RsvpStatus, 
    notes?: string
  ): Promise<RsvpEntry> {
    try {
      await this.ensureInitialized();
      
      const event = this.events.get(eventId);
      if (!event) {
        throw new ValidationError('Event not found');
      }
      
      RsvpValidator.validatePlayer(player);
      RsvpValidator.validateRsvpStatus(status);

      // Check capacity if status is 'Yes'
      if (status === 'Yes') {
        const currentPlayers = this.getConfirmedAttendees().length;
        if (currentPlayers >= event.maxPlayers) {
          throw new ValidationError('Event is at maximum capacity');
        }
      }

      const entry: RsvpEntry = {
        eventId,
        player,
        status,
        updatedAt: new Date(),
        notes
      };

      this.rsvpEntries.set(`${eventId}-${player.id}`, entry);
      await this.saveData();
      
      this.logger.info(`Updated RSVP for player ${player.name} to ${status}`);
      return entry;
    } catch (error) {
      if (error instanceof ValidationError) {
        this.logger.error(`Validation error: ${error.message}`);
        throw error;
      }
      this.logger.error(`Failed to update RSVP: ${error}`);
      throw new RsvpError('Failed to update RSVP');
    }
  }

  /**
   * Updates multiple RSVPs in a batch
   * @param updates - Array of RSVP updates
   * @returns Array of updated RSVP entries
   * @throws {RsvpError} If batch update fails
   * @throws {ValidationError} If any update is invalid
   */
  public async batchUpdateRsvps(updates: BatchRsvpUpdate[]): Promise<RsvpEntry[]> {
    try {
      await this.ensureInitialized();
      const results: RsvpEntry[] = [];

      for (const update of updates) {
        const event = this.events.get(update.eventId);
        if (!event) {
          throw new ValidationError(`Event not found: ${update.eventId}`);
        }

        const player = this.getPlayerById(update.playerId);
        if (!player) {
          throw new ValidationError(`Player not found: ${update.playerId}`);
        }

        const entry = await this.updateRsvp(update.eventId, player, update.status);
        results.push(entry);
      }

      return results;
    } catch (error) {
      if (error instanceof ValidationError) {
        this.logger.error(`Validation error: ${error.message}`);
        throw error;
      }
      this.logger.error(`Failed to batch update RSVPs: ${error}`);
      throw new RsvpError('Failed to batch update RSVPs');
    }
  }

  /**
   * Retrieves RSVP statistics
   * @returns Object containing RSVP statistics
   * @throws {RsvpError} If statistics retrieval fails
   */
  public getRsvpStats(): RsvpStats {
    try {
      const entries = Array.from(this.rsvpEntries.values());
      const total = entries.length;
      const confirmed = entries.filter(entry => entry.status === 'Yes').length;
      const declined = entries.filter(entry => entry.status === 'No').length;
      const maybe = entries.filter(entry => entry.status === 'Maybe').length;
      const attendanceRate = total > 0 ? (confirmed / total) * 100 : 0;
      const responseRate = total > 0 ? ((confirmed + declined + maybe) / total) * 100 : 0;

      return {
        total,
        confirmed,
        declined,
        maybe,
        attendanceRate,
        responseRate
      };
    } catch (error) {
      this.logger.error(`Error getting RSVP stats: ${error}`);
      throw new RsvpError('Failed to get RSVP stats');
    }
  }

  /**
   * Retrieves all confirmed attendees
   * @returns Array of RSVP entries for confirmed attendees
   * @throws {RsvpError} If retrieval fails
   */
  public getConfirmedAttendees(): RsvpEntry[] {
    try {
      return Array.from(this.rsvpEntries.values())
        .filter(entry => entry.status === 'Yes')
        .sort((a, b) => a.updatedAt.getTime() - b.updatedAt.getTime());
    } catch (error) {
      this.logger.error(`Error getting confirmed attendees: ${error}`);
      throw new RsvpError('Failed to get confirmed attendees');
    }
  }

  /**
   * Retrieves statistics for a specific event
   * @param eventId - ID of the event
   * @returns Object containing event statistics
   * @throws {RsvpError} If statistics retrieval fails
   * @throws {ValidationError} If event is not found
   */
  public getEventStats(eventId: string): EventStats {
    try {
      const event = this.events.get(eventId);
      if (!event) {
        throw new ValidationError('Event not found');
      }

      const stats = this.getRsvpStats();
      const daysUntilEvent = Math.ceil((event.date.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      const currentPlayers = this.getConfirmedAttendees().length;

      return {
        ...stats,
        event,
        daysUntilEvent,
        maxPlayers: event.maxPlayers,
        currentPlayers
      };
    } catch (error) {
      if (error instanceof ValidationError) {
        this.logger.error(`Validation error: ${error.message}`);
        throw error;
      }
      this.logger.error(`Error getting event stats: ${error}`);
      throw new RsvpError('Failed to get event stats');
    }
  }

  /**
   * Searches for RSVP entries based on criteria
   * @param options - Search criteria
   * @returns Array of matching RSVP entries
   * @throws {RsvpError} If search fails
   */
  public searchRsvps(options: SearchOptions): RsvpEntry[] {
    try {
      let results = Array.from(this.rsvpEntries.values());

      if (options.eventId) {
        results = results.filter(entry => entry.eventId === options.eventId);
      }

      if (options.playerName) {
        results = results.filter(entry => 
          entry.player.name.toLowerCase().includes(options.playerName!.toLowerCase())
        );
      }

      if (options.status) {
        results = results.filter(entry => entry.status === options.status);
      }

      if (options.startDate) {
        const event = this.events.get(options.eventId!);
        if (event) {
          results = results.filter(entry => event.date >= options.startDate!);
        }
      }

      return results.sort((a, b) => a.updatedAt.getTime() - b.updatedAt.getTime());
    } catch (error) {
      this.logger.error(`Error searching RSVPs: ${error}`);
      throw new RsvpError('Failed to search RSVPs');
    }
  }

  /**
   * Retrieves a player by ID
   * @param playerId - ID of the player
   * @returns The player if found, undefined otherwise
   * @throws {RsvpError} If retrieval fails
   */
  private getPlayerById(playerId: string): Player | undefined {
    try {
      const entries = Array.from(this.rsvpEntries.values());
      const entry = entries.find(e => e.player.id === playerId);
      return entry?.player;
    } catch (error) {
      this.logger.error(`Error getting player: ${error}`);
      throw new RsvpError('Failed to get player');
    }
  }

  /**
   * Updates an existing event
   * @param eventId - ID of the event to update
   * @param update - Event update data
   * @returns The updated event
   * @throws {RsvpError} If update fails
   * @throws {ValidationError} If update data is invalid
   */
  public async updateEvent(eventId: string, update: EventUpdate): Promise<Event> {
    try {
      await this.ensureInitialized();
      
      const event = this.events.get(eventId);
      if (!event) {
        throw new ValidationError('Event not found');
      }

      const updatedEvent = { ...event, ...update };
      RsvpValidator.validateEvent(updatedEvent);
      
      this.events.set(eventId, updatedEvent);
      await this.saveData();
      
      this.logger.info(`Updated event: ${event.name}`);
      return updatedEvent;
    } catch (error) {
      if (error instanceof ValidationError) {
        this.logger.error(`Validation error: ${error.message}`);
        throw error;
      }
      this.logger.error(`Failed to update event: ${error}`);
      throw new RsvpError('Failed to update event');
    }
  }

  /**
   * Deletes an event and its associated RSVPs
   * @param eventId - ID of the event to delete
   * @throws {RsvpError} If deletion fails
   * @throws {ValidationError} If event is not found
   */
  public async deleteEvent(eventId: string): Promise<void> {
    try {
      await this.ensureInitialized();
      
      if (!this.events.has(eventId)) {
        throw new ValidationError('Event not found');
      }

      // Remove all RSVPs for this event
      for (const [key, entry] of this.rsvpEntries.entries()) {
        if (entry.eventId === eventId) {
          this.rsvpEntries.delete(key);
        }
      }

      this.events.delete(eventId);
      await this.saveData();
      
      this.logger.info(`Deleted event: ${eventId}`);
    } catch (error) {
      if (error instanceof ValidationError) {
        this.logger.error(`Validation error: ${error.message}`);
        throw error;
      }
      this.logger.error(`Failed to delete event: ${error}`);
      throw new RsvpError('Failed to delete event');
    }
  }

  /**
   * Lists all events
   * @returns Array of all events
   * @throws {RsvpError} If retrieval fails
   */
  public async listEvents(): Promise<Event[]> {
    try {
      await this.ensureInitialized();
      return Array.from(this.events.values())
        .sort((a, b) => a.date.getTime() - b.date.getTime());
    } catch (error) {
      this.logger.error(`Failed to list events: ${error}`);
      throw new RsvpError('Failed to list events');
    }
  }

  /**
   * Cancels/removes an RSVP
   * @param eventId - ID of the event
   * @param playerId - ID of the player
   * @throws {RsvpError} If cancellation fails
   * @throws {ValidationError} If RSVP is not found
   */
  public async cancelRsvp(eventId: string, playerId: string): Promise<void> {
    try {
      await this.ensureInitialized();
      
      const key = `${eventId}-${playerId}`;
      if (!this.rsvpEntries.has(key)) {
        throw new ValidationError('RSVP not found');
      }

      this.rsvpEntries.delete(key);
      await this.saveData();
      
      this.logger.info(`Cancelled RSVP for player ${playerId} in event ${eventId}`);
    } catch (error) {
      if (error instanceof ValidationError) {
        this.logger.error(`Validation error: ${error.message}`);
        throw error;
      }
      this.logger.error(`Failed to cancel RSVP: ${error}`);
      throw new RsvpError('Failed to cancel RSVP');
    }
  }

  /**
   * Gets all RSVPs for a specific event
   * @param eventId - ID of the event
   * @returns Array of RSVP entries
   * @throws {RsvpError} If retrieval fails
   * @throws {ValidationError} If event is not found
   */
  public async getEventRsvps(eventId: string): Promise<RsvpEntry[]> {
    try {
      await this.ensureInitialized();
      
      if (!this.events.has(eventId)) {
        throw new ValidationError('Event not found');
      }

      return Array.from(this.rsvpEntries.values())
        .filter(entry => entry.eventId === eventId)
        .sort((a, b) => a.updatedAt.getTime() - b.updatedAt.getTime());
    } catch (error) {
      if (error instanceof ValidationError) {
        this.logger.error(`Validation error: ${error.message}`);
        throw error;
      }
      this.logger.error(`Failed to get event RSVPs: ${error}`);
      throw new RsvpError('Failed to get event RSVPs');
    }
  }

  /**
   * Updates player information
   * @param playerId - ID of the player
   * @param update - Player update data
   * @throws {RsvpError} If update fails
   * @throws {ValidationError} If player is not found or update data is invalid
   */
  public async updatePlayer(playerId: string, update: PlayerUpdate): Promise<void> {
    try {
      await this.ensureInitialized();
      
      const player = this.getPlayerById(playerId);
      if (!player) {
        throw new ValidationError('Player not found');
      }

      const updatedPlayer = { ...player, ...update };
      RsvpValidator.validatePlayer(updatedPlayer);

      // Update player info in all RSVPs
      for (const [key, entry] of this.rsvpEntries.entries()) {
        if (entry.player.id === playerId) {
          this.rsvpEntries.set(key, {
            ...entry,
            player: updatedPlayer
          });
        }
      }

      await this.saveData();
      this.logger.info(`Updated player: ${player.name}`);
    } catch (error) {
      if (error instanceof ValidationError) {
        this.logger.error(`Validation error: ${error.message}`);
        throw error;
      }
      this.logger.error(`Failed to update player: ${error}`);
      throw new RsvpError('Failed to update player');
    }
  }

  /**
   * Removes a player and their RSVPs
   * @param playerId - ID of the player
   * @throws {RsvpError} If removal fails
   * @throws {ValidationError} If player is not found
   */
  public async removePlayer(playerId: string): Promise<void> {
    try {
      await this.ensureInitialized();
      
      if (!this.getPlayerById(playerId)) {
        throw new ValidationError('Player not found');
      }

      // Remove all RSVPs for this player
      for (const [key, entry] of this.rsvpEntries.entries()) {
        if (entry.player.id === playerId) {
          this.rsvpEntries.delete(key);
        }
      }

      await this.saveData();
      this.logger.info(`Removed player: ${playerId}`);
    } catch (error) {
      if (error instanceof ValidationError) {
        this.logger.error(`Validation error: ${error.message}`);
        throw error;
      }
      this.logger.error(`Failed to remove player: ${error}`);
      throw new RsvpError('Failed to remove player');
    }
  }

  /**
   * Adds a player to the waitlist for an event
   * @param eventId - ID of the event
   * @param player - Player to add to waitlist
   * @returns The waitlist entry
   * @throws {RsvpError} If operation fails
   * @throws {ValidationError} If event is not found or already has an RSVP
   */
  public async addToWaitlist(eventId: string, player: Player): Promise<WaitlistEntry> {
    try {
      await this.ensureInitialized();
      
      const event = this.events.get(eventId);
      if (!event) {
        throw new ValidationError('Event not found');
      }

      // Check if player already has an RSVP
      const existingRsvp = this.rsvpEntries.get(`${eventId}-${player.id}`);
      if (existingRsvp) {
        throw new ValidationError('Player already has an RSVP for this event');
      }

      const entry: WaitlistEntry = {
        eventId,
        player,
        joinedAt: new Date()
      };

      if (!this.waitlist.has(eventId)) {
        this.waitlist.set(eventId, []);
      }
      this.waitlist.get(eventId)!.push(entry);
      await this.saveData();
      
      this.logger.info(`Added player ${player.name} to waitlist for event ${eventId}`);
      return entry;
    } catch (error) {
      if (error instanceof ValidationError) {
        this.logger.error(`Validation error: ${error.message}`);
        throw error;
      }
      this.logger.error(`Failed to add to waitlist: ${error}`);
      throw new RsvpError('Failed to add to waitlist');
    }
  }

  /**
   * Notifies waitlisted players when spots become available
   * @param eventId - ID of the event
   * @returns Array of notified players
   * @throws {RsvpError} If operation fails
   */
  public async notifyWaitlist(eventId: string): Promise<Player[]> {
    try {
      await this.ensureInitialized();
      
      const event = this.events.get(eventId);
      if (!event) {
        throw new ValidationError('Event not found');
      }

      const currentPlayers = this.getConfirmedAttendees().length;
      const availableSpots = event.maxPlayers - currentPlayers;
      
      if (availableSpots <= 0) {
        return [];
      }

      const waitlist = this.waitlist.get(eventId) || [];
      const notifiedPlayers: Player[] = [];
      
      for (const entry of waitlist.slice(0, availableSpots)) {
        entry.notifiedAt = new Date();
        notifiedPlayers.push(entry.player);
      }

      await this.saveData();
      this.logger.info(`Notified ${notifiedPlayers.length} waitlisted players for event ${eventId}`);
      return notifiedPlayers;
    } catch (error) {
      if (error instanceof ValidationError) {
        this.logger.error(`Validation error: ${error.message}`);
        throw error;
      }
      this.logger.error(`Failed to notify waitlist: ${error}`);
      throw new RsvpError('Failed to notify waitlist');
    }
  }

  /**
   * Sets up event reminders
   * @param eventId - ID of the event
   * @param interval - Reminder interval in days
   * @throws {RsvpError} If operation fails
   * @throws {ValidationError} If event is not found
   */
  public async setupReminders(eventId: string, interval: number): Promise<void> {
    try {
      await this.ensureInitialized();
      
      const event = this.events.get(eventId);
      if (!event) {
        throw new ValidationError('Event not found');
      }

      const reminder: EventReminder = {
        eventId,
        lastSentAt: new Date(),
        nextSendAt: new Date(Date.now() + interval * 24 * 60 * 60 * 1000),
        reminderInterval: interval
      };

      this.reminders.set(eventId, reminder);
      await this.saveData();
      
      this.logger.info(`Set up reminders for event ${eventId} with ${interval} day interval`);
    } catch (error) {
      if (error instanceof ValidationError) {
        this.logger.error(`Validation error: ${error.message}`);
        throw error;
      }
      this.logger.error(`Failed to setup reminders: ${error}`);
      throw new RsvpError('Failed to setup reminders');
    }
  }

  /**
   * Sends reminders for upcoming events
   * @returns Array of events that reminders were sent for
   * @throws {RsvpError} If operation fails
   */
  public async sendReminders(): Promise<Event[]> {
    try {
      await this.ensureInitialized();
      
      const now = new Date();
      const eventsToRemind: Event[] = [];

      for (const [eventId, reminder] of this.reminders.entries()) {
        if (reminder.nextSendAt <= now) {
          const event = this.events.get(eventId);
          if (event) {
            eventsToRemind.push(event);
            reminder.lastSentAt = now;
            reminder.nextSendAt = new Date(now.getTime() + reminder.reminderInterval * 24 * 60 * 60 * 1000);
          }
        }
      }

      await this.saveData();
      this.logger.info(`Sent reminders for ${eventsToRemind.length} events`);
      return eventsToRemind;
    } catch (error) {
      this.logger.error(`Failed to send reminders: ${error}`);
      throw new RsvpError('Failed to send reminders');
    }
  }

  /**
   * Cleans up old data based on provided options
   * @param options - Cleanup options
   * @returns Statistics about cleaned up data
   * @throws {RsvpError} If cleanup fails
   */
  public async cleanupData(options: CleanupOptions): Promise<{ events: number; rsvps: number }> {
    try {
      await this.ensureInitialized();
      
      const now = new Date();
      const maxAge = options.maxAge || 30; // Default to 30 days
      const cutoffDate = new Date(now.getTime() - maxAge * 24 * 60 * 60 * 1000);
      
      let eventsCleaned = 0;
      let rsvpsCleaned = 0;

      // Clean up old events
      for (const [eventId, event] of this.events.entries()) {
        if (event.date < cutoffDate) {
          if (options.archive) {
            // Archive the event instead of deleting
            event.archived = true;
          } else {
            this.events.delete(eventId);
            eventsCleaned++;
          }

          if (options.includeRSVPs) {
            // Clean up associated RSVPs
            for (const [key, entry] of this.rsvpEntries.entries()) {
              if (entry.eventId === eventId) {
                this.rsvpEntries.delete(key);
                rsvpsCleaned++;
              }
            }
          }
        }
      }

      await this.saveData();
      this.logger.info(`Cleaned up ${eventsCleaned} events and ${rsvpsCleaned} RSVPs`);
      return { events: eventsCleaned, rsvps: rsvpsCleaned };
    } catch (error) {
      this.logger.error(`Failed to cleanup data: ${error}`);
      throw new RsvpError('Failed to cleanup data');
    }
  }
} 