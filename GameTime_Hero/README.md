# GameTime Hero RSVP Manager

A TypeScript-based RSVP management system for GameTime Hero events.

## Core Features

- ✅ Event management with maximum player capacity
- ✅ RSVP status tracking (Yes, No, Maybe)
- ✅ Player management
- ✅ Statistics and reporting
- ✅ Persistent storage
- ✅ Comprehensive error handling
- ✅ Unit tests

## Additional Features

### Enhanced Event Management
- 🎮 Maximum player capacity control
- 📅 Future date validation
- 📍 Location validation
- 📝 Non-empty event name validation

### Advanced RSVP Features
- 🔄 Capacity management with overbooking prevention
- ⏰ RSVP update timestamp tracking
- 📊 Detailed statistics including response rates
- 🎯 Player-specific RSVP history

### Waitlist System
- 📋 Automatic waitlist for full events
- 🔔 Notifications when spots open
- 🎯 Priority-based waitlist management

### Event Reminders
- ⏰ Configurable reminder intervals
- 📬 Automated notification system
- 📝 Reminder tracking

### Data Management
- 💾 JSON-based persistent storage
- 🧹 Automatic data cleanup for old events
- 📦 Event archiving system
- 🔍 Advanced search and filter capabilities

## Installation

```bash
npm install
```

## Building

```bash
npm run build
```

## Testing

```bash
npm test
```

## Usage Example

```typescript
import { RsvpService } from './services/rsvp.service';
import { ConsoleLogger } from './utils/console-logger';

// Create service instance
const logger = new ConsoleLogger();
const rsvpService = new RsvpService(logger);

// Create an event
const event = await rsvpService.createEvent({
  id: '1',
  name: 'Weekly Soccer Game',
  description: 'Casual soccer game',
  date: new Date('2024-04-20'),
  location: 'Central Park',
  maxPlayers: 20
});

// Update RSVP
await rsvpService.updateRsvp(event.id, player, 'Yes');

// Get statistics
const stats = rsvpService.getRsvpStats();

// Add to waitlist if event is full
await rsvpService.addToWaitlist(event.id, player);

// Setup event reminders
await rsvpService.setupReminders(event.id, { days: 1 }); // 1 day before
```

## Project Structure

```
src/
  ├── services/         # Service implementations
  ├── types/            # TypeScript interfaces
  ├── utils/            # Utility classes
  ├── examples/         # Usage examples
  └── tests/            # Unit tests
```

## Design Principles

- Pure functions where possible
- Clear TypeScript interfaces
- Dependency injection
- Single Responsibility Principle
- Consistent naming
- Early returns
- Logic separated from presentation
- Clean file structure

## License

MIT 