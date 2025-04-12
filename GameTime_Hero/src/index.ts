import { ConsoleLogger } from './utils/console-logger';
import { RsvpService } from './services/rsvp.service';
import { Player, RsvpStatus } from './types/rsvp.types';

async function main() {
  // Create a logger instance
  const logger = new ConsoleLogger();

  try {
    // Create the RSVP service with dependency injection
    const rsvpService = new RsvpService(logger);

    // Create some test players
    const players = [
      { id: '1', name: 'John Doe', email: 'john@example.com' },
      { id: '2', name: 'Jane Smith', email: 'jane@example.com' },
      { id: '3', name: 'Bob Johnson', email: 'bob@example.com' }
    ];

    // Create a test event
    const event = await rsvpService.createEvent({
      id: '1',
      name: 'Test Event',
      description: 'A test event',
      date: new Date(Date.now() + 86400000), // Tomorrow
      location: 'Test Location',
      maxPlayers: 10
    });

    // Update RSVPs for each player
    const statuses: RsvpStatus[] = ['Yes', 'No', 'Maybe'];
    for (let i = 0; i < players.length; i++) {
      const player = players[i];
      await rsvpService.updateRsvp(event.id, player, statuses[i % 3]);
    }

    // Get and display statistics
    const stats = rsvpService.getRsvpStats();
    console.log('RSVP Statistics:', stats);

    // Get and display confirmed attendees
    const confirmed = rsvpService.getConfirmedAttendees();
    console.log('Confirmed Attendees:', confirmed.map(r => r.player.name));

    // Get and display all RSVPs
    const allRsvps = rsvpService.searchRsvps({});
    console.log('All RSVPs:', allRsvps.map(r => ({
      player: r.player.name,
      status: r.status,
      updatedAt: r.updatedAt
    })));
  } catch (error) {
    logger.error(`An error occurred: ${error}`);
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
}); 