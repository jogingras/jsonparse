import { createClarinetAssembler } from "./clarinet-stream-parser.js";
import { createStreamJsonAssembler } from "./stream-json-parser.js";
import { PersonSchema, Person } from "./schemas.js";

// Shared validation function
const validateAndLogPerson = (raw: any, source: string) => {
  const res = PersonSchema.safeParse(raw);
  if (!res.success) {
    console.warn(`[${source}] Invalid object:`, res.error.errors);
    return;
  }
  const person: Person = res.data;
  console.log(`[${source}] ✅ Received person:`, person);
};

// Shared chunk logging function
const logChunkReceived = (partialObj: Partial<Person>, source?: string) => {
  const sourceLabel = source || "Unknown";
  console.log(`[${sourceLabel}] 🔄 Chunk received - Partial object:`, JSON.stringify(partialObj, null, 2));
};

// Function to parse using Clarinet
function parseWithClarinet(jsonChunks: string[]) {
  console.log("\n🔧 Parsing with Clarinet:");
  console.log("=" .repeat(40));
  
  const assembler = createClarinetAssembler<Person>({
    onComplete: (obj) => validateAndLogPerson(obj, "Clarinet"),
    onChunk: (partialObj, source) => logChunkReceived(partialObj, source)
  });

  // Process chunks
  jsonChunks.forEach(chunk => assembler.write(chunk));
  assembler.close();
}

// Function to parse using stream-json
async function parseWithStreamJson(jsonChunks: string[]) {
  console.log("\n🌊 Parsing with stream-json:");
  console.log("=" .repeat(40));
  
  const assembler = createStreamJsonAssembler<Person>({
    onComplete: (obj) => validateAndLogPerson(obj, "stream-json"),
    onChunk: (partialObj, source) => logChunkReceived(partialObj, source)
  });

  // Process chunks
  jsonChunks.forEach(chunk => assembler.write(chunk));
  assembler.close();
  
  // Give a small delay to ensure async processing completes
  await new Promise(resolve => setTimeout(resolve, 100));
}

// Demo function with only onComplete callback
function parseOnlyComplete(jsonChunks: string[]) {
  console.log("\n📦 Parsing with only onComplete callback:");
  console.log("=" .repeat(40));
  
  const assembler = createClarinetAssembler<Person>({
    onComplete: (obj) => console.log("📦 Complete object received:", obj)
    // No onChunk callback - will be silent during parsing
  });

  jsonChunks.forEach(chunk => assembler.write(chunk));
  assembler.close();
}

// Demo function to compare both parsers
async function compareParsers() {
  console.log("🚀 JSON Parser Comparison Demo");
  console.log("Testing both Clarinet and stream-json with the same data");
  console.log("Both parsers use the same Person schema and handle chunked JSON data");
  console.log("=" .repeat(60));

  // Test data - simulating chunked streaming
  const testChunks = [
    '{"id":1,"name":"Jo',
    'hn Doe","email":"john@example.com"}{"id":2,"name":"A',
    'lice"}{"id":3,"name":"Bob Smith","email":"bob@example.com"}'
  ];

  // Parse with Clarinet
  parseWithClarinet([...testChunks]);

  // Parse with stream-json
  await parseWithStreamJson([...testChunks]);

  // Demo with only onComplete callback
  parseOnlyComplete([...testChunks]);

  console.log("\n✨ Comparison complete!");
}

// Run the comparison
compareParsers().catch(console.error);