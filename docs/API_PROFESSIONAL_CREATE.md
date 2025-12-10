# API: Create Professional Profile

## Endpoint

`professionalsService.createProfessional(data)`

## Request Body Structure

```typescript
{
  // Step 1: Basic Information (REQUIRED)
  full_name: string;           // User's full name
  email: string;              // User's email address
  bio: string;                // Professional bio (50-500 characters)

  // Step 2: About Me (REQUIRED)
  specialties: string[];       // Array of specialty tags (e.g., ["Psychology", "Counseling"])
  languages: string[];        // Array of language tags (e.g., ["English", "Turkish"])
  skills_certifications: string[]; // Array of skills/certifications (e.g., ["Certified Therapist", "EMDR"])

  // Step 3: Education & Experience (OPTIONAL)
  educations?: Array<{
    degree_level: string;      // e.g., "high_school", "bachelor", "master", "phd"
    institution?: string | null; // School/university name
    field_of_study?: string | null; // Field of study
    start_year?: number | null; // Start year (number)
    end_year?: number | null;   // End year (number, null if is_current is true)
    is_current: boolean;       // Currently studying
    description?: string | null; // Additional description
    sort_order: number;         // Display order (0, 1, 2, ...)
  }>;

  experiences?: Array<{
    title?: string | null;     // Job title
    company?: string | null;   // Company name
    location?: string | null;  // Location
    start_date: string | null; // Start date in format "YYYY-01-01" (year-only)
    end_date: string | null;   // End date in format "YYYY-12-31" or null if is_current is true
    is_current: boolean;       // Currently working here
    description?: string | null; // Additional description
    sort_order: number;         // Display order (0, 1, 2, ...)
  }>;

  // Step 4: Categories (REQUIRED)
  category_ids: string[];     // Array of category UUIDs (at least one required)

  // Step 5: Availability (REQUIRED - at least one)
  availabilities: Array<{
    available_at: 'every' | 'specific'; // Type of availability
    days?: string[] | null;    // Array of day names (e.g., ["Monday", "Tuesday"]) - required if available_at is "every"
    date?: string | null;      // Specific date in format "YYYY-MM-DD" - required if available_at is "specific"
    start_hour: string;        // Start time in format "HH:MM" (e.g., "09:00")
    end_hour: string;          // End time in format "HH:MM" (e.g., "17:00")
    currency?: string;         // Currency code (default: "USD")
    price_per_minute: number;  // Price per minute (number, e.g., 2.5)
  }>;

  // Step 6: Settings (REQUIRED)
  is_available: boolean;      // Available for calls
  is_public: boolean;         // Public profile visibility
}
```

## Validation Rules

### Required Fields

- ✅ `full_name` - Must be a non-empty string
- ✅ `email` - Must be a valid email format
- ✅ `bio` - Must be between 50-500 characters
- ✅ `specialties` - Array (can be empty)
- ✅ `languages` - Array (can be empty)
- ✅ `skills_certifications` - Array (can be empty)
- ✅ `category_ids` - **Must have at least one category**
- ✅ `availabilities` - **Must have at least one availability**
- ✅ `is_available` - Boolean
- ✅ `is_public` - Boolean

### Optional Fields

- `educations` - Can be empty array or undefined
- `experiences` - Can be empty array or undefined

### Format Requirements

#### Education

- `degree_level`: Must be one of: `"high_school"`, `"bachelor"`, `"master"`, `"phd"`, etc.
- `start_year`: Number (e.g., 2010)
- `end_year`: Number or null (null if `is_current` is true)
- `sort_order`: Number (0, 1, 2, ...)

#### Experience

- `start_date`: String in format `"YYYY-01-01"` (e.g., "2015-01-01")
- `end_date`: String in format `"YYYY-12-31"` or `null` (null if `is_current` is true)
- `sort_order`: Number (0, 1, 2, ...)

#### Availability

- `available_at`: Must be either `"every"` or `"specific"`
- If `available_at` is `"every"`:
  - `days` is required (array of day names)
  - `date` should be null
- If `available_at` is `"specific"`:
  - `date` is required (format: "YYYY-MM-DD")
  - `days` should be null
- `start_hour` and `end_hour`: Format "HH:MM" (24-hour format)
- `price_per_minute`: Must be a number (can be decimal, e.g., 2.5)

## Example Request

