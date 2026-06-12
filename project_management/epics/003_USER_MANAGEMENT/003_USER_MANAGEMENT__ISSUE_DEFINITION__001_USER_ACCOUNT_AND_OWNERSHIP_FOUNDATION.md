# DEVELOPER TEAM RULES

## Before implementing the issue

- Read the codebase in `/src` first in order to understand the existing implementation.
- Read the original `ISSUE_DEFINITION` document at `/project_management/epics/<path to issue definition>`.
- Read the `ISSUE_REPORT` of the previous issue if it exists.

## After implementing the issue

- Document the concrete implementation choices in an `ISSUE_REPORT` for this issue in order to inform a proceeding developer about the work.
- Update `/project_management/EPIC_OVERVIEW.md` by changing the status of the current issue.

## Repository issue metadata

- GitHub repository label: `type/feature`

# ISSUE DEFINITION

## Epic

003 USER MANAGEMENT

## Issue Title

001 USER ACCOUNT AND OWNERSHIP FOUNDATION

## Issue Description

Introduce the persistent user entity and ownership model that turns the current SQLite database from a single global dataset into account-scoped application data. This issue defines how usernames are stored, how ownership is represented, and which records become user-bound so later issues can add authentication and authorization without reworking the schema again.

Clarified scope decisions already fixed for this issue:

- Only pre-created or admin-created users are in scope. Public self-registration is out of scope.
- New users created later shall start with empty personal datasets.
- Existing family members, widgets, widget settings, calendar events, and todo items remain domain records inside one user account rather than becoming global shared entities.

## Previous Issue Within The Epic

None. This is the first issue in the epic.

## Functional Requirements

1. The system shall persist application users in a dedicated backend table with at minimum a stable id, unique username, password hash field, created_at, and updated_at.
2. Every protected application data table shall store an owning user id so all persisted application data becomes user-specific.
3. Ownership shall cover at minimum:
   - family members
   - widgets
   - widget settings
   - calendar events
   - todo items
4. Required ownership fields for protected data shall be non-null after the migration path is complete.
5. Username uniqueness shall be enforced at the database level.
6. The ownership model shall preserve the existing household-specific family member scoping inside one account.
7. Public self-registration endpoints or views shall not be introduced.
8. The user model shall support future manual or admin-created users that start with empty personal datasets.

## Involved Modules

- Model:
  users table, ownership columns, uniqueness constraints, data ownership contract
- View:
  no direct user-facing view changes are required in this issue
- Controller:
  backend data access, record creation defaults, ownership-aware repository helpers

## Implementation Plan

1. Add a persistent users table with unique username and secure password-hash storage fields.
2. Add an owning user id to every protected application data table.
3. Define how ownership is attached when new records are created so controllers no longer rely on global tables.
4. Introduce ownership-aware backend query helpers or conventions that later issues can reuse for authorization.
5. Encode the no-self-registration and empty-new-user-dataset policy in the schema and seeding approach where applicable.

## Test Cases

1. A user record can be created with a unique username and password-hash field.
2. Attempting to create a second user with the same username fails.
3. A protected data row cannot exist without an owning user id once the migration is complete.
4. Family members, widgets, widget settings, calendar events, and todo items can all be represented as records owned by one user.
5. Creating a future user does not automatically clone the existing sample dataset.