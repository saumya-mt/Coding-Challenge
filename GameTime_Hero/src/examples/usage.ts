import { RsvpService } from '../services/rsvp.service';
import { ConsoleLogger } from '../utils/console-logger';
import { Player, RsvpStatus } from '../types/rsvp.types';

async function main() {
  // Create a logger
  const logger = new ConsoleLogger();
  
  // Create the RSVP service
  const rsvpService = new RsvpService(logger);

  try {
    // Create an event
    const event = await rsvpService.createEvent({
      id: '1',
      name: 'Weekly Soccer Game',
      description: 'Casual soccer game at the local park',
      date: new Date('2024-04-20'),
      location: 'Central Park',
      maxPlayers: 20
    });

    // Create some players
    const players: Player[] = [
      {
        id: '1',
        name: 'John Doe',
        email: 'john@example.com'
      },
      {
        id: '2',
        name: 'Jane Smith',
        email: 'jane@example.com'
      },
      {
        id: '3',
        name: 'Bob Johnson',
        email: 'bob@example.com'
      }
    ];

    // Update RSVPs
    await rsvpService.updateRsvp(event.id, players[0], 'Yes');
    await rsvpService.updateRsvp(event.id, players[1], 'No');
    await rsvpService.updateRsvp(event.id, players[2], 'Maybe');

    // Get confirmed attendees
    const confirmed = rsvpService.getConfirmedAttendees();
    console.log('Confirmed Attendees:', confirmed.map(a => a.player.name));

    // Get statistics
    const stats = rsvpService.getRsvpStats();
    console.log('RSVP Statistics:', {
      total: stats.total,
      confirmed: stats.confirmed,
      declined: stats.declined,
      maybe: stats.maybe,
      attendanceRate: stats.attendanceRate,
      responseRate: stats.responseRate
    });

    // Get event statistics
    const eventStats = rsvpService.getEventStats(event.id);
    console.log('Event Statistics:', {
      name: eventStats.event.name,
      currentPlayers: eventStats.currentPlayers,
      maxPlayers: eventStats.maxPlayers,
      daysUntilEvent: eventStats.daysUntilEvent
    });

    // Search RSVPs
    const searchResults = rsvpService.searchRsvps({ status: 'Yes' });
    console.log('Search Results:', searchResults.map(r => ({
      player: r.player.name,
      status: r.status
    })));

  } catch (error) {
    console.error('An error occurred:', error);
  }
}

main(); 