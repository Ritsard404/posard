---
description: Handles the full lifecycle of a POS session, including terminal selection, authentication, session initialization, cash handling, withdrawals, and secure session closing with role-based approval.
---

Ensures:

Single active session per user and terminal
Proper validation of cash movements
Secure PIN-based authentication
Role-based approval for critical actions

1. Terminal Selection
Fetch and display all POS terminals regardless of status:
AVAILABLE
IN_USE
OFFLINE / DISABLED
User may only proceed with terminals in AVAILABLE state
If terminal is IN_USE, display its current session info and prevent selection (unless role override is allowed)
Rules
A terminal can only have one active session
A user can only have one active POS session
2. PIN Authentication
After selecting a terminal:
Prompt user to enter PIN
Validate PIN against:
Authenticated user (Supabase) or stored staff PIN
Constraints
Maximum of 3 attempts
Auto-cancel if:
User closes modal
Timeout / inactivity
Security
Never expose raw PIN
Use hashed comparison if stored locally
3. Open POS Session
On successful PIN:
Create a new POS session
Optional Step
Prompt user to input opening cash
Optional field
If provided: must be >= 0
Persist
terminalId
userId
openingCash
openedAt
status = OPEN
4. Active Session Rules
While session is OPEN:
Allow transactions
Allow cash withdrawals
Prevent:
Opening another session (user or terminal already active)
5. Cash Withdrawal
Allow withdrawal during active session
Required Fields
amount
reason
Validation
amount > 0
Must not exceed current cash balance
Must have active session
Effects
Deduct from running cash total
Log transaction with timestamp and userId
6. Close POS Session (Cash Out)
Triggered when user exits POS
Steps
Prompt user to input:
counted cash
Compute:
expected cash vs counted cash
Validation
countedCash must be >= 0
7. Approval Requirement
Required before closing session
Approval Methods
Manager PIN
OR authorized role PIN
Validation
Approver must have role:
MANAGER (or configured role)
Log:
approverId
timestamp
8. Close Session Finalization
Update session:
closingCash
closedAt
status = CLOSED
Important Rule
Once closed:
Terminal becomes AVAILABLE again
It can be reused for new sessions
9. System Constraints
Enforce:
Single active session per terminal
Single active session per user
Prevent:
Closing without cashout
Accessing POS without terminal + PIN
10. Edge Case Handling
Handle:
Abandoned PIN entry
Browser refresh during session
Multiple tabs
Network interruption
Always:
Revalidate session state from backend
11. Implementation Constraints
Use only:
Existing Prisma schema
Existing enums and roles
Follow:
Current service structure
Type-safe patterns
Apply:
Centralized validation (e.g., Zod)
Clean separation of concerns:
UI
Services
Data access
✅ Expected Behavior Summary
Controlled POS access via terminal + PIN
Traceable session lifecycle
Secure cash handling (open → withdraw → close)
Mandatory approval on exit
Terminal is reusable after session closure