# Moderia Action Provider

Moderia is an integrated action provider that combines functionality from multiple providers to implement a service booking system with escrow and quality evaluation.

## Components Used

- **recall-test**: For storing and retrieving data on Recall Network
- **service-marketplace**: For service listing and booking
- **erc20-escrow**: For payment handling via USDC on Base Sepolia
- **otter-ai**: For meeting transcription and quality analysis

## Service Booking Workflow

1. **Teacher creates a service listing**: A teacher creates a service bucket containing information about a service (e.g., French language teaching class).

2. **Student browses available services**: Students can query and browse the list of available services.

3. **Student books a service**: The student books a service by specifying their details.

4. **Student sends payment to escrow**: The student sends USDC to the agent's wallet (escrow).

5. **Service is delivered**: The teacher and student participate in the service (e.g., a video call).

6. **Service quality is evaluated**: The system analyzes the service quality based on the call transcript.

7. **Payment is released**: If the service quality is satisfactory, the agent sends funds to the teacher.

8. **Service completion is recorded**: The system creates a new bucket with details of the accomplished deal.

## Setup

1. Configure environment variables:
   ```
   WALLET_PRIVATE_KEY_AGENT=your_agent_private_key
   WALLET_PRIVATE_KEY_PROVIDER=your_teacher_private_key
   WALLET_PRIVATE_KEY_CLIENT=your_student_private_key
   DEMO_MODE=true|false
   ```

2. Import the action provider:
   ```typescript
   import { moderiaActionProvider } from "@action-providers/moderia";
   ```

3. Initialize the provider:
   ```typescript
   const moderia = moderiaActionProvider();
   ```

## Key Actions

- `createRecallClient`: Create clients for teacher, student, and agent
- `createRecallBucket`: Create buckets for storing data
- `createServiceListing`: Create a service listing (as teacher)
- `listAvailableServices`: List services available for booking
- `bookService`: Book a service (as student)
- `createEscrow`: Create escrow payment
- `joinMeeting`: Join a meeting for the service
- `getTranscript`: Get transcript of the meeting
- `analyzeServiceQuality`: Analyze service quality
- `releaseFunds`: Release funds to the teacher
- `completeService`: Record service completion

## Testing

Run the test script:
```bash
ts-node test.ts
```

This will execute the entire service booking workflow with simulated data. 