```json
{
  "full_name": "John Doe",
  "email": "john.doe@example.com",
  "bio": "Experienced therapist with 10+ years of practice in cognitive behavioral therapy and trauma counseling.",
  "specialties": ["Psychology", "Counseling", "Trauma Therapy"],
  "languages": ["English", "Spanish"],
  "skills_certifications": [
    "Licensed Therapist",
    "EMDR Certified",
    "CBT Specialist"
  ],
  "educations": [
    {
      "degree_level": "master",
      "institution": "Harvard University",
      "field_of_study": "Clinical Psychology",
      "start_year": 2010,
      "end_year": 2012,
      "is_current": false,
      "description": "Graduated with honors",
      "sort_order": 0
    }
  ],
  "experiences": [
    {
      "title": "Senior Therapist",
      "company": "Mental Health Clinic",
      "location": "New York, NY",
      "start_date": "2015-01-01",
      "end_date": null,
      "is_current": true,
      "description": "Leading trauma therapy programs",
      "sort_order": 0
    }
  ],
  "category_ids": ["14e75457-4d6d-4459-8dd2-e0254bde589b"],
  "availabilities": [
    {
      "available_at": "every",
      "days": ["Monday", "Wednesday", "Friday"],
      "date": null,
      "start_hour": "09:00",
      "end_hour": "17:00",
      "currency": "USD",
      "price_per_minute": 2.5
    },
    {
      "available_at": "specific",
      "days": null,
      "date": "2025-12-25",
      "start_hour": "10:00",
      "end_hour": "14:00",
      "currency": "USD",
      "price_per_minute": 3.0
    }
  ],
  "is_available": true,
  "is_public": true
}
```

## Response

### Success Response

```typescript
{
  success: true,
  professional: Professional // Created professional object
}
```

### Error Response

```typescript
{
  success: false,
  error: string // Error message
}
```

## Common Error Messages

- `"User not authenticated"` - User must be logged in
- `"User not found in database"` - User record doesn't exist
- `"At least one category is required"` - `category_ids` array is empty
- `"At least one availability is required"` - `availabilities` array is empty
- Database errors from Supabase (e.g., constraint violations, invalid data types)

## What the API Does

1. **Validates authentication** - Checks if user is logged in
2. **Validates required fields** - Ensures categories and availabilities are provided
3. **Creates professional record** - Inserts into `professionals` table
4. **Links categories** - Creates entries in `professional_categories` table
5. **Inserts educations** - Creates entries in `professional_educations` table
6. **Inserts experiences** - Creates entries in `professional_experiences` table
7. **Creates availabilities** - Creates entries in `availabilities` table
8. **Updates user profile** - Updates `users` table with name, email, and bio

## ⚠️ IMPORTANT: Multi-Table Operation

**This API performs a multi-table insert operation.** It does NOT just insert into the `professionals` table.

### What happens when you call `createProfessional`:

1. **Inserts into `professionals` table** - Creates the main professional record
2. **Inserts into `professional_categories` table** - Links categories (many-to-many relationship)
3. **Inserts into `professional_educations` table** - Creates education records
4. **Inserts into `professional_experiences` table** - Creates experience records
5. **Inserts into `availabilities` table** - Creates availability records
6. **Updates `users` table** - Updates user profile with name, email, bio

### ❌ Why Direct REST API POST Doesn't Work

If you try to POST directly to the REST API endpoint:

```
POST https://hmimorflmdhcgjhlxbwn.supabase.co/rest/v1/professionals
```

You will **ONLY** create a record in the `professionals` table. The education, experience, and availability data will **NOT** be inserted because:

- They belong to **separate tables** (`professional_educations`, `professional_experiences`, `availabilities`)
- They require the `professional_id` from the newly created professional record
- The service function handles this multi-step process automatically

### ✅ Correct Usage

**Use the service function instead:**

```typescript
import { professionalsService } from '@/services/supabase/professionals.service';

const result = await professionalsService.createProfessional({
  full_name: '...',
  email: '...',
  // ... all fields including educations, experiences, availabilities
});
```

This will:

- Create the professional record
- Create all related records in separate tables
- Link everything together with `professional_id`

### 📊 Database Structure

```
professionals (main table)
  ├── id (UUID) - used as foreign key in other tables
  └── ... other fields

professional_categories (junction table)
  ├── professional_id → professionals.id
  └── category_id → categories.id

professional_educations (related table)
  ├── professional_id → professionals.id
  └── ... education fields

professional_experiences (related table)
  ├── professional_id → professionals.id
  └── ... experience fields

availabilities (related table)
  ├── professional_id → professionals.id
  └── ... availability fields
```

## Notes

- The API automatically sets:
  - `title` and `profession` from the first specialty (or "Professional" as fallback)
  - `category_id` from the first category in `category_ids`
  - `rate_per_minute` from the first availability's `price_per_minute`
  - `is_active: true`
  - `total_calls: 0`
  - `total_minutes: 0`
- All relational data (categories, educations, experiences, availabilities) are linked to the created professional via `professional_id`
- The user's profile is automatically updated with the provided name, email, and bio
- **You cannot see education/experience/availability in the `professionals` table** - they are in separate tables and must be queried with joins or separate queries
