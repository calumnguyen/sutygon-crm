# SUTYGON Review System - Database Documentation

## Overview

The SUTYGON Customer Review System captures customer feedback through a web form and stores it securely in a PostgreSQL database with AES-256-CBC encryption for sensitive data.

## Database Schema

### Table: `reviews`

**Location**: PostgreSQL database in `public` schema  
**Primary Key**: `id` (TEXT - CUID)

```sql
CREATE TABLE "reviews" (
    "id" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "phoneNumber" TEXT,
    "emailAddress" TEXT,
    "invoiceNumber" TEXT,
    "rating" INTEGER NOT NULL,
    "ratingDescription" TEXT NOT NULL,
    "helperName" TEXT,
    "reviewDetail" TEXT NOT NULL,
    "dateCreated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "deviceType" TEXT,
    "browserType" TEXT,
    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- Indexes for performance
CREATE INDEX "reviews_dateCreated_idx" ON "reviews"("dateCreated");
CREATE INDEX "reviews_rating_idx" ON "reviews"("rating");
CREATE INDEX "reviews_customerName_idx" ON "reviews"("customerName");
```

## Data Encryption Status

### 🔐 ENCRYPTED FIELDS

These fields contain AES-256-CBC encrypted data and require decryption before display:

| Field           | Type | Description                         | Format              |
| --------------- | ---- | ----------------------------------- | ------------------- |
| `customerName`  | TEXT | Customer's full name                | `IV:encrypted_data` |
| `phoneNumber`   | TEXT | Vietnamese phone number             | `IV:encrypted_data` |
| `emailAddress`  | TEXT | Customer email address              | `IV:encrypted_data` |
| `invoiceNumber` | TEXT | Receipt/invoice number (Bien lai)   | `IV:encrypted_data` |
| `helperName`    | TEXT | Staff member who assisted           | `IV:encrypted_data` |
| `reviewDetail`  | TEXT | Customer's detailed review/comment  | `IV:encrypted_data` |
| `ipAddress`     | TEXT | Client IP address                   | `IV:encrypted_data` |
| `deviceType`    | TEXT | Device type (mobile/desktop/tablet) | `IV:encrypted_data` |
| `browserType`   | TEXT | Browser name and version            | `IV:encrypted_data` |

### 📊 NON-ENCRYPTED FIELDS

These fields are stored in plaintext for analytics and querying:

| Field               | Type      | Description                     | Purpose                         |
| ------------------- | --------- | ------------------------------- | ------------------------------- |
| `id`                | TEXT      | Unique review identifier (CUID) | Primary key                     |
| `rating`            | INTEGER   | Rating score (1-10)             | Analytics, filtering, reporting |
| `ratingDescription` | TEXT      | Vietnamese rating description   | Analytics, dashboard display    |
| `dateCreated`       | TIMESTAMP | Review submission timestamp     | Sorting, filtering, analytics   |

## Rating System

### Rating Scale: 1-10 with Face Icons

| Rating | Description          | Icon Representation |
| ------ | -------------------- | ------------------- |
| 1      | "Thật sự tệ"         | 😠 Angry (Red)      |
| 2      | "Rất không hài lòng" | 😠 Angry (Red)      |
| 3      | "Khá tệ"             | 🙁 Frown (Orange)   |
| 4      | "Chưa ổn lắm"        | 🙁 Frown (Orange)   |
| 5      | "Tạm được"           | 😐 Neutral (Yellow) |
| 6      | "Ổn"                 | 😐 Neutral (Yellow) |
| 7      | "Khá tốt"            | 😊 Smile (Green)    |
| 8      | "Tốt"                | 😊 Smile (Green)    |
| 9      | "Rất tuyệt"          | 😄 Grin (Emerald)   |
| 10     | "Hoàn hảo!"          | 😄 Grin (Emerald)   |

## Encryption Implementation

### Algorithm: AES-256-CBC

- **Key Size**: 256-bit (64 hexadecimal characters)
- **Initialization Vector (IV)**: 16 bytes, deterministic
- **Format**: `{IV_HEX}:{ENCRYPTED_DATA_HEX}`
- **Environment Variable**: `ENCRYPTION_KEY`

### Deterministic IV Generation

```javascript
// IV = SHA-256(plaintext + encryption_key).substring(0, 16)
const combined = plaintext + encryptionKey;
const hash = crypto.createHash('sha256').update(combined, 'utf8').digest();
const iv = hash.subarray(0, 16);
```

**Benefits**:

- Same plaintext always produces same ciphertext
- Enables encrypted data searching/matching
- Maintains referential integrity

## Data Access Patterns

### 1. Reading Encrypted Data

