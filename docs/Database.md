# BUGS Auto Quality Cars — Database Specification

## 1. PURPOSE

This document defines the data architecture for BUGS Auto Quality Cars.

The database must support:

* Vehicle inventory
* Vehicle images
* Vehicle videos
* Specifications
* Pricing
* Promotions
* Financing
* Customer inquiries
* Test-drive requests
* Admin users
* Admin notes
* Dealership settings
* Activity tracking

The schema should be normalized and designed for maintainability.

---

# 2. CORE RELATIONSHIP

The main relationship is:

```text
Vehicle
│
├── Images
├── Videos
├── Specifications
├── Promotions
├── Financing Options
├── Inquiries
└── Test Drive Requests
```

---

# 3. VEHICLES

Table:

```text
vehicles
```

Suggested fields:

```text
id
brand
model
variant
slug
year
condition
body_type
fuel_type
transmission
drive_type
seating_capacity
mileage
description

srp
selling_price
promo_price

status
is_featured
is_promoted

created_at
updated_at
published_at
```

---

# 4. VEHICLE STATUS

Allowed values:

```text
draft
published
reserved
sold
archived
```

Only appropriate public statuses should appear in the public inventory.

---

# 5. VEHICLE IMAGES

Table:

```text
vehicle_images
```

Fields:

```text
id
vehicle_id
storage_path
url
alt_text
category
sort_order
is_primary
created_at
```

Relationship:

```text
vehicles.id
      ↓
vehicle_images.vehicle_id
```

One vehicle can have many images.

---

# 6. IMAGE CATEGORIES

Suggested values:

```text
exterior
interior
dashboard
engine
features
other
```

Do not hard-code these values throughout the UI.

If flexibility is needed, convert categories into a managed data structure.

---

# 7. VEHICLE VIDEOS

Table:

```text
vehicle_videos
```

Fields:

```text
id
vehicle_id
title
video_url
thumbnail_url
video_type
sort_order
created_at
updated_at
```

Types:

```text
walkaround
interior
exterior
driving
features
promotion
other
```

---

# 8. VEHICLE SPECIFICATIONS

There are two possible approaches.

## Option A — Structured fields

Use columns for frequently queried specifications:

```text
engine
transmission
fuel_type
drive_type
seating_capacity
power
torque
```

## Option B — Flexible specifications

Table:

```text
vehicle_specifications
```

Fields:

```text
id
vehicle_id
name
value
sort_order
```

Example:

```text
Engine      | 1.5L Turbo
Power       | 150 HP
Torque      | 250 Nm
Ground      | 170 mm
```

Use the approach that best fits the actual application.

For a scalable dealership system, structured fields plus flexible additional specifications can be considered.

---

# 9. FINANCING PROVIDERS

Table:

```text
financing_providers
```

Fields:

```text
id
name
description
logo_url
is_active
created_at
updated_at
```

Example:

```text
BDO
BPI
RCBC
Metrobank
Security Bank
```

Do not assume these are the dealership's actual financing partners unless configured by the administrator.

---

# 10. FINANCING RATES

Table:

```text
financing_rates
```

Fields:

```text
id
provider_id
vehicle_id nullable
interest_rate
minimum_down_payment_percent
term_months
is_active
valid_from
valid_until
created_at
updated_at
```

Relationships:

```text
financing_providers
        ↓
financing_rates
```

A financing rate may optionally be associated with a specific vehicle.

---

# 11. FINANCING TERMS

If needed, terms may be represented separately:

```text
financing_terms
```

Fields:

```text
id
provider_id
term_months
interest_rate
minimum_down_payment_percent
is_active
```

Do not duplicate information unnecessarily.

Choose one consistent financing model during implementation.

---

# 12. INQUIRIES

Table:

```text
inquiries
```

Fields:

```text
id

customer_name
customer_email
customer_phone

vehicle_id nullable

inquiry_type
message

preferred_contact_method

down_payment_amount nullable
down_payment_percent nullable
loan_term_months nullable
interest_rate nullable
financing_provider_id nullable

status

created_at
updated_at
```

