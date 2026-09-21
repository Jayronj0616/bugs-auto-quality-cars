# BUGS Auto Quality Cars — UI/UX Specification

## 1. DESIGN OBJECTIVE

Create a premium, modern automotive dealership experience for:

# BUGS Auto Quality Cars

The website should communicate:

* Quality
* Trust
* Professionalism
* Modern automotive design
* Easy vehicle discovery
* Transparent pricing
* Easy financing inquiry
* Easy contact

The design should feel like a real dealership website rather than a generic template.

---

# 2. DESIGN PERSONALITY

The visual direction should be:

```text
Premium
Modern
Automotive
Clean
Confident
Professional
Visual
```

Avoid:

```text
Generic SaaS design
Excessive gradients
Excessive rounded cards
Excessive glassmorphism
Random animations
Overly colorful UI
Cluttered layouts
```

The vehicle photography should be the visual focus.

---

# 3. BRAND

Primary brand name:

```text
BUGS Auto Quality Cars
```

Use the official dealership logo when provided.

Do not create a fake official logo unless explicitly requested.

If no logo is available during development, use a clean text-based temporary mark.

---

# 4. VISUAL HIERARCHY

Vehicle imagery should receive strong visual priority.

Typical hierarchy:

```text
Vehicle Image
      ↓
Vehicle Name
      ↓
Price
      ↓
Monthly Estimate
      ↓
Specifications
      ↓
CTA
```

Do not hide pricing behind multiple clicks.

---

# 5. GLOBAL LAYOUT

Desktop:

```text
┌───────────────────────────────────────────────┐
│ Announcement / Contact Bar                   │
├───────────────────────────────────────────────┤
│ Logo │ Cars │ Financing │ About │ Contact    │
│                                  Inquire Now │
├───────────────────────────────────────────────┤
│                                               │
│                  CONTENT                      │
│                                               │
├───────────────────────────────────────────────┤
│ Footer                                        │
└───────────────────────────────────────────────┘
```

Mobile:

```text
┌──────────────────────────┐
│ Logo          ☰          │
├──────────────────────────┤
│                          │
│        CONTENT           │
│                          │
└──────────────────────────┘
```

---

# 6. HEADER

Header should contain:

* BUGS Auto Quality Cars logo/name
* Cars
* Financing
* About
* Contact
* Primary inquiry CTA

Optional contact shortcuts:

* Phone
* Facebook

Desktop header should remain clean.

Mobile should use a drawer/menu.

Header should support a sticky mode if it improves UX.

Do not make the header unnecessarily tall.

---

# 7. HOMEPAGE HERO

The hero should immediately communicate that this is an automotive dealership.

Recommended structure:

```text
┌──────────────────────────────────────────────┐
│                                              │
│       [Large Car Image / Video]              │
│                                              │
│       FIND YOUR NEXT CAR                     │
│                                              │
│       Quality Cars.                         │
│       Transparent Deals.                    │
│                                              │
│       [Browse Cars] [Inquire Now]            │
│                                              │
└──────────────────────────────────────────────┘
```

Alternative:

Feature a specific vehicle:

```text
2026 BYD Seal 5 DM-i

Starting at ₱948,000

[View Vehicle]
[Calculate Payment]
```

Hero should have subtle entrance animation.

---

# 8. FEATURED VEHICLES

Section:

```text
Featured Vehicles
Find your next vehicle from our latest selection.
```

Vehicle cards should show:

```text
┌────────────────────────────┐
│                            │
│       Vehicle Image        │
│                            │
├────────────────────────────┤
│ 2026                       │
│ BYD Seal 5 DM-i            │
│ Dynamic                    │
│                            │
│ ₱948,000                   │
│ From ₱XX,XXX/month         │
│                            │
│ [View Vehicle]             │
└────────────────────────────┘
```

Hover:

* Slight image zoom
* Subtle card movement
* CTA emphasis

Do not make cards jump dramatically.

---

# 9. VEHICLE INVENTORY PAGE

Route:

```text
/cars
```

Layout:

```text
Cars
────────────────────────────

Search

Filters
────────────────────────────
Brand
Model
Price
Monthly Payment
Body Type
Fuel
Transmission
Condition

Sort

────────────────────────────
Vehicle Grid
```

Desktop:

```text
Filters │ Vehicle Grid
        │ Vehicle Grid
        │ Vehicle Grid
```

Mobile:

