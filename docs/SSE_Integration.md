# Frontend Guide: Integrating the Real-Time Event Stream

## The Vision: From Asynchronous to Instant

Our backend handles complex, asynchronous operations—on-chain transactions, backend jobs, and compliance checks. These processes take time, but the user experience must feel instant and reliable.

The Event Stream (Server-Sent Events, or SSE) is the bridge that makes this possible. It provides a real-time communication channel that signals when important events have occurred, transforming a delayed system into one that feels alive and responsive.

When integrated correctly, the user will never have to wonder, “Did my transaction go through, or is the app just lagging?” This guide explains how to build that trust.

---

## System Overview: Signal vs. Source of Truth

Every significant event in our system, whether it's an asset status change, a new bid, or a KYC update, does two things:

1.  It is persisted as a notification document in our MongoDB database.
2.  It is immediately pushed to the user over a real-time event stream.

This leads to the single most important principle of this integration:

> **The REST API is the source of truth. The event stream is a signal that the truth has changed.**

The stream augments the API; it does not replace it. It tells the frontend *when* to ask for new information, but not necessarily *what* that new information is.

---

## How It Works: The Backend Event Stream

The architecture is straightforward:

1.  The backend exposes a Server-Sent Events endpoint at `/notifications/stream`.
2.  When a frontend client connects to this endpoint with a valid JWT, it establishes a persistent, one-way channel. This stream is unique and securely scoped to the authenticated user.
3.  When a backend process generates a notification for that user, it first saves the notification to the database.
4.  Immediately after, it pushes the exact same notification payload down the user’s active SSE stream.

From a frontend perspective, this means:
*   SSE messages are stateless. You can't request historical data from the stream.
*   If the connection drops or the user refreshes the page, any missed real-time events are not lost. They can be retrieved by fetching the `/notifications` REST endpoint.

---

## Frontend Integration: A Step-by-Step Guide

### Step 1: Establishing the Connection

The SSE connection should be treated as part of the authenticated user session.

*   **When to Connect:** Open the connection immediately after the user logs in and you have a valid JWT.
*   **How to Authenticate:** Pass the user's JWT as a Bearer token in the `Authorization` header when creating the `EventSource` instance.
*   **Handling Disconnects:** The browser's `EventSource` API handles most reconnects automatically. However, you must account for terminal failures:
    *   **Token Expiry:** If the connection is closed due to an expired token, you will need to refresh the JWT and establish a new connection.
    *   **Network Drops & Browser Suspension:** On reconnect, the application should re-sync its state (like unread counts) by fetching from the REST API to ensure nothing was missed while the connection was down.

### Step 2: Handling Incoming Events

An SSE message is a signal that **something has already happened** on the backend. Its primary purpose is to enable immediate UI feedback. It is not, however, a reliable mechanism for mutating your application's core state.

Upon receiving an event:

*   **DO:** Trigger transient, low-risk UI updates.
    *   Show a toast notification (e.g., “Your bid was successfully placed!”).
    *   Increment a badge for unread notifications.
    *   Trigger a soft, visual refresh of a notification list.

*   **DO NOT:** Directly mutate critical state from the SSE payload.
    *   Do not update a user's token balance.
    *   Do not change an asset's status from "For Sale" to "Sold".
    *   Do not add a bid to a list of bids.

This separation prevents race conditions and ensures the UI never displays data that hasn't been confirmed by the true source of state—our REST API.

### Step 3: Ensuring State Consistency

The correct pattern for syncing the UI with the backend is as follows:

1.  An SSE event arrives.
2.  The frontend immediately shows feedback (e.g., a toast: "Your yield has been settled.").
3.  The frontend then invalidates any cached data related to the event and triggers a background fetch to the relevant REST endpoint (e.g., `/notifications/unread-count` or `/portfolio`).
4.  The UI updates with the fresh, confirmed data from the API response.

This pattern guarantees that the UI is both immediately responsive and eventually consistent with the persistent state, avoiding duplicate notifications or out-of-sync data.

### Step 4: Displaying Notifications

Our notifications are designed to be polymorphic. The frontend should use a **single, reusable notification component** that adapts its presentation based on the data it receives.

Do not create separate UI components for Admin, Originator, or Investor notifications. Instead, the same component should change its:
*   **Copy:** The `title` and `message`.
*   **Severity:** The visual style (e.g., info, success, warning, error).
*   **Action Handling:** The behavior of the notification's primary action button.

This approach keeps the frontend lean and adaptable to new notification types without requiring new UI development.

### Step 5: Executing Notification Actions

Some notifications include an `action` and associated `actionMetadata`. These are not suggestions; they are explicit instructions for the frontend to trigger a navigation or function.

*   The `action` field tells you *what* to do (e.g., `VIEW_ASSET`).
*   The `actionMetadata` provides the context (e.g., `{ "assetId": "..." }`).

Your code should be able to route these actions to the correct part of the application. For example:
*   `VIEW_ASSET` → Navigate to the asset detail page for the given `assetId`.
*   `VIEW_PORTFOLIO` → Navigate to the user's portfolio screen.
*   `CLAIM_YIELD` → Open the yield claim modal or screen.

Clicks on these notifications must never be dead ends.

---

## Core Principles & Constraints

These are non-negotiable rules for a stable and trustworthy integration.

*   ✅ **Always fetch from REST for the source of truth.**
*   ✅ **Use SSE only for signaling and creating immediate feedback.**
*   ✅ **Keep unread counts and other state consistent by re-fetching.**
*   ✅ **Gracefully handle connection drops and re-establish the stream.**

*   ❌ **Do not mutate core application state directly from an SSE event.**
*   ❌ **Do not assume SSE delivery is 100% reliable; always have a REST-based fallback.**
*   ❌ **Do not duplicate backend business logic in the frontend.**
*   ❌ **Do not invent new notification types or meanings; render what the API gives you.**

---

## Defining Success

The integration is successful if:

*   **From an engineering perspective:** You can clearly explain the difference between the signal (SSE) and the source of truth (REST), and the integration is resilient to connection failures. You never have to ask, "Should I trust this event?"
*   **From a product perspective:** The application feels instant. Notifications are delivered reliably, and the UI state never lies to the user. We preserve their trust in the platform, especially when their money is involved.