---

# 13. INQUIRY TYPES

Suggested values:

```text
general
vehicle
cash_purchase
installment
financing
test_drive
trade_in
other
```

---

# 14. INQUIRY STATUS

Suggested values:

```text
new
contacted
qualified
negotiating
converted
closed
cancelled
```

The admin should be able to update these statuses.

---

# 15. ADMIN NOTES

Table:

```text
admin_notes
```

Fields:

```text
id
inquiry_id
admin_user_id
note
created_at
```

Relationship:

```text
inquiries
    ↓
admin_notes
```

Notes are internal and must never be displayed publicly to customers.

---

# 16. TEST DRIVE REQUESTS

Table:

```text
test_drive_requests
```

Fields:

```text
id

vehicle_id

customer_name
customer_email
customer_phone

preferred_date
preferred_time

message

status

created_at
updated_at
```

Status:

```text
pending
contacted
confirmed
rescheduled
completed
cancelled
```

---

# 17. ADMIN USERS

Table:

```text
admin_users
```

Possible fields:

```text
id
name
email
role
is_active
created_at
updated_at
```

If the authentication provider already manages users, do not duplicate authentication credentials in this table.

Instead, store application-specific profile/role information.

Never store plaintext passwords.

---

# 18. ADMIN ROLES

Possible roles:

```text
super_admin
admin
sales
content_manager
```

Only implement roles actually required by the dealership.

For a first version, a simple:

```text
admin
```

role may be sufficient.

---

# 19. DEALERSHIP SETTINGS

Table:

```text
dealership_settings
```

Possible fields:

```text
id

business_name
phone
email
facebook_url

address
google_maps_url

business_hours

logo_url

created_at
updated_at
```

This is the central source for dealership contact information.

---

# 20. IMPORTANT CONTACT RULE

Do NOT hard-code:

```text
Phone
Email
Facebook
Address
Business Hours
```

inside multiple frontend components.

Instead:

```text
dealership_settings
        ↓
Server/API
        ↓
Shared application data
        ↓
Header
Footer
Contact
Vehicle CTA
Inquiry
```

This ensures that an admin changing the phone number automatically updates the entire website.

---

# 21. ACTIVITY LOGS

Optional table:

```text
activity_logs
```

Fields:

```text
id
admin_user_id
action
entity_type
entity_id
metadata
created_at
```

Examples:

```text
vehicle.created
vehicle.updated
vehicle.published
vehicle.archived
inquiry.status_changed
settings.updated
```

Do not log sensitive information unnecessarily.

---

# 22. DATABASE RELATIONSHIPS

Conceptual relationship:

```text
                     ┌─────────────────────┐
                     │      VEHICLES       │
                     └──────────┬──────────┘
                                │
              ┌─────────────────┼─────────────────┐
              │                 │                 │
              ▼                 ▼                 ▼
      VEHICLE_IMAGES     VEHICLE_VIDEOS     SPECIFICATIONS
              │
              │
              ▼
        PUBLIC GALLERY


VEHICLES
   │
   ├──────────────→ INQUIRIES
   │                    │
   │                    └────→ ADMIN NOTES
   │
   └──────────────→ TEST DRIVE REQUESTS


FINANCING PROVIDERS
        │
        ▼
FINANCING RATES
        │
        ▼
    CALCULATOR


DEALERSHIP SETTINGS
        │
        ├────→ HEADER
        ├────→ FOOTER
        ├────→ CONTACT
        └────→ VEHICLE CTA
```

---

# 23. FOREIGN KEYS

Use foreign keys where relationships exist.

Examples:

```text
vehicle_images.vehicle_id
→ vehicles.id
```

```text
vehicle_videos.vehicle_id
→ vehicles.id
```

```text
inquiries.vehicle_id
→ vehicles.id
```

```text
test_drive_requests.vehicle_id
→ vehicles.id
```

```text
admin_notes.inquiry_id
→ inquiries.id
```

---

# 24. DELETE BEHAVIOR

Be careful with deletion.

For vehicles:

Prefer:

