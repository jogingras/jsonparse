# JSON Parser Comparison Demo

A comprehensive comparison of streaming JSON parsers using Clarinet and stream-json with real-time chunk tracking and Zod validation.

## Overview

This project demonstrates how to parse streaming JSON data using two different approaches:
1. **Clarinet**: A SAX-style JSON parser perfect for streaming
2. **stream-json**: Node.js streams-based JSON parser with powerful filtering capabilities

Both approaches include validation using Zod schemas, real-time chunk tracking, and are useful for handling large JSON payloads or real-time streaming data where you need to process JSON objects as they arrive.

## Features

- **Multiple parsing approaches**: Compare Clarinet vs stream-json
- **Real-time chunk tracking**: Monitor partial objects as they're being received
- **Streaming JSON parsing**: Process JSON objects as they arrive in chunks
- **Schema validation**: Use Zod schemas to validate and type-check parsed objects
- **Flexible callback system**: Optional `onComplete` and `onChunk` callbacks
- **Error handling**: Graceful handling of invalid JSON and schema validation errors
- **TypeScript support**: Full type safety with TypeScript and `Partial<T>` for incomplete objects

## Project Structure

```
src/
├── index.ts                    # Main comparison demo
├── clarinet-stream-parser.ts   # Clarinet-based streaming parser
├── stream-json-parser.ts       # stream-json-based streaming parser
└── schemas.ts                  # Zod schemas for validation
```

## Installation

```bash
npm install
```

## Usage

### Development

Run the parser comparison demo:

```bash
npm run dev
```

### Build and Run

Build the project and run the compiled JavaScript:

```bash
npm run build
npm start
```

## How it Works

### Common Flow
1. **Schema Definition**: Define your data structure using Zod schemas in `schemas.ts`
2. **Stream Parser**: Create a streaming parser with optional callbacks for complete and partial objects
3. **Chunk Tracking**: Monitor partial objects in real-time as data arrives
4. **Validation**: Each complete object is validated against the Zod schema
5. **Processing**: Valid objects are processed by your completion handler

### Clarinet Approach
The `createClarinetAssembler` function creates a SAX-style parser that:
- Handles partial JSON chunks with events (openobject, closeobject, key, value)
- Maintains a stack to track nested objects and arrays
- Provides real-time visibility into object construction
- Calls completion handler for each complete root-level object
- Calls chunk handler with partial objects as they're being built

### stream-json Approach
The `createStreamJsonAssembler` function creates a streams-based parser that:
- Buffers incoming chunks and identifies complete JSON objects
- Extracts partial objects using intelligent JSON parsing
- Provides duplicate prevention for chunk logging
- Uses Node.js streams pipeline with stream-json for parsing
- Provides more powerful filtering and transformation capabilities

## Examples

### Basic Usage with Configuration Object

```typescript
import { createClarinetAssembler, createStreamJsonAssembler } from './parsers';
import { Person } from './schemas';

// Full configuration with both callbacks
const assembler = createClarinetAssembler<Person>({
  onComplete: (person: Person) => {
    console.log('✅ Complete person:', person);
  },
  onChunk: (partial: Partial<Person>, source?: string) => {
    console.log(`🔄 [${source}] Partial:`, partial);
  }
});

// Only completion callback (silent chunk processing)
const silentAssembler = createStreamJsonAssembler<Person>({
  onComplete: (person: Person) => {
    console.log('📦 Person received:', person);
  }
  // No onChunk - won't log partial objects
});

// Process partial chunks (same for both)
assembler.write('{"id":1,"name":"Jo');
assembler.write('hn Doe","email":"john@example.com"}{"id":2,"name":"A');
assembler.write('lice"}');
assembler.close();
```

### Configuration Interface

```typescript
interface AssemblerConfig<T> {
  onComplete?: (obj: T) => void;           // Called when object is fully parsed
  onChunk?: (partialObj: Partial<T>, source?: string) => void;  // Called for partial objects
}
```

### Real-time Parsing Demo Output
```
🔧 Parsing with Clarinet:
[Clarinet] 🔄 Chunk received - Partial object: {
  "id": 1
}
[Clarinet] ✅ Received person: { id: 1, name: 'John Doe', email: 'john@example.com' }
[Clarinet] 🔄 Chunk received - Partial object: {
  "id": 2
}
[Clarinet] ✅ Received person: { id: 2, name: 'Alice' }

🌊 Parsing with stream-json:
[stream-json] 🔄 Chunk received - Partial object: {
  "id": 1,
  "name": "Jo"
}
[stream-json] 🔄 Chunk received - Partial object: {
  "id": 1,
  "name": "John Doe",
  "email": "john@example.com"
}
[stream-json] ✅ Received person: { id: 1, name: 'John Doe', email: 'john@example.com' }

📦 Parsing with only onComplete callback:
📦 Complete object received: { id: 1, name: 'John Doe', email: 'john@example.com' }
📦 Complete object received: { id: 2, name: 'Alice' }
```

## API Reference

### AssemblerConfig<T>
```typescript
interface AssemblerConfig<T> {
  onComplete?: (obj: T) => void;                                // Optional: Called when complete object is parsed
  onChunk?: (partialObj: Partial<T>, source?: string) => void; // Optional: Called for partial objects during parsing
}
```

### Functions
- `createClarinetAssembler<T>(config: AssemblerConfig<T>): StreamAssembler<T>`
- `createStreamJsonAssembler<T>(config: AssemblerConfig<T>): StreamAssembler<T>`
- `createStreamJsonArrayAssembler<T>(config: AssemblerConfig<T>): StreamAssembler<T>`

### StreamAssembler<T>
```typescript
interface StreamAssembler<T> {
  write(chunk: string): void;
  close(): void | Promise<void>;
}
```

## When to Use Which

### Use Clarinet when:
- You need minimal dependencies and maximum performance
- Working with simple JSON object streams
- Memory efficiency is critical
- You want fine-grained control over parsing events
- You need real-time visibility into object construction

### Use stream-json when:
- You need advanced filtering and transformation capabilities
- Working with complex nested JSON structures
- You want to leverage Node.js streams ecosystem
- You need built-in support for large array processing
- You want intelligent partial object extraction

## Use Cases

### Real-time Data Monitoring
Use the `onChunk` callback to monitor data as it arrives:
```typescript
const monitor = createClarinetAssembler<APIResponse>({
  onChunk: (partial) => updateProgressBar(partial),
  onComplete: (response) => processResponse(response)
});
```

### Silent Processing
Omit the `onChunk` callback for efficient processing without logging:
```typescript
const processor = createStreamJsonAssembler<LogEntry>({
  onComplete: (entry) => saveToDatabase(entry)
});
```

## Dependencies

- **clarinet**: SAX-style JSON parser for streaming JSON data
- **stream-json**: Node.js streams-based JSON parser with filtering
- **zod**: TypeScript-first schema declaration and validation library