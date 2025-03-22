# Marketplace Action Provider

A decentralized service marketplace built on the Recall Network, enabling service providers to list services and clients to book them.

## Overview

The Marketplace Action Provider leverages the Recall Network for decentralized data storage to create a service marketplace where:

- Service providers can list their availability with details and pricing
- Clients can browse services and book appointments
- The AI agent assists with meeting notes and dispute resolution
- A feedback and rating system helps build trust

## Features

### Core Functionality

- **Service Management**: Create, list, and manage service listings with availability
- **Booking System**: Allow clients to book available services
- **Meeting Management**: Track meetings, generate links, and record notes
- **Dispute Resolution**: Handle disputes with evidence and resolution options
- **Data Persistence**: All data is stored on the decentralized Recall Network

### How It Works

1. Providers create service listings with dates, times, and pricing
2. Clients browse services and book available slots
3. After the service, the provider or client can mark it as completed
4. If there are disputes, the AI agent can help mediate using meeting notes
5. Reviews and ratings can be added to build provider reputation

## Usage Examples

### For Service Providers

```
// Initialize marketplace client
createMarketplaceClient(networkName: "testnet")

// Create a service listing
createService(
  provider: "Alice Web Development",
  title: "Website Development Consultation",
  description: "One-hour consultation to discuss your website needs",
  date: "2023-12-01",
  startTime: "10:00",
  endTime: "11:00",
  timeZone: "UTC",
  price: "50"
)

// List bookings for your services
listBookings(provider: "Alice Web Development")

// Complete a service after delivery
completeService(
  bookingId: "booking_1234567890",
  meetingNotes: "Discussed website requirements, agreed on a WordPress solution",
  successful: true
)
```

### For Clients

```
// Initialize marketplace client
createMarketplaceClient(networkName: "testnet")

// Browse available services
listServices()
// or with filter
listServices(filter: "website")

// Get details about a specific service
getService(serviceId: "service_1234567890")

// Book a service
bookService(
  serviceId: "service_1234567890",
  clientName: "John Doe",
  clientEmail: "john@example.com",
  meetingPlatform: "zoom"
)

// Check your bookings
listBookings(client: "John Doe")

// File a dispute if needed
fileDispute(
  bookingId: "booking_1234567890",
  reason: "The service provider did not attend the meeting",
  evidence: "I waited for 30 minutes in the Zoom call but nobody joined"
)
```

## Technical Implementation

The Marketplace Action Provider uses:

- **Recall Network**: For decentralized data storage of all marketplace data
- **Unique IDs**: Generated for services, bookings, and disputes
- **JSON Data**: All data is stored as JSON objects in the Recall Network
- **Key-Value Structure**: Uses prefixed keys to organize different data types
- **Status Tracking**: Services and bookings have status flags to track lifecycle

## Integration with Recall Network

All marketplace data is stored on the Recall Network using:

- A single main bucket per marketplace client
- Prefixed keys to organize different data types (`services/`, `bookings/`, `disputes/`)
- Transactional storage to ensure data consistency
- Object query capabilities to filter and retrieve related data

## Future Enhancements

Potential future improvements:

- Payment integration with cryptocurrency
- Enhanced scheduling with recurring availability
- Direct messaging between providers and clients
- Provider verification and identity management
- Integration with calendar systems
- AI-powered service recommendation 