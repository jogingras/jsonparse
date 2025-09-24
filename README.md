# JSON Parser Comparison Demo

A comprehensive comparison of streaming JSON parsers using Clarinet and stream-json with Zod validation.

## Overview

This project demonstrates how to parse streaming JSON data using two different approaches:
1. **Clarinet**: A SAX-style JSON parser perfect for streaming
2. **stream-json**: Node.js streams-based JSON parser with powerful filtering capabilities

Both approaches include validation using Zod schemas and are useful for handling large JSON payloads or real-time streaming data where you need to process JSON objects as they arrive.

## Features

- **Multiple parsing approaches**: Compare Clarinet vs stream-json
- **Streaming JSON parsing**: Process JSON objects as they arrive in chunks
- **Schema validation**: Use Zod schemas to validate and type-check parsed objects
- **Error handling**: Graceful handling of invalid JSON and schema validation errors
- **TypeScript support**: Full type safety with TypeScript

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

Run the advanced Clarinet demo with complex objects:

```bash
npm run demo
```

Run the comprehensive stream-json examples:

```bash
npm run stream-demo
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
2. **Stream Parser**: Create a streaming parser that handles partial JSON chunks
3. **Validation**: Each complete object is validated against the Zod schema
4. **Processing**: Valid objects are processed by your handler function

### Clarinet Approach
The `createClarinetAssembler` function creates a SAX-style parser that:
- Handles partial JSON chunks with events (openobject, closeobject, key, value)
- Maintains a stack to track nested objects and arrays
- Calls your completion handler for each complete root-level object

### stream-json Approach
The `createStreamJsonAssembler` function creates a streams-based parser that:
- Buffers incoming chunks and identifies complete JSON objects
- Uses Node.js streams pipeline with stream-json for parsing
- Provides more powerful filtering and transformation capabilities

## Examples

### Basic Usage (Both Parsers)

```typescript
// Clarinet
const clarinetAssembler = createClarinetAssembler<Person>(handleComplete);

// stream-json
const streamJsonAssembler = createStreamJsonAssembler<Person>(handleComplete);

// Process partial chunks (same for both)
assembler.write('{"id":1,"name":"Jo');
assembler.write('hn Doe","email":"john@example.com"}{"id":2,"name":"A');
assembler.write('lice"}');

assembler.close();
```

### Comparison Demo Output
```
🔧 Parsing with Clarinet:
[Clarinet] ✅ Received person: { id: 1, name: 'John Doe', email: 'john@example.com' }
[Clarinet] ✅ Received person: { id: 2, name: 'Alice' }
[Clarinet] ✅ Received person: { id: 3, name: 'Bob Smith', email: 'bob@example.com' }

🌊 Parsing with stream-json (Simple):
[stream-json] ✅ Received person: { id: 1, name: 'John Doe', email: 'john@example.com' }
[stream-json] ✅ Received person: { id: 2, name: 'Alice' }
[stream-json] ✅ Received person: { id: 3, name: 'Bob Smith', email: 'bob@example.com' }
```

## When to Use Which

### Use Clarinet when:
- You need minimal dependencies and maximum performance
- Working with simple JSON object streams
- Memory efficiency is critical
- You want fine-grained control over parsing events

### Use stream-json when:
- You need advanced filtering and transformation capabilities
- Working with complex nested JSON structures
- You want to leverage Node.js streams ecosystem
- You need built-in support for large array processing

## Dependencies

- **clarinet**: SAX-style JSON parser for streaming JSON data
- **stream-json**: Node.js streams-based JSON parser with filtering
- **zod**: TypeScript-first schema declaration and validation library