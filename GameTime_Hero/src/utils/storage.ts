import { RsvpEntry, Event, WaitlistEntry, EventReminder } from '../types/rsvp.types';
import * as fs from 'fs';
import * as path from 'path';

export class StorageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StorageError';
  }
}

interface StorageData {
  rsvpEntries: Map<string, RsvpEntry>;
  events: Map<string, Event>;
  waitlist: Map<string, WaitlistEntry[]>;
  reminders: Map<string, EventReminder>;
}

export class FileStorage {
  private readonly storagePath: string;
  private readonly dataFile: string;

  constructor(storageDir?: string) {
    this.storagePath = storageDir || path.join(process.cwd(), 'data');
    this.dataFile = path.join(this.storagePath, 'rsvp-data.json');
  }

  private ensureStorageDirectory(): void {
    if (!fs.existsSync(this.storagePath)) {
      fs.mkdirSync(this.storagePath, { recursive: true });
    }
  }

  public async save(data: StorageData): Promise<void> {
    try {
      this.ensureStorageDirectory();
      
      const serializedData = {
        rsvpEntries: Array.from(data.rsvpEntries.entries()),
        events: Array.from(data.events.entries()),
        waitlist: Array.from(data.waitlist.entries()),
        reminders: Array.from(data.reminders.entries())
      };

      await fs.promises.writeFile(
        this.dataFile,
        JSON.stringify(serializedData, null, 2)
      );
    } catch (error) {
      throw new StorageError(`Failed to save data: ${error}`);
    }
  }

  public async load(): Promise<StorageData> {
    try {
      if (!fs.existsSync(this.dataFile)) {
        return {
          rsvpEntries: new Map(),
          events: new Map(),
          waitlist: new Map(),
          reminders: new Map()
        };
      }

      const data = await fs.promises.readFile(this.dataFile, 'utf-8');
      const parsedData = JSON.parse(data);

      return {
        rsvpEntries: new Map(parsedData.rsvpEntries),
        events: new Map(parsedData.events),
        waitlist: new Map(parsedData.waitlist),
        reminders: new Map(parsedData.reminders)
      };
    } catch (error) {
      throw new StorageError(`Failed to load data: ${error}`);
    }
  }
} 