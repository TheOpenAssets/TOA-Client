1. The Logic Flow (Step-by-Step)

This flow is designed to verify the user's identity before they are allowed to interact with the blockchain or access the dashboard.

Phase 1: The Application (Web2)

User Action: User clicks "Issue an Asset" on the Landing Page.

System Action: Opens the Typeform.

Data Collection: User enters Name, Company, Asset Type, Location.

Submission: User hits "Submit".

Backend Magic: The system receives the data. It creates a "Pending Issuer" record in your database and generates a unique, one-time Secure Token.

Email: The system sends an email to the user: "Welcome [Name], click here to complete your issuer verification." This link looks like: platform.com/onboarding?token=xyz123.

Phase 2: The Bridge (Email to Auth)

User Action: User opens email and clicks the link.

System Action: The user is taken to a dedicated Onboarding Page.

Validation: The page reads the ?token=xyz123 from the URL to know exactly who this user is (e.g., "Oh, this is John from ABC Corp who applied 10 minutes ago").

Phase 3: The Binding (Connecting Identity to Wallet)

Step A (Wallet): The page prompts: "Connect your Wallet to link it to your account."

Why? You need to permanently link their physical identity (John) to their crypto identity (Wallet 0x123...).

Step B (KYC): Once the wallet is connected, the KYC (Know Your Customer) widget opens (using a service like Sumsub or a simple document upload form).

Completion: Once KYC is approved, the system updates the database:

Status: changed from "Pending" to "Approved".

Wallet Address: Whitelisted.

Phase 4: Access

Redirect: The user is automatically forwarded to the Issuer Dashboard (the wireframe you shared).

2. Prompt for the AI (The Onboarding Page)

Since the previous prompt focused on the Dashboard, you need a specific prompt for this Onboarding Page that handles the email link and wallet connection.

Copy/Paste this below the previous prompt or as a new task:

Task: Build the "Issuer Onboarding & Verification" Page

Context: This page is the destination where users land after clicking the "Verify Account" link sent to their email. The URL will contain a token (e.g., /onboarding?token=xyz).

User Flow on this Page:

On Load: The page should read the token from the URL parameters to validate the user session.

Step 1 - Wallet Connection:

Display a clean UI with a message: "Welcome, [Company Name]. Please connect your wallet to continue."

Show a standard "Connect Wallet" button (Wagmi/RainbowKit).

Logic: Once connected, store the wallet address in state.

Step 2 - Identity Verification (KYC):

Unlock this step only after the wallet is connected.

Show a mock "Start KYC" button.

Logic: When clicked, simulate a verification process (loader for 3 seconds -> Success).

Step 3 - Finalization:

Once KYC is successful, show a "Go to Dashboard" button.

Action: Redirect the user to /dashboard.

UI Requirements:

Clean, centered card layout.

Stepper component at the top showing: "Email Verified" (Checked) -> "Connect Wallet" (Active) -> "KYC" (Pending).

Use the same styling/theme as the Landing Page.

Summary of How the Components Connect

Landing Page:

Button 1 (New): Goes to Typeform -> Triggers Email.

Button 2 (Existing): "Already an Issuer" -> Checks Wallet -> Goes to Dashboard.

Email Link: Goes to Onboarding Page (The prompt above).

Onboarding Page: Connects Wallet + KYC -> Redirects to Dashboard.

Dashboard: The main view (Wireframe) where they manage assets




////

ISSUER DASH 

I am building an Issuer Dashboard for a Real World Asset (RWA) platform. I need a React frontend that handles wallet-based authentication and displays a specific dashboard layout based on the attached wireframe.

Tech Stack: React, Tailwind CSS, Web3 (Wagmi/Ethers for wallet connection).

Requirement 1: Authentication & Routing Logic On the Landing Page, please implement two distinct flows:

New User ("Issue an Asset"): If the user clicks this, they are redirected to a basic Typeform (External Link). Note: Do not build this form, just handle the button/redirect.

Existing User ("Already an Issuer"):

This button triggers a Wallet Connection (Connect Wallet).

Logic: Upon connection, check the wallet address against a mock database/list of approved issuers.

Condition A: If the wallet is recognized (Existing User) -> Redirect immediately to the Issuer Dashboard.

Condition B: If the wallet is NOT recognized -> Redirect to the identity verification/onboarding flow.

Requirement 2: The Issuer Dashboard UI (See Wireframe) Create a responsive React page that matches the attached wireframe layout. It must include:

A. Header/Nav:

A "Create" or "+" circular button in the top right.

Action: When this "+" button is clicked, it should open a modal or redirect to this specific Asset Onboarding Typeform: https://form.typeform.com/to/y0BQnYxs

B. Overview Section (Top Row): Render 4 statistic cards with the following labels:

Total Assets (e.g., 12)

Funds Raised (e.g., $1.2M)

Assets Pending (e.g., 2)

Settled Assets (e.g., 5)

C. "My Assets" Section (Main List): A list/table view showing the user's uploaded assets. Each row should display:

Asset Name

Token Info: Display "Tokens held by user" vs. "Total Platform Minted" (e.g., User holds 200 / 1000 Total).

Unsold/Claimable: Calculate and show tokens remaining unsold.

Loan Availability: A calculated field showing "Current Loan Worth" based on the unsold tokens.

Status Badge: Use color-coded badges for these statuses: Pending, Registered, Listed, Partially Sold, Settled.

Design Note: Keep the design clean, professional, and consistent with a financial dashboard. Use a grid layout for the cards and a styled table/list for the assets.