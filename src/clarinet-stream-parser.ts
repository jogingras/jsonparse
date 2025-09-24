import clarinet from "clarinet";

export interface StreamAssembler<T> {
  write(chunk: string): void;
  close(): void;
}

export function createClarinetAssembler<T>(
  onComplete: (obj: T) => void
): StreamAssembler<T> {
  const parser = clarinet.createStream();
  const stack: any[] = [];
  let current: any = null;
  let key: string | null = null;
  let objectDepth = 0;

  parser.on("openobject", (name: string | undefined) => {
    objectDepth++;
    
    const newObj = {};
    
    if (objectDepth === 1) {
      // This is a root-level object
      current = newObj;
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
  });

  parser.on("closeobject", () => {
    objectDepth--;
    
    if (objectDepth === 0) {
      // Completed a root-level object
      if (current !== null) {
        onComplete(current as T);
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
    } else if (Array.isArray(current)) {
      current.push(value);
    }
  });

  parser.on("error", (err: Error) => {
    console.error("Parser error:", err);
  });

  return {
    write(chunk: string): void {
      (parser as any).write(chunk);
    },
    
    close(): void {
      parser.end("");
    }
  };
}