```javascript
// Example: Reading a review record
const review = await prisma.review.findUnique({ where: { id } });

// Decrypt sensitive fields
const decryptedData = {
  id: review.id,
  customerName: decrypt(review.customerName),
  phoneNumber: review.phoneNumber ? decrypt(review.phoneNumber) : null,
  emailAddress: review.emailAddress ? decrypt(review.emailAddress) : null,
  invoiceNumber: review.invoiceNumber ? decrypt(review.invoiceNumber) : null,
  rating: review.rating, // Already plaintext
  ratingDescription: review.ratingDescription, // Already plaintext
  helperName: review.helperName ? decrypt(review.helperName) : null,
  reviewDetail: decrypt(review.reviewDetail),
  dateCreated: review.dateCreated, // Already plaintext
  ipAddress: review.ipAddress ? decrypt(review.ipAddress) : null,
  deviceType: review.deviceType ? decrypt(review.deviceType) : null,
  browserType: review.browserType ? decrypt(review.browserType) : null,
};
```

### 2. Analytics Queries (No Decryption Needed)

```sql
-- Average rating
SELECT AVG(rating) FROM reviews;

-- Rating distribution
SELECT rating, COUNT(*) FROM reviews GROUP BY rating;

-- Reviews by date
SELECT DATE(dateCreated) as date, COUNT(*) FROM reviews GROUP BY DATE(dateCreated);

-- Recent reviews with ratings
SELECT id, rating, ratingDescription, dateCreated FROM reviews
ORDER BY dateCreated DESC LIMIT 10;
```

### 3. Searching Encrypted Data

```javascript
// Search by exact encrypted customer name
const encryptedSearchTerm = encrypt('Nguyễn Văn A');
const reviews = await prisma.review.findMany({
  where: { customerName: encryptedSearchTerm },
});
```

## Required Validation Rules

### Customer Contact (One Required)

- **Phone Number**: Vietnamese format `^(\+84|84|0)(3|5|7|8|9)([0-9]{8})$`
- **Email Address**: Standard email validation
- **Rule**: At least one of phone OR email must be provided

### Text Field Limits

- **Customer Name**: 2+ characters
- **Review Detail**: 16-500 characters
- **Invoice Number**: Optional, any length
- **Helper Name**: Optional, any length

### Data Sanitization (Applied Before Encryption)

1. **DOMPurify**: Remove HTML tags and scripts
2. **Validator.escape**: Escape special characters
3. **Trim**: Remove leading/trailing whitespace

## Performance Considerations

### Indexing Strategy

- `dateCreated`: For chronological queries
- `rating`: For analytics and filtering
- `customerName`: For encrypted name lookups (deterministic encryption)

### Query Optimization

- Use plaintext fields (`rating`, `dateCreated`) for filtering/sorting
- Decrypt only necessary fields for display
- Batch decrypt operations when processing multiple records
- Cache decrypted data when appropriate

## Security Notes

### Data Protection

- All PII encrypted at rest
- Deterministic encryption enables searching
- Environment-based encryption key management
- Input sanitization prevents injection attacks

### Access Control

- Encryption key must be securely managed
- Decryption should be limited to authorized systems
- Audit trails should track data access
- Regular key rotation recommended

## Integration Examples

### Customer Service Dashboard

```javascript
// Display recent reviews with decrypted customer info
const reviews = await getRecentReviews();
const displayData = reviews.map((review) => ({
  id: review.id,
  customer: decrypt(review.customerName),
  contact: review.phoneNumber ? decrypt(review.phoneNumber) : decrypt(review.emailAddress),
  rating: review.rating,
  description: review.ratingDescription,
  comment: decrypt(review.reviewDetail),
  date: review.dateCreated,
  staff: review.helperName ? decrypt(review.helperName) : 'N/A',
}));
```

### Analytics Report

```javascript
// Generate rating statistics (no decryption needed)
const stats = await prisma.review.aggregate({
  _avg: { rating: true },
  _count: { rating: true },
  _min: { dateCreated: true },
  _max: { dateCreated: true },
});
```

### Customer Lookup

```javascript
// Find customer by encrypted phone number
const customerPhone = '0905188428';
const encryptedPhone = encrypt(customerPhone);
const customerReviews = await prisma.review.findMany({
  where: { phoneNumber: encryptedPhone },
  orderBy: { dateCreated: 'desc' },
});
```

## File Structure Reference

```
src/
├── lib/
│   └── encryption.ts          # Encryption utilities
├── app/
│   ├── api/
│   │   └── reviews/
│   │       └── route.ts       # API endpoint with encryption
│   └── review/
│       └── page.tsx           # Review form component
└── types/
    └── index.ts               # TypeScript definitions
```

---

**Last Updated**: December 2024  
**Schema Version**: 1.0  
**Encryption**: AES-256-CBC with deterministic IV
