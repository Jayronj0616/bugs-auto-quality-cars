# BUGS Auto Quality Cars — Technical Stack

## REQUIRED STACK

This project must use the following technology stack unless there is a compelling technical reason that requires discussion:

### Frontend

* Next.js
* React
* TypeScript
* Tailwind CSS

Use the current stable Next.js architecture appropriate for the project, preferably the App Router.

Use TypeScript throughout the application.

Do not introduce JavaScript files for application logic unless there is a specific reason.

---

# BACKEND / DATA

Use:

* Supabase
* PostgreSQL
* Supabase Auth
* Supabase Storage

Supabase should be the primary backend/data platform.

Do not introduce a separate Express.js backend unless a future requirement genuinely requires it.

The Next.js application should communicate with Supabase using appropriate server/client patterns.

---

# SUPABASE RESPONSIBILITIES

Use Supabase for:

```text
Database
    ↓
PostgreSQL

Authentication
    ↓
Admin login

Storage
    ↓
Vehicle images
Vehicle media

Security
    ↓
Row Level Security
```

---

# DATABASE

The primary database is:

```text
Supabase PostgreSQL
```

Use proper relational database design.

Follow:

```text
docs/04-DATABASE.md
```

for the initial schema requirements.

Database changes must use migrations where appropriate.

Do not hardcode dealership inventory into frontend components.

---

# SUPABASE STORAGE

Use Supabase Storage for vehicle media.

Recommended conceptual structure:

```text
vehicle-media/
    vehicles/
        {vehicle-id}/
            images/
            videos/
```

The exact bucket/folder implementation may be adjusted based on Supabase best practices.

Store media references/metadata in PostgreSQL.

Do not store large image/video binaries directly in database rows.

---

# AUTHENTICATION

Use Supabase Auth for administrator authentication.

The initial system should support:

```text
Admin Login
    ↓
Supabase Auth
    ↓
Authenticated Admin
    ↓
Protected Admin Routes
```

Do not create a custom password authentication system.

Never store plaintext passwords.

---

# AUTHORIZATION

Authentication and authorization are separate concerns.

A user being authenticated does not automatically mean they should have access to every admin operation.

Use appropriate:

* Supabase Row Level Security
* Server-side authorization
* Admin role/profile data

for protected operations.

---

# ROW LEVEL SECURITY

Supabase Row Level Security must be considered part of the application architecture.

Public users should be able to access only data intentionally exposed to the public website.

Examples:

Public:

```text
Published vehicles
Public vehicle images
Public vehicle videos
Public specifications
Public dealership information
```

Private:

```text
Customer inquiries
Customer phone numbers
Customer emails
Internal admin notes
Admin settings
Private financing configuration
Admin users
```

Do not rely solely on frontend hiding.

Security must be enforced at the backend/database level.

---

# NEXT.JS ARCHITECTURE

Use the Next.js App Router.

Conceptually:

```text
app/
│
├── page.tsx
│
├── cars/
│   ├── page.tsx
│   └── [slug]/
│       └── page.tsx
│
├── financing/
│   └── page.tsx
│
├── contact/
│   └── page.tsx
│
└── admin/
    ├── login/
    │   └── page.tsx
    │
    ├── page.tsx
    ├── vehicles/
    ├── inquiries/
    ├── test-drives/
    ├── financing/
    └── settings/
```

The exact folder structure may be improved if required by the implementation.

---

# COMPONENT ARCHITECTURE

Use reusable React components.

Possible structure:

```text
components/
│
├── layout/
├── navigation/
├── vehicles/
├── financing/
├── inquiries/
├── forms/
├── admin/
├── media/
└── ui/
```

Do not put the entire website into one large component.

---

# SUPABASE CLIENT ARCHITECTURE

Separate Supabase usage appropriately for:

```text
Browser
Server Components
Server Actions
Route Handlers
```

Do not expose privileged credentials to the browser.

The Supabase service-role key must NEVER be included in client-side code.

Only public/client-safe Supabase configuration may be exposed to the browser.

---

# ENVIRONMENT VARIABLES

Use environment variables.

Conceptually:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

The exact variables should follow the current Supabase/Next.js recommended implementation.

Never commit:

```text
.env
.env.local
production secrets
service-role keys
```

to Git.

Provide:

```text
.env.example
```

with safe placeholder values.

---

# DATA FLOW

