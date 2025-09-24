import { z } from "zod";

// Simple Person Schema (existing)
export const PersonSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().email().optional(),
});

export type Person = z.infer<typeof PersonSchema>;

// Complex Company Schema with nested structures
export const AddressSchema = z.object({
  street: z.string().min(1, "Street is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().length(2, "State must be 2 characters"),
  zipCode: z.string().regex(/^\d{5}(-\d{4})?$/, "Invalid zip code format"),
  country: z.string().default("US"),
});

export const ContactInfoSchema = z.object({
  email: z.string().email("Invalid email format"),
  phone: z.string().regex(/^\+?[\d\s\-\(\)]+$/, "Invalid phone format").optional(),
  website: z.string().url("Invalid website URL").optional(),
  socialMedia: z.object({
    twitter: z.string().optional(),
    linkedin: z.string().optional(),
    github: z.string().optional(),
  }).optional(),
});

export const DepartmentSchema = z.object({
  id: z.number().positive("Department ID must be positive"),
  name: z.string().min(1, "Department name is required"),
  budget: z.number().nonnegative("Budget cannot be negative"),
  manager: z.object({
    id: z.number(),
    name: z.string(),
    title: z.string(),
    yearsOfExperience: z.number().min(0).max(50),
  }),
  employees: z.array(z.object({
    id: z.number(),
    name: z.string(),
    position: z.string(),
    salary: z.number().positive(),
    startDate: z.string().datetime("Invalid date format"),
    skills: z.array(z.string()).min(1, "At least one skill required"),
    isRemote: z.boolean().default(false),
  })).min(1, "Department must have at least one employee"),
});

export const CompanyTypeEnum = z.enum([
  "startup", 
  "corporation", 
  "nonprofit", 
  "government", 
  "partnership", 
  "llc"
]);

export const CompanySchema = z.object({
  id: z.number().positive("Company ID must be positive"),
  name: z.string().min(2, "Company name must be at least 2 characters"),
  type: CompanyTypeEnum,
  founded: z.number()
    .min(1800, "Founded year must be after 1800")
    .max(new Date().getFullYear(), "Founded year cannot be in the future"),
  employees: z.number().nonnegative("Employee count cannot be negative"),
  revenue: z.number().nonnegative("Revenue cannot be negative").optional(),
  isPublic: z.boolean().default(false),
  
  // Nested objects
  headquarters: AddressSchema,
  branches: z.array(AddressSchema).optional(),
  contact: ContactInfoSchema,
  
  // Array of complex objects
  departments: z.array(DepartmentSchema).min(1, "Company must have at least one department"),
  
  // Union types
  status: z.union([
    z.literal("active"),
    z.literal("inactive"),
    z.literal("pending"),
    z.literal("suspended")
  ]).default("active"),
  
  // Conditional validation
  stockSymbol: z.string().optional(),
  
  // Complex transformations
  tags: z.array(z.string()).transform(tags => tags.map(tag => tag.toLowerCase())),
  
  // Metadata with discriminated union
  metadata: z.discriminatedUnion("type", [
    z.object({
      type: z.literal("tech"),
      primaryLanguage: z.string(),
      frameworks: z.array(z.string()),
      hasAI: z.boolean().default(false),
    }),
    z.object({
      type: z.literal("retail"),
      storeCount: z.number().nonnegative(),
      onlinePresence: z.boolean(),
      categories: z.array(z.string()),
    }),
    z.object({
      type: z.literal("finance"),
      regulatedBy: z.array(z.string()),
      assetsUnderManagement: z.number().optional(),
      riskRating: z.enum(["low", "medium", "high"]),
    }),
  ]),
}).refine((data) => {
  // Cross-field validation: public companies must have stock symbol
  if (data.isPublic && (!data.stockSymbol || data.stockSymbol.length === 0)) {
    return false;
  }
  return true;
}, {
  message: "Public companies must have a stock symbol",
  path: ["stockSymbol"]
}).refine((data) => {
  // Cross-field validation: tech companies should have tech departments
  if (data.metadata.type === "tech") {
    const hasTechDept = data.departments.some(dept => 
      dept.name.toLowerCase().includes("tech") || 
      dept.name.toLowerCase().includes("engineering") ||
      dept.name.toLowerCase().includes("development")
    );
    return hasTechDept;
  }
  return true;
}, {
  message: "Tech companies should have at least one technology-related department",
  path: ["departments"]
});

export type Address = z.infer<typeof AddressSchema>;
export type ContactInfo = z.infer<typeof ContactInfoSchema>;
export type Department = z.infer<typeof DepartmentSchema>;
export type Company = z.infer<typeof CompanySchema>;
export type CompanyType = z.infer<typeof CompanyTypeEnum>;