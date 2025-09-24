import parser from 'stream-json';
import StreamValues from 'stream-json/streamers/StreamValues.js';
import { Readable, Transform, Writable } from 'stream';
import { pipeline } from 'stream/promises';

export interface StreamAssembler<T> {
  write(chunk: string): void;
  close(): void | Promise<void>;
}

export function createStreamJsonAssembler<T>(
  onComplete: (obj: T) => void
): StreamAssembler<T> {
  let buffer = '';
  let processedLength = 0;

  const parseJsonObjects = (input: string, startFrom: number = 0) => {
    const inputToProcess = input.substring(startFrom);
    const objects = extractCompleteJsonObjects(inputToProcess);
    
    let processedCount = 0;
    for (const jsonStr of objects.complete) {
      try {
        // Parse each complete JSON object individually
        const obj = JSON.parse(jsonStr);
        onComplete(obj as T);
        processedCount++;
      } catch (error) {
        console.error('Error parsing JSON object:', error);
      }
    }
    
    return {
      newProcessedLength: startFrom + inputToProcess.length - objects.incomplete.length,
      processedCount
    };
  };

  return {
    write(chunk: string): void {
      buffer += chunk;
      // Try to process any complete objects immediately
      try {
        const result = parseJsonObjects(buffer, processedLength);
        processedLength = result.newProcessedLength;
      } catch (error) {
        console.error('Error in write processing:', error);
      }
    },

    close(): void {
      // Process any remaining buffer content
      if (buffer.length > processedLength) {
        try {
          parseJsonObjects(buffer, processedLength);
        } catch (error) {
          console.error('Error in close processing:', error);
        }
      }
    }
  };
}

// Helper function to extract complete JSON objects from a buffer
function extractCompleteJsonObjects(buffer: string): { complete: string[], incomplete: string } {
  const complete: string[] = [];
  let current = '';
  let braceCount = 0;
  let inString = false;
  let escaped = false;
  let startIndex = -1;

  for (let i = 0; i < buffer.length; i++) {
    const char = buffer[i];
    current += char;

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === '\\') {
      escaped = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) {
      continue;
    }

    if (char === '{') {
      if (braceCount === 0) {
        startIndex = current.length - 1;
      }
      braceCount++;
    } else if (char === '}') {
      braceCount--;
      if (braceCount === 0 && startIndex !== -1) {
        // Found a complete JSON object
        const jsonStr = current.substring(startIndex);
        complete.push(jsonStr);
        current = '';
        startIndex = -1;
      }
    }
  }

  return {
    complete,
    incomplete: current
  };
}

// True streaming approach using stream-json for array parsing
export function createStreamJsonArrayAssembler<T>(
  onComplete: (obj: T) => void
): StreamAssembler<T> {
  let buffer = '';

  return {
    write(chunk: string): void {
      buffer += chunk;
    },

    async close(): Promise<void> {
      if (!buffer.trim()) return;

      try {
        // Wrap individual objects in an array for stream-json to process
        let jsonInput = buffer.trim();
        
        // If it's not already an array, try to convert multiple objects into an array
        if (!jsonInput.startsWith('[')) {
          // Split on object boundaries and create an array
          const objects = extractCompleteJsonObjects(jsonInput).complete;
          if (objects.length > 0) {
            jsonInput = '[' + objects.join(',') + ']';
          } else {
            // If no complete objects, just wrap the whole thing
            jsonInput = '[' + jsonInput + ']';
          }
        }

        console.log('Processing JSON input:', jsonInput.substring(0, 100) + '...');

        const source = new Readable({
          read() {}
        });

        const processor = new Transform({
          objectMode: true,
          transform(chunk, encoding, callback) {
            onComplete(chunk.value as T);
            callback();
          }
        });

        const sink = new Writable({
          objectMode: true,
          write(chunk, encoding, callback) {
            callback();
          }
        });

        // Start the pipeline before pushing data
        const pipelinePromise = pipeline(
          source,
          parser(),
          StreamValues.withParser(),
          processor,
          sink
        );

        // Push data to the source
        source.push(jsonInput);
        source.push(null);

        // Wait for pipeline to complete
        await pipelinePromise;
      } catch (error) {
        console.error('Error parsing JSON with stream-json:', error);
        // Fallback to simple JSON parsing
        try {
          const objects = extractCompleteJsonObjects(buffer);
          objects.complete.forEach(jsonStr => {
            const obj = JSON.parse(jsonStr);
            onComplete(obj as T);
          });
        } catch (fallbackError) {
          console.error('Fallback parsing also failed:', fallbackError);
        }
      }
    }
  };
}