```text
Search

[Filters]

[Sort]

Vehicle
Vehicle
Vehicle
```

Filters should become a drawer/modal on mobile.

---

# 10. VEHICLE CARD

Required:

* Main image
* Brand
* Model
* Variant
* Year
* Price
* Monthly estimate
* Key specifications
* Availability
* Badge where appropriate

Badges:

```text
NEW
FEATURED
PROMO
LOW DOWN PAYMENT
RESERVED
SOLD
```

Avoid excessive badges.

---

# 11. VEHICLE DETAILS PAGE

This should be one of the most visually impressive pages.

Structure:

```text
Breadcrumb
       ↓
Vehicle Hero
       ↓
Gallery
       ↓
Vehicle Summary
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

---

# 12. VEHICLE HERO

Desktop:

```text
┌─────────────────────┬──────────────────────┐
│                     │                      │
│   Large Vehicle     │  2026                │
│      Image          │  BYD Seal 5 DM-i     │
│                     │  Dynamic             │
│                     │                      │
│                     │  ₱948,000            │
│                     │                      │
│                     │ [Inquire Now]        │
└─────────────────────┴──────────────────────┘
```

Mobile:

```text
Vehicle Image

2026 BYD Seal 5 DM-i
Dynamic

₱948,000

[Inquire Now]
```

---

# 13. IMAGE GALLERY

Support:

* Large primary image
* Thumbnail strip
* Fullscreen mode
* Zoom
* Swipe on mobile
* Keyboard navigation where appropriate

Image categories:

```text
Exterior
Interior
Dashboard
Engine
Features
Other
```

Use smooth transitions.

---

# 14. VIDEO SECTION

Title:

```text
See It In Action
```

Support:

* Walkaround
* Interior
* Driving
* Feature demonstration

Video should be lazy-loaded when possible.

For external videos:

* Display thumbnail first
* Load player after interaction

Avoid automatically loading multiple video players.

---

# 15. CASH / INSTALLMENT SWITCHER

Use a clear segmented control:

```text
┌───────────────┬──────────────────┐
│     CASH      │   INSTALLMENT    │
└───────────────┴──────────────────┘
```

Cash:

```text
Cash Price

₱948,000

[Inquire About Cash Purchase]
```

Installment:

```text
Vehicle Price
₱948,000

Down Payment
20%

Loan Term
60 months

Interest Rate
7.5%

Estimated Monthly
₱XX,XXX
```

The transition between states should be smooth but fast.

---

# 16. FINANCING CALCULATOR UX

Use clear inputs.

Example:

```text
Vehicle Price
[ ₱948,000 ]

Down Payment
[ 20% ] [ ₱189,600 ]

Loan Term
[ 60 months ▼ ]

Interest Rate
[ 7.5% ]

────────────────

Estimated Monthly Payment

₱XX,XXX / month

[Ask About Financing]
```

The estimated payment should update immediately when appropriate.

Do not use unnecessary animation that makes the calculator feel slow.

---

# 17. SPECIFICATIONS

Display specifications in a clean grid.

Example:

```text
ENGINE
1.5L

TRANSMISSION
Automatic

FUEL
Hybrid

DRIVE
FWD

SEATING
5

POWER
XX HP
```

Use icons sparingly.

---

# 18. INQUIRY CTA

Use strong CTA sections.

Example:

```text
Interested in this vehicle?

Talk to BUGS Auto Quality Cars.

[Inquire Now]
[Book a Test Drive]
[Call Us]
```

The selected vehicle should automatically be attached to the inquiry.

---

# 19. INQUIRY FORM UX

Use a clean form.

Group information:

### Personal Information

```text
Full Name
Mobile
Email
```

### Vehicle

```text
Vehicle
Variant
```

### Inquiry

```text
Inquiry Type
Message
```

### Financing

Only show financing-related fields when installment/financing is selected.

This prevents the form from becoming unnecessarily long.

---

# 20. CONTACT PAGE

Route:

```text
/contact
```

Structure:

```text
Contact BUGS Auto Quality Cars

Phone
Email
Facebook

Address
Map

Business Hours

Contact Form
```

Use clickable actions:

```text
[Call]
[Email]
[Facebook]
[Get Directions]
```

---

# 21. DEALERSHIP CONTACT

Contact information should come from the database/settings.

Never hard-code it into individual pages.

Use:

```text
Phone
Email
Facebook
Address
Google Maps
Business Hours
```

through a shared dealership-settings system.

---

# 22. FOOTER

Footer sections:

```text
BUGS Auto Quality Cars

