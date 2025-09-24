import parser from 'stream-json';
import StreamValues from 'stream-json/streamers/StreamValues.js';
import { Readable, Transform, Writable } from 'stream';
import { pipeline } from 'stream/promises';

export interface StreamAssembler<T> {
  write(chunk: string): void;
  close(): void | Promise<void>;
}

export interface AssemblerConfig<T> {
  onComplete?: (obj: T) => void;
  onChunk?: (partialObj: Partial<T>) => void;
}

export function createStreamJsonAssembler<T>(
  config: AssemblerConfig<T>
): StreamAssembler<T> {
  const { onComplete, onChunk } = config;
  let buffer = '';
  let processedLength = 0;
  let lastLoggedState = '';

  const parseJsonObjects = (input: string, startFrom: number = 0) => {
    const inputToProcess = input.substring(startFrom);
    const objects = extractCompleteJsonObjects(inputToProcess);
    
    let processedCount = 0;
    for (const jsonStr of objects.complete) {
      try {
        // Parse each complete JSON object individually
        const obj = JSON.parse(jsonStr);
        onComplete?.(obj as T);
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
      
      // Log the current buffer state if callback is provided
      if (onChunk) {
        const partialObjects = extractPartialObjects(buffer);
        const currentState = JSON.stringify(partialObjects);
        
        // Only log if the state has changed to avoid duplicates
        if (currentState !== lastLoggedState) {
          partialObjects.forEach(partialObj => {
            if (partialObj && Object.keys(partialObj).length > 0) {
              onChunk(partialObj as Partial<T>);
            }
          });
          lastLoggedState = currentState;
        }
      }
      
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

// Helper function to extract partial objects for logging
function extractPartialObjects(buffer: string): any[] {
  const partials: any[] = [];
  let current = '';
  let braceCount = 0;
  let inString = false;
  let escaped = false;

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
      braceCount++;
    } else if (char === '}') {
      braceCount--;
      if (braceCount === 0) {
        // Try to parse the potential complete object
        try {
          const obj = JSON.parse(current);
          partials.push(obj);
        } catch {
          // If it fails, try to parse as partial
          const partial = tryParsePartial(current);
          if (partial) partials.push(partial);
        }
        current = '';
      }
    }
  }

  // Handle incomplete objects
  if (current.trim() && braceCount > 0) {
    const partial = tryParsePartial(current);
    if (partial) partials.push(partial);
  }

  return partials;
}

// Helper function to try parsing partial JSON objects
function tryParsePartial(jsonStr: string): any | null {
  try {
    // Try to complete the JSON by adding missing closing braces
    let completed = jsonStr.trim();
    const openBraces = (completed.match(/{/g) || []).length;
    const closeBraces = (completed.match(/}/g) || []).length;
    const missingBraces = openBraces - closeBraces;
    
    if (missingBraces > 0) {
      completed += '}'.repeat(missingBraces);
    }
    
    return JSON.parse(completed);
  } catch {
    // If still can't parse, try to extract key-value pairs manually
    const matches = jsonStr.match(/"([^"]+)"\s*:\s*"?([^,}"]+)"?/g);
    if (matches) {
      const obj: any = {};
      matches.forEach(match => {
        const [, key, value] = match.match(/"([^"]+)"\s*:\s*"?([^,}"]+)"?/) || [];
        if (key && value !== undefined) {
          obj[key] = isNaN(Number(value)) ? value.replace(/"$/, '') : Number(value);
        }
      });
      return Object.keys(obj).length > 0 ? obj : null;
    }
    return null;
  }
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
  config: AssemblerConfig<T>
): StreamAssembler<T> {
  const { onComplete } = config;
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
            onComplete?.(chunk.value as T);
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
            onComplete?.(obj as T);
          });
        } catch (fallbackError) {
          console.error('Fallback parsing also failed:', fallbackError);
        }
      }
    }
  };
}