Public vehicle:

```text
Next.js
    ↓
Supabase
    ↓
PostgreSQL
    ↓
Vehicle data
    ↓
React UI
```

Vehicle media:

```text
Supabase Storage
    ↓
Public/signed media URL
    ↓
Next.js
    ↓
Vehicle Gallery
```

Inquiry:

```text
Customer
    ↓
Next.js form
    ↓
Server-side validation
    ↓
Supabase
    ↓
PostgreSQL
    ↓
Admin Dashboard
```

Admin vehicle creation:

```text
Admin
    ↓
Next.js Admin UI
    ↓
Authentication
    ↓
Authorization
    ↓
Supabase
    ↓
PostgreSQL
    +
Supabase Storage
    ↓
Published Vehicle
    ↓
Public Website
```

---

# FORMS

Use TypeScript-safe form handling.

Forms must have:

```text
Client validation
Server validation
Error handling
Loading state
Success state
```

Never trust client-side validation alone.

---

# FINANCING CALCULATOR

The financing calculator can run primarily on the client because it is a calculation rather than sensitive data access.

However, when submitting a financing inquiry, the relevant values must be validated server-side before being stored.

---

# IMAGE OPTIMIZATION

Use Next.js image optimization where appropriate.

Vehicle images should:

* Have meaningful alt text
* Be appropriately sized
* Use responsive loading
* Lazy-load when appropriate
* Avoid loading unnecessary high-resolution images

Do not load every vehicle image on the page immediately.

---

# VIDEO

Vehicle videos should support external video providers where practical.

For example:

```text
YouTube
```

can be stored as a configured URL.

If uploaded videos are implemented through Supabase Storage, consider file size, bandwidth, and hosting limitations before implementing large video uploads.

Do not automatically load multiple large videos on the inventory page.

---

# STYLING

Use:

```text
Tailwind CSS
```

for the primary styling system.

Create reusable design patterns instead of repeating large amounts of CSS.

The UI should follow:

```text
docs/03-UI_UX.md
```

---

# ANIMATION

Use a lightweight animation solution only where it materially improves the UX.

Animations should not compromise:

* Performance
* Accessibility
* Mobile usability

Respect:

```text
prefers-reduced-motion
```

---

# ICONS

Use an established icon library if the project needs one.

Do not manually create dozens of SVG icons unless necessary.

Keep icon usage consistent throughout the application.

---

# ADMIN DASHBOARD

The admin dashboard must be part of the same Next.js application unless there is a compelling reason otherwise.

Example:

```text
/admin
/admin/vehicles
/admin/inquiries
/admin/test-drives
/admin/financing
/admin/settings
```

Admin routes must be protected.

---

# SEO

Use Next.js metadata functionality.

Vehicle pages should generate appropriate metadata from vehicle data.

Example:

```text
Title:
2026 BYD Seal 5 DM-i Dynamic | BUGS Auto Quality Cars

Description:
Explore the 2026 BYD Seal 5 DM-i Dynamic...
```

Do not hardcode metadata for every vehicle.

---

# DEPLOYMENT TARGET

The preferred deployment architecture is:

```text
GitHub
   ↓
Vercel
   ↓
Next.js

Supabase
   ↓
Database
Auth
Storage
```

The architecture should remain portable enough that it is not unnecessarily locked to one hosting provider.

---

# DEVELOPMENT PRINCIPLE

Use the simplest architecture that properly supports the requirements.

Do NOT add:

```text
Express
Separate Node backend
Redis
Microservices
Docker infrastructure
Extra databases
```

unless there is an actual requirement that justifies them.

The goal is a maintainable:

```text
Next.js
+
React
+
TypeScript
+
Tailwind
+
Supabase
```

application.

---

# FINAL STACK

The intended architecture is:

```text
                    BUGS AUTO QUALITY CARS

                         Next.js
                            │
                    ┌───────┴───────┐
                    │               │
                  React         TypeScript
                    │
                Tailwind CSS
                    │
                    ▼
                 Supabase
                    │
        ┌───────────┼────────────┐
        │           │            │
        ▼           ▼            ▼
    PostgreSQL     Auth        Storage
        │           │            │
        │           │            │
    Vehicles      Admin      Car Images
    Inquiries     Login       Car Videos
    Test Drives
    Settings
    Financing
```

This stack is the default implementation target for the entire project.
