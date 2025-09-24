import clarinet from "clarinet";

export interface StreamAssembler<T> {
  write(chunk: string): void;
  close(): void;
}

export interface AssemblerConfig<T> {
  onComplete?: (obj: T) => void;
  onChunk?: (partialObj: Partial<T>) => void;
}

export function createClarinetAssembler<T>(
  config: AssemblerConfig<T>
): StreamAssembler<T> {
  const { onComplete, onChunk } = config;
  const parser = clarinet.createStream();
  const stack: any[] = [];
  let current: any = null;
  let key: string | null = null;
  let objectDepth = 0;
  let rootObjects: any[] = []; // Track all root-level objects for chunk reporting
  let inputBuffer = ''; // Track raw input to extract partial values
  let lastChunkState: any = null; // Track last reported state to avoid duplicates

  // Helper function to extract partial values from input buffer
  const extractPartialFromBuffer = (): any => {
    if (!current || objectDepth !== 1) return current;
    
    // Start with current complete state
    const result = { ...current };
    
    // Try to parse any incomplete JSON from the buffer to extract partial values
    try {
      // Find the last incomplete object in the buffer
      let braceCount = 0;
      let lastObjectStart = -1;
      let inString = false;
      let escaped = false;
      
      for (let i = 0; i < inputBuffer.length; i++) {
        const char = inputBuffer[i];
        
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
        
        if (inString) continue;
        
        if (char === '{') {
          if (braceCount === 0) {
            lastObjectStart = i;
          }
          braceCount++;
        } else if (char === '}') {
          braceCount--;
        }
      }
      
      // If we have an incomplete object, try to extract partial values
      if (braceCount > 0 && lastObjectStart !== -1) {
        const incompleteObject = inputBuffer.substring(lastObjectStart);
        
        // Parse key-value pairs, including incomplete ones
        const keyValueRegex = /"([^"]+)"\s*:\s*(?:(\d+)|"([^"]*)"?)/g;
        let match;
        
        while ((match = keyValueRegex.exec(incompleteObject)) !== null) {
          const [, key, numberValue, stringValue] = match;
          if (numberValue !== undefined) {
            result[key] = parseInt(numberValue);
          } else if (stringValue !== undefined) {
            result[key] = stringValue;
          }
        }
      }
    } catch (error) {
      // If parsing fails, just return current state
    }
    
    return result;
  };

  // Helper function to report chunk updates
  const reportCurrentChunk = () => {
    if (onChunk && current && objectDepth === 1) {
      const partialObj = extractPartialFromBuffer();
      const currentState = JSON.stringify(partialObj);
      
      // Only report if state has changed
      if (currentState !== lastChunkState && Object.keys(partialObj).length > 0) {
        onChunk(partialObj as Partial<T>);
        lastChunkState = currentState;
      }
    }
  };

  parser.on("openobject", (name: string | undefined) => {
    objectDepth++;
    
    const newObj = {};
    
    if (objectDepth === 1) {
      // This is a root-level object
      current = newObj;
      rootObjects.push(current); // Track this root object
      // If name is provided, it's the first key of this object
      if (name) {
        key = name;
      }
    } else {
      // This is a nested object
      if (current !== null) {
        if (Array.isArray(current)) {
          current.push(newObj);
        } else if (key !== null) {
          current[key] = newObj;
          key = null;
        }
      }
      stack.push(current);
      current = newObj;
      // If name is provided, it's the first key of this nested object
      if (name) {
        key = name;
      }
    }
    
    // Report chunk after opening object
    reportCurrentChunk();
  });

  parser.on("closeobject", () => {
    objectDepth--;
    
    if (objectDepth === 0) {
      // Completed a root-level object
      if (current !== null) {
        onComplete?.(current as T);
        // Remove this completed object from rootObjects tracking
        const index = rootObjects.indexOf(current);
        if (index > -1) {
          rootObjects.splice(index, 1);
        }
        current = null;
      }
    } else if (stack.length > 0) {
      // Closing a nested object
      current = stack.pop();
    }
  });

  parser.on("openarray", (name: string | undefined) => {
    const newArray: any[] = [];
    if (current !== null) {
      if (Array.isArray(current)) {
        current.push(newArray);
      } else if (key !== null) {
        current[key] = newArray;
        key = null;
      }
    }
    stack.push(current);
    current = newArray;
  });

  parser.on("closearray", () => {
    if (stack.length > 0) {
      current = stack.pop();
    }
  });

  parser.on("key", (k: string) => {
    key = k;
  });

  parser.on("value", (value: any) => {
    if (current !== null && key !== null) {
      current[key] = value;
      key = null;
      
      // Report chunk update after each value is set, but only for root-level objects
      reportCurrentChunk();
    } else if (Array.isArray(current)) {
      current.push(value);
    }
  });

  parser.on("error", (err: Error) => {
    console.error("Parser error:", err);
  });

  return {
    write(chunk: string): void {
      inputBuffer += chunk;
      (parser as any).write(chunk);
      
      // Report chunk update after processing input
      setTimeout(() => reportCurrentChunk(), 0);
    },
    
    close(): void {
      parser.end("");
    }
  };
}