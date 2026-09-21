# BUGS Auto Quality Cars — System Flow

## 1. PURPOSE

This document defines how the BUGS Auto Quality Cars platform should work from a business and user-flow perspective.

The system has two primary areas:

1. Public Customer Website
2. Protected Admin Dashboard

The public website is focused on vehicle discovery, financing estimates, inquiries, and test-drive requests.

The admin dashboard is focused on managing vehicles, media, pricing, financing, inquiries, test drives, and dealership information.

---

# 2. HIGH-LEVEL SYSTEM

```text
                         BUGS AUTO QUALITY CARS
                                  │
                 ┌────────────────┴────────────────┐
                 │                                 │
                 ▼                                 ▼
          PUBLIC WEBSITE                     ADMIN DASHBOARD
                 │                                 │
        ┌────────┼────────┐                ┌───────┼────────┐
        │        │        │                │       │        │
        ▼        ▼        ▼                ▼       ▼        ▼
      Cars   Financing Contact          Vehicles Inquiries Settings
        │        │        │                │       │        │
        └────────┼────────┘                └───────┼────────┘
                 │                                 │
                 └──────────────┬──────────────────┘
                                ▼
                           DATABASE
```

---

# 3. USER TYPES

## Customer

Customers do not need an account to:

* Browse vehicles
* Search vehicles
* Filter vehicles
* View vehicle details
* View photos
* Watch videos
* Calculate financing
* Submit inquiries
* Request a quotation
* Request a test drive
* Contact the dealership

---

## Administrator

Administrators can:

* Log in
* View dashboard
* Manage vehicles
* Manage vehicle media
* Manage vehicle specifications
* Manage pricing
* Manage promotions
* Manage financing settings
* View inquiries
* Update inquiry status
* Add internal notes
* Manage test drives
* Manage dealership contact information
* Manage social media information
* Manage business hours
* Manage website settings

---

# 4. CUSTOMER JOURNEY

The primary customer journey should be:

```text
Homepage
   ↓
Discover Vehicle
   ↓
Inventory
   ↓
Filter / Search
   ↓
Vehicle Details
   ↓
Photos / Videos / Specifications
   ↓
Cash OR Installment
   ↓
Financing Calculator
   ↓
Inquire / Request Quote / Test Drive
   ↓
Customer Form
   ↓
Submit
   ↓
Confirmation
   ↓
Inquiry appears in Admin Dashboard
```

---

# 5. HOMEPAGE FLOW

```text
Customer enters website
        ↓
Hero section
        ↓
Featured vehicles
        ↓
Browse inventory
        ↓
Why choose BUGS Auto Quality Cars
        ↓
Financing CTA
        ↓
Customer testimonials/content
        ↓
Contact CTA
        ↓
Footer
```

Primary homepage actions:

* Browse Cars
* View Featured Vehicle
* Calculate Financing
* Inquire Now
* Contact Dealership

---

# 6. INVENTORY FLOW

Route:

```text
/cars
```

Flow:

```text
Inventory
   ↓
Search
   ↓
Apply filters
   ↓
Sort
   ↓
Vehicle cards
   ↓
Select vehicle
   ↓
Vehicle Details
```

Filters may include:

* Brand
* Model
* Year
* Price
* Monthly payment
* Body type
* Fuel type
* Transmission
* Condition
* Availability
* Featured
* Promotional vehicles

The inventory must support an empty state.

Example:

```text
No vehicles found.

Try changing your filters or search.
```

---

# 7. VEHICLE DETAILS FLOW

Route:

```text
/cars/[slug]
```

Flow:

```text
Vehicle Details
       ↓
Vehicle Gallery
       ↓
Vehicle Information
       ↓
Cash / Installment
       ↓
Financing Calculator
       ↓
Specifications
       ↓
Features
       ↓
Video
       ↓
Inquiry CTA
       ↓
Test Drive CTA
       ↓
Related Vehicles
```

The vehicle page should always make the next action obvious.

Primary CTA:

```text
Inquire Now
```

Secondary CTAs:

```text
Calculate Payment
Book Test Drive
Call Us
Facebook
```

---

# 8. CASH PURCHASE FLOW

Customer selects:

```text
CASH
```

Display:

```text
Vehicle Price
SRP
Discount
Promo Price
```

If additional estimated fees are configured:

```text
Vehicle Price
+
Estimated Fees
=
Estimated Total
```