```text
archive
```

instead of permanently deleting records that may have historical inquiries.

For media:

Deleting an image should remove the media reference appropriately.

For inquiries:

Avoid permanent deletion unless explicitly required.

Historical customer interactions may be important.

---

# 25. INDEXES

Add indexes to frequently searched/filterable fields.

Potential indexes:

```text
vehicles.slug
vehicles.brand
vehicles.model
vehicles.year
vehicles.body_type
vehicles.fuel_type
vehicles.transmission
vehicles.status
vehicles.is_featured

inquiries.status
inquiries.vehicle_id
inquiries.created_at

test_drive_requests.status
test_drive_requests.vehicle_id
test_drive_requests.preferred_date
```

Do not add indexes blindly.

Review actual query patterns during implementation.

---

# 26. SLUGS

Vehicle pages should use readable URLs.

Example:

```text
/cars/byd-seal-5-dmi-dynamic
```

The slug should be unique.

Do not rely exclusively on numeric IDs in public URLs.

---

# 27. PRICING MODEL

Keep pricing data separate conceptually:

```text
SRP
Selling Price
Promo Price
```

Business rules should determine which price is currently displayed.

Do not scatter pricing logic throughout frontend components.

Create a central pricing/display rule.

---

# 28. FINANCING CALCULATIONS

The database should store the inputs needed for financing calculations.

For example:

```text
vehicle price
down payment
interest rate
term
provider
```

The calculated monthly payment does not necessarily need to be permanently stored because it can be calculated dynamically.

If an inquiry stores a financing estimate, save the relevant inputs used to generate it so the historical inquiry can be understood later.

---

# 29. MEDIA STORAGE

The database should generally store:

```text
storage path
URL/reference
metadata
```

The actual image/video binary should live in appropriate file/object storage.

Do not store large media files directly inside normal database records unless there is a specific reason.

---

# 30. VALIDATION

Database constraints should complement application validation.

Examples:

* Required vehicle name
* Valid price
* Valid year
* Valid status
* Valid foreign keys
* Unique slug
* Valid financing term
* Valid interest rate

Never rely only on frontend validation.

---

# 31. SECURITY

Public users must not be able to:

* Modify vehicles
* Modify pricing
* Access admin records
* Access internal notes
* Modify dealership settings
* Modify financing configuration

Admin operations must be authenticated and authorized.

If using Supabase:

* Configure Row Level Security where appropriate.
* Never expose service-role credentials to the browser.
* Use server-side privileged operations when required.

---

# 32. PRIVACY

Customer information includes:

```text
Name
Email
Phone
Inquiry
Financing information
```

Access must be restricted to authorized staff.

Do not expose customer data through public APIs.

---

# 33. MIGRATIONS

All schema changes should be migration-based.

Do not manually modify production database structures without a reproducible migration.

Database migrations should be:

```text
Version controlled
Reviewable
Reproducible
```

---

# 34. SEED DATA

Development should include realistic sample data.

Example vehicle:

```text
Brand:
BYD

Model:
Seal 5 DM-i

Variant:
Dynamic

Year:
2026

Price:
948000

Body:
Sedan

Fuel:
Hybrid

Transmission:
Automatic
```

Use placeholder images only during development if real dealership media has not yet been provided.

Clearly distinguish seed/demo data from real dealership inventory.

---

# 35. FUTURE SCALABILITY

The schema should allow future support for:

```text
Multiple branches
Sales agents
Customer accounts
Favorites
Vehicle comparison
Trade-ins
Financing applications
CRM
Notifications
Reports
Sales records
```

Do not prematurely implement these features.

Avoid designing the database around only one specific vehicle or one financing provider.

---

# 36. DATABASE DESIGN PRINCIPLE

Before creating the actual schema, verify:

```text
What data exists?
Who owns the data?
Who can modify it?
Who can read it?
What is the relationship?
What happens when the parent record changes?
Does the data need historical preservation?
```

The final implementation should prioritize:

```text
Consistency
Security
Maintainability
Query performance
Data integrity
Scalability
```