Cars
Financing
About
Contact

Contact
Phone
Email
Facebook

Location
Address

Business Hours

© BUGS Auto Quality Cars
```

Use subtle visual separation.

---

# 23. ADMIN DASHBOARD UI

The admin interface should prioritize productivity.

Desktop:

```text
┌─────────────┬─────────────────────────────┐
│             │                             │
│ Sidebar     │ Dashboard                   │
│             │                             │
│ Dashboard   │ Statistics                  │
│ Vehicles    │                             │
│ Inquiries   │ Recent Inquiries            │
│ Test Drives │                             │
│ Financing   │ Recent Vehicles             │
│ Settings    │                             │
│             │                             │
└─────────────┴─────────────────────────────┘
```

Mobile:

```text
Top bar
     ↓
Menu drawer
     ↓
Dashboard
```

---

# 24. ADMIN DASHBOARD CARDS

Examples:

```text
Total Vehicles
124

Available
98

New Inquiries
17

Pending Test Drives
5
```

Cards should be informative rather than decorative.

---

# 25. ADMIN VEHICLE LIST

Columns:

```text
Image
Vehicle
Year
Price
Status
Featured
Updated
Actions
```

Actions:

```text
View
Edit
Duplicate
Publish / Unpublish
Archive
```

Use confirmation for destructive actions.

---

# 26. ADMIN VEHICLE FORM

Organize into sections rather than one enormous form.

### Basic Information

```text
Brand
Model
Variant
Year
Condition
Body Type
```

### Pricing

```text
SRP
Selling Price
Promo Price
```

### Specifications

```text
Engine
Transmission
Fuel
Drive
Seating
Power
Torque
```

### Media

```text
Images
Videos
```

### Financing

```text
Provider
Interest Rate
Terms
Minimum Down Payment
```

### Publishing

```text
Status
Featured
Promo
```

---

# 27. MEDIA MANAGER

Images should support:

* Drag/reorder
* Primary image
* Category
* Delete
* Preview

The primary image should be clearly identified.

---

# 28. INQUIRY TABLE

Display:

```text
Customer
Vehicle
Type
Phone
Date
Status
```

Allow:

* Search
* Filter
* Sort
* Open
* Update status

---

# 29. ANIMATION PRINCIPLES

Use animation to improve:

* Hierarchy
* Feedback
* Navigation
* Perceived quality

Do not animate purely for decoration.

Recommended:

```text
Hero:
Fade + slide

Cards:
Image scale

Sections:
Scroll reveal

Buttons:
Subtle hover

Gallery:
Smooth transition

Modal:
Fade + scale

Sidebar:
Slide
```

---

# 30. REDUCED MOTION

Respect:

```text
prefers-reduced-motion
```

When reduced motion is enabled:

* Remove large transitions
* Remove unnecessary movement
* Keep functional feedback

---

# 31. RESPONSIVE DESIGN

Desktop:

```text
1920
1440
1280
```

Tablet:

```text
1024
768
```

Mobile:

```text
430
390
375
```

Vehicle cards should adapt from:

```text
4 columns
→
3 columns
→
2 columns
→
1 column
```

depending on viewport.

---

# 32. MOBILE PRIORITIES

On mobile, prioritize:

1. Vehicle image
2. Vehicle name
3. Price
4. Monthly estimate
5. Inquiry button
6. Test-drive button
7. Specifications

Consider a sticky bottom CTA on vehicle details:

```text
[Call] [Inquire]
```

Do not allow it to cover important content.

---

# 33. ACCESSIBILITY

Implement:

* Semantic HTML
* Keyboard navigation
* Focus states
* Labels
* Alt text
* Accessible dialogs
* Accessible menus
* Accessible forms
* Proper contrast
* Reduced motion

---

# 34. PERFORMANCE UX

Users should never stare at a blank page while content loads.

Use:

* Skeletons
* Progressive image loading
* Optimized images
* Lazy loading
* Proper caching

Avoid unnecessary spinners.

---

# 35. DESIGN PRINCIPLE

The website should make a customer think:

> "I can easily find the car I want, understand the price, estimate the payment, and contact the dealership."

The admin should think:

> "I can easily manage the dealership from here."

Every screen should have a clear purpose and next action.