Do not imply that displayed fees are final unless they are explicitly configured as final dealership charges.

CTA:

```text
Inquire About This Vehicle
```

---

# 9. INSTALLMENT FLOW

Customer selects:

```text
INSTALLMENT
```

System displays:

```text
Vehicle Price
        ↓
Down Payment
        ↓
Amount Financed
        ↓
Interest Rate
        ↓
Loan Term
        ↓
Estimated Monthly Payment
```

Inputs:

* Vehicle price
* Down-payment percentage or amount
* Loan term
* Interest rate
* Financing provider

Example:

```text
Vehicle Price       ₱948,000

Down Payment        ₱189,600
20%

Amount Financed     ₱758,400

Interest Rate       7.5%

Term                60 months

Estimated Monthly
₱15,xxx
```

The system must clearly state:

> Estimated monthly payment only. Actual financing rates, terms, fees, and approval depend on the financing provider and applicant qualifications.

---

# 10. FINANCING CALCULATION

The system should use a clearly defined calculation method.

For an amortized loan:

```text
P = principal

r = annual interest rate / 12

n = number of monthly payments

Monthly Payment =
P × r × (1 + r)^n
-------------------
(1 + r)^n - 1
```

If the interest rate is zero:

```text
Monthly Payment =
Principal / Number of Months
```

All calculations should handle:

* Zero interest
* Minimum down payment
* Maximum loan term
* Invalid values
* Values exceeding vehicle price
* Decimal rounding

The displayed value is an estimate.

---

# 11. INQUIRY FLOW

Inquiry can begin from:

* Homepage
* Vehicle card
* Vehicle details
* Financing calculator
* Contact page
* Test-drive flow

Example:

```text
Vehicle Details
      ↓
Inquire Now
      ↓
Inquiry Form
```

The selected vehicle should automatically be attached to the inquiry.

---

# 12. INQUIRY FORM

Required fields:

```text
Full Name
Mobile Number
Email
Vehicle
Inquiry Type
Message
```

Optional fields:

```text
Preferred Contact Method
Down Payment
Loan Term
Financing Provider
Preferred Contact Date
```

Inquiry types:

```text
General Inquiry
Vehicle Inquiry
Cash Purchase
Installment
Financing
Test Drive
Trade-In
Other
```

---

# 13. INQUIRY SUBMISSION

```text
Customer fills form
       ↓
Client validation
       ↓
Server validation
       ↓
Database
       ↓
Success response
       ↓
Customer confirmation
       ↓
Admin dashboard
```

Never trust client-side validation alone.

---

# 14. CUSTOMER CONFIRMATION

After successful submission:

```text
Thank You!

Your inquiry has been received.

A BUGS Auto Quality Cars representative will contact you regarding your inquiry.

[Continue Browsing Cars]
```

The system should not promise a specific response time unless configured by the dealership.

---

# 15. TEST DRIVE FLOW

```text
Vehicle Details
      ↓
Book Test Drive
      ↓
Customer Information
      ↓
Preferred Date
      ↓
Preferred Time
      ↓
Submit
      ↓
Admin Review
      ↓
Pending
      ↓
Confirmed / Rescheduled / Cancelled
      ↓
Completed
```

Test-drive statuses:

```text
Pending
Contacted
Confirmed
Rescheduled
Completed
Cancelled
```

---

# 16. ADMIN LOGIN FLOW

```text
/admin/login
      ↓
Authentication
      ↓
Authorization
      ↓
Admin Dashboard
```

Unauthorized users must not access protected admin pages.

---

# 17. ADMIN DASHBOARD FLOW

Dashboard should provide an overview:

```text
Total Vehicles
Available Vehicles
Featured Vehicles
Sold Vehicles

New Inquiries
Pending Inquiries
Pending Test Drives

Recent Inquiries
Recent Vehicles
Recent Activity
```

The dashboard is an overview, not the place for every management function.

---

# 18. VEHICLE MANAGEMENT FLOW

```text
Admin Dashboard
      ↓
Vehicles
      ↓
Vehicle List
      ↓
Add / Edit Vehicle
      ↓
Basic Information
      ↓
Pricing
      ↓
Specifications
      ↓
Images
      ↓
Videos
      ↓
Financing
      ↓
Preview
      ↓
Publish
```

---

# 19. VEHICLE CREATION

Required information should include:

```text
Brand
Model
Variant
Year
Condition
Body Type
Fuel Type
Transmission
Price
Availability
```

Optional:

```text
Mileage
Drive Type
Seating Capacity
Description
Features
Promo
Financing
```

---

# 20. VEHICLE STATUS

Vehicles may have statuses such as:

```text
Draft
Published
Reserved
Sold
Archived
```

Only published vehicles should normally appear in the public inventory.

---

# 21. MEDIA MANAGEMENT FLOW

```text
Vehicle
   ↓
Media
   ↓
Upload Image
   ↓
Validate File
   ↓
Store File
   ↓
Create Database Record
   ↓
Assign Category
   ↓
Set Primary Image
```

Image categories:

```text
Exterior
Interior
Dashboard
Engine
Features
Other
```

Images should be reorderable.

---

# 22. VIDEO FLOW

Videos may be:

* YouTube
* Other supported external video URL
* Uploaded video if supported

Each video should have:

```text
Title
URL
Type
Thumbnail
Sort Order
```

Video types:

```text
Walkaround
Interior
Exterior
Driving
Features
Promotion
Other
```

---

# 23. INQUIRY ADMIN FLOW

```text
Admin
 ↓
Inquiries
 ↓
Filter/Search
 ↓
Open Inquiry
 ↓
View Customer
 ↓
View Vehicle
 ↓
View Financing Information
 ↓
Add Internal Note
 ↓
Update Status
```

Inquiry statuses:

```text
New
Contacted
Qualified
Negotiating
Converted
Closed
Cancelled
```

---

# 24. TEST DRIVE ADMIN FLOW

```text
Admin
 ↓
Test Drives
 ↓
View Request
 ↓
Review Vehicle
 ↓
Review Customer
 ↓
Confirm / Reschedule / Cancel
 ↓
Update Status
```

---

# 25. DEALERSHIP SETTINGS FLOW

Admin:

```text
Settings
   ↓
Dealership Information
```

Manage:

```text
Business Name
Phone
Email
Facebook URL
Address
Google Maps URL
Business Hours
Logo
Social Links
```

The public website consumes these settings dynamically.

Do not hard-code contact information in multiple components.

---

# 26. CONTACT FLOW

Public:

```text
Contact
   ↓
Dealership Information
   ↓
Phone
Email
Facebook
Address
Map
Business Hours
   ↓
Contact Form
```

Phone should use:

```text
tel:
```

Email should use:

```text
mailto:
```

Facebook should open the configured Facebook Page.

---

# 27. DATA FLOW

General pattern:

```text
PUBLIC UI
    ↓
Server/API
    ↓
Validation
    ↓
Database
    ↓
Response
    ↓
UI
```

Admin:

```text
ADMIN UI
    ↓
Authentication
    ↓
Authorization
    ↓
Server/API
    ↓
Validation
    ↓
Database
    ↓
Response
    ↓
Admin UI
```

Never expose privileged database credentials to the browser.

---

# 28. ERROR FLOWS

Every important flow must have:

### Loading

```text
Loading...
```

### Empty

```text
No results found.
```

### Validation error

```text
Please correct the highlighted fields.
```

### Server error

```text
Something went wrong.
Please try again.
```

### Network error

```text
Unable to connect.
Please check your connection and try again.
```

---

# 29. FUTURE-READY FLOWS

The architecture should allow future implementation of:

* Customer accounts
* Favorites
* Vehicle comparison
* Trade-in valuation
* Online financing applications
* Sales agent assignment
* Email notifications
* SMS notifications
* CRM
* Multiple dealership branches
* Reports
* Sales analytics

These should not be implemented unless requested.

---

# 30. SYSTEM PRINCIPLE

Every major feature should answer:

```text
Who uses it?
What data does it require?
What happens after submission?
Where is the data stored?
Who can access it?
What happens if something fails?
```

The goal is a connected system rather than isolated pages.

---

# 31. DEFINITION OF A COMPLETE FLOW

A feature is not considered complete merely because its UI exists.

For example:

```text
Inquiry Form
```

is incomplete if it does not:

```text
Validate
→ Save
→ Return result
→ Show confirmation
→ Appear in Admin
```

Similarly:

```text
Add Vehicle
```

is incomplete if it does not:

```text
Validate
→ Save
→ Upload media
→ Publish
→ Appear in inventory
→ Appear on vehicle page
```
