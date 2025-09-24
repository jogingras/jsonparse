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

// Function to parse using Clarinet
function parseWithClarinet(jsonChunks: string[]) {
  console.log("\n🔧 Parsing with Clarinet:");
  console.log("=" .repeat(40));
  
  const assembler = createClarinetAssembler<Person>((obj) => 
    validateAndLogPerson(obj, "Clarinet")
  );

  // Process chunks
  jsonChunks.forEach(chunk => assembler.write(chunk));
  assembler.close();
}

// Function to parse using stream-json
async function parseWithStreamJson(jsonChunks: string[]) {
  console.log("\n🌊 Parsing with stream-json:");
  console.log("=" .repeat(40));
  
  const assembler = createStreamJsonAssembler<Person>((obj) => 
    validateAndLogPerson(obj, "stream-json")
  );

  // Process chunks
  jsonChunks.forEach(chunk => assembler.write(chunk));
  assembler.close();
  
  // Give a small delay to ensure async processing completes
  await new Promise(resolve => setTimeout(resolve, 100));
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

  console.log("\n✨ Comparison complete!");
}

// Run the comparison
compareParsers().catch(console.error);