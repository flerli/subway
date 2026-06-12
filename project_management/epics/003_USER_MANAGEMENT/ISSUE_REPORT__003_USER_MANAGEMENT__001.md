# ISSUE REPORT

## Epic

003 USER MANAGEMENT

## Issue

001 USER ACCOUNT AND OWNERSHIP FOUNDATION

## Implementation Summary

The backend ownership foundation was implemented in `backend/server.mjs`.

The server now creates a persistent `users` table with:

- stable user id
- unique username
- password hash field
- created and updated timestamps

The seeded initial user `flerlage` is now created automatically if it does not already exist. Its password is stored as a derived hash, not as plaintext in the database.

All protected data tables were migrated to user-owned schemas:

- `family_members`
- `widgets`
- `calendar_events`
- `todo_items`
- `widget_settings`

Implementation detail:

- each protected table now includes `owner_user_id`
- each protected table now uses an ownership-aware primary key
- `widget_settings` uses `(owner_user_id, widget_id)` so the same logical widget can exist for multiple users later

Existing single-user data is migrated into the seeded `flerlage` account during backend bootstrap.

To keep the current application behavior stable before authentication is added, the backend currently resolves requests through a default owner-user context. This keeps existing routes working while moving all persistence and mutation helpers onto user-aware query patterns.

## Notes For Next Issue

Issue 002 can build on this foundation by adding:

- login and logout endpoints
- persistent session storage
- current-session lookup
- password verification against the stored hash format

Issue 003 should replace the temporary default owner-user routing with authenticated request-user resolution.

## Validation

Validated by bootstrapping the backend and asserting:

- the `users` table exists with `username` and `password_hash`
- all protected tables contain `owner_user_id`
- ownership-aware primary keys were created as expected
- migrated rows have no null `owner_user_id`
- the seeded `flerlage` user exists
- duplicate usernames are rejected by the database