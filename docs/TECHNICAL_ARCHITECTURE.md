TECHNICAL ARCHITECTURE — Oak Banking

Purpose

This document defines the technical implementation principles for Oak Banking.

Claude Code must follow these principles when designing, implementing, and modifying the application.

The objective is to deliver a polished, reliable, maintainable application within the case study deadline.

Architecture should support the product requirements without introducing unnecessary complexity.

Existing Project Inspection

Before implementing anything, inspect the existing repository.

Determine:

Framework and framework version
Package manager
Existing dependencies
Existing application structure
Available scripts
Existing design system
Existing routing
Existing components
Existing state management
Existing styling approach
Current build and development status

Do not assume the project is empty.

Do not replace working configuration or restructure the repository without a clear reason.

If the current project already has a suitable technology stack, preserve it.

Document any important architectural deviations from this specification.

Preferred Technology Stack

Use the following stack when compatible with the existing project.

Frontend

Next.js
React
TypeScript
Tailwind CSS
shadcn/ui
Lucide React

Data Visualization

Recharts

Use it for responsive, interactive financial charts.

State Management

Preferred options:

React state for local component state.
React Context for lightweight shared state.
Zustand for shared application state when appropriate.
URL search parameters for shareable or navigable filters where useful.

Do not introduce Zustand merely because it is listed here.

Forms

Use the existing form infrastructure if suitable.

If the project does not have one, consider:

React Hook Form
Zod

Use validation that is appropriate to the complexity of the form.

Notifications

Use the existing notification system if available.

Otherwise, consider a lightweight toast library compatible with the current stack.

Testing

Preferred options:

TypeScript checks
ESLint
Vitest or Jest
React Testing Library
Playwright for important end-to-end workflows

Do not introduce all testing tools automatically. Select tools based on the existing project and available time.

Application Architecture

Use a modular architecture with clear responsibilities.

Suggested conceptual structure:

src/ ├── app/ │ ├── layout.tsx │ ├── page.tsx │ ├── transactions/ │ ├── accounts/ │ ├── cards/ │ ├── payments/ │ └── analytics/ │ ├── components/ │ ├── layout/ │ ├── dashboard/ │ ├── transactions/ │ ├── accounts/ │ ├── payments/ │ ├── charts/ │ └── ui/ │ ├── features/ │ ├── accounts/ │ ├── transactions/ │ ├── transfers/ │ └── cards/ │ ├── data/ │ ├── mock-accounts.ts │ ├── mock-transactions.ts │ └── mock-cards.ts │ ├── lib/ │ ├── utils.ts │ ├── formatters.ts │ └── financial-calculations.ts │ ├── types/ │ └── banking.ts │ └── stores/ └── banking-store.ts

This is a suggested structure, not a requirement to create every folder.

Adapt the structure to the existing framework conventions.

Avoid creating excessive layers or files that add no meaningful separation.

TypeScript Standards

Use TypeScript throughout the application.

Guidelines:

Prefer explicit types for domain models.
Avoid "any".
Use discriminated unions where they improve correctness.
Keep types reusable when appropriate.
Avoid unnecessary type assertions.
Model financial states explicitly.
Avoid loosely typed objects for important banking data.

The code should be understandable to an engineer reviewing the repository.

Domain Models

Create centralized types for the banking domain.

Suggested models:

Account

type Account = { id: string; name: string; type: "checking" | "savings" | "reserve"; currency: "USD"; ledgerBalance: number; availableBalance: number; pendingBalance: number; status: "active" | "inactive"; };

The final implementation may refine this model.

Balance semantics must be clearly documented.

Transaction

type Transaction = { id: string; accountId: string; merchant: string; description: string; amount: number; currency: "USD"; direction: "inflow" | "outflow"; category: string; type: "card" | "ach" | "wire" | "deposit" | "transfer"; status: "completed" | "pending" | "failed"; createdAt: string; reference: string; };

Adjust fields when needed.

Do not duplicate information unnecessarily.

Card

type Card = { id: string; cardholder: string; lastFour: string; type: "virtual" | "physical"; linkedAccountId: string; status: "active" | "frozen"; spendingLimit: number; };

Transfer

Define a typed transfer request and appropriate validation rules.

Include:

Source account
Destination account
Amount
Optional description

The final model should support consistent account and transaction updates.

Financial Data Modeling

Financial calculations must be centralized.

Do not independently hardcode values in dashboard components.

Monetary Values

Use a consistent monetary representation.

For this demo:

USD is the primary currency.
Store monetary amounts as integer cents wherever practical.
Convert to decimal values only for display.
Use "Intl.NumberFormat" for currency formatting.

For example:

const amountInCents = 125050;

const formattedAmount = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", }).format(amountInCents / 100);

Balance Semantics

Clearly distinguish:

Ledger balance
Available balance
Pending funds

Choose a consistent accounting model and document it.

Do not create confusing or contradictory balance calculations.

Financial Aggregations

Create reusable functions for:

Total account balances
Available cash
Income totals
Expense totals
Net cash flow
Spending by category
Cash flow by period
Account-specific transaction totals

These calculations should operate on typed domain data.

Transfers

Internal transfers must not be counted as external business income or expenses in consolidated financial analytics.

Ensure that account balances, transaction records, and analytics remain consistent.

Data Architecture

The application should use realistic local demo data.

Do not introduce a real banking API or backend unless there is a clear reason.

Initial Data

Keep mock data separate from UI components.

Use centralized seed data.

The initial dataset should be large and varied enough to demonstrate:

Transaction search
Transaction filtering
Sorting
Date-range selection
Account-specific activity
Cash flow charts
Spending categories
Pending transactions
Completed transactions

Derived Data

Calculate dashboard summaries and chart data from the transaction and account data.

Do not maintain duplicated derived values unless necessary.

Use memoization when it materially improves performance.

Mutable Demo State

When the application supports transfers, card controls, or other simulated actions, use a coherent shared state model.

Do not independently modify unrelated component state and expect the financial data to remain consistent.

State Management

Use the simplest architecture that supports the required interactions.

Local State

Use React state for:

Modal visibility
Selected transaction
Local form inputs
Dropdown visibility
Temporary UI interactions

Shared State

Use a shared store when necessary for:

Accounts
Transactions
Cards
Transfers
Account selection
Cross-page banking interactions

Derived State

Avoid storing values that can be calculated from existing state.

Examples:

Filtered transactions
Total balances
Cash flow chart data
Category totals

These should generally be derived through selectors or pure functions.

State Persistence

Persistence is optional.

If local persistence is introduced:

Keep it simple.
Avoid persisting unnecessary UI state.
Handle malformed stored data gracefully.
Ensure the application remains usable when persistence is unavailable.

Do not introduce a complex persistence layer for this case study.

Transaction Filtering Architecture

Search, filtering, and sorting should be implemented in a reusable and testable manner.

Prefer pure functions for:

Search matching
Date-range filtering
Category filtering
Status filtering
Account filtering
Sorting

The transaction page should not contain all filtering logic inline.

Use consistent filtering behavior across the application.

Component Architecture

Use components with clear responsibilities.

Examples:

"DashboardShell"
"Sidebar"
"Topbar"
"AccountSummary"
"CashFlowChart"
"AccountList"
"RecentTransactions"
"TransactionTable"
"TransactionFilters"
"TransactionDetailsDrawer"
"TransferForm"
"CardItem"

These names are suggestions.

Do not create a component for every small HTML element.

A component should be extracted when it improves readability, reuse, or separation of concerns.

UI and Business Logic Separation

Keep financial logic outside presentation components when practical.

Examples:

Financial calculations belong in reusable utility functions.
Data filtering belongs in reusable selectors.
Transfer validation belongs in a dedicated validation layer.
Banking state mutations belong in a store or service.
Components should focus on rendering and user interaction.

Avoid complex financial calculations inside JSX.

Financial Correctness

Financial behavior must be treated carefully even though this is a demo.

Requirements

Use consistent monetary representations.
Validate monetary inputs.
Prevent negative transfer amounts.
Prevent transfers between the same account.
Check sufficient available balance.
Prevent duplicate transfer submissions.
Keep related state updates consistent.
Ensure analytics handle internal transfers correctly.
Avoid floating-point precision errors where practical.

The demo must not claim to implement production-grade banking security, settlement, or payment processing.

Routing

Use the existing routing system.

If the project uses Next.js App Router, follow its conventions.

Guidelines:

Use clear page boundaries.
Keep shared navigation in the appropriate layout.
Use client components only where interaction requires them.
Avoid making the entire application a client component unnecessarily.
Preserve useful URLs for navigation and filters where appropriate.
Performance

Prioritize practical performance.

Avoid unnecessary re-renders.
Avoid unnecessary dependencies.
Use appropriate memoization.
Keep components reasonably sized.
Avoid loading excessive libraries for simple functionality.
Keep chart rendering efficient.
Avoid unnecessary client-side JavaScript.

Do not optimize prematurely.

Accessibility and UX

Follow the design system and practical accessibility principles.

Use semantic elements.
Ensure keyboard interaction.
Use accessible labels.
Provide visible focus indicators.
Handle dialog behavior appropriately.
Avoid inaccessible custom controls.
Ensure financial charts have meaningful text alternatives.
Error Handling

Handle errors at the appropriate level.

Examples:

Invalid transfer input
Insufficient funds
Missing account
Invalid transaction reference
Unexpected state

Provide useful feedback.

Avoid silently ignoring errors.

Do not use browser alerts for ordinary UI feedback.

Verification

After implementation, use the available project scripts.

Typical checks:

npm run lint npx tsc --noEmit npm run build

These commands are examples.

Inspect the actual "package.json" and use the correct package manager and scripts.

Do not assume that every command exists.

When practical, add targeted tests for:

Financial calculations
Transaction filtering
Transfer validation
Balance updates
Internal transfer treatment in analytics

Verify the important user flows manually or with automated tests.

Code Quality

The code should be:

Readable
Maintainable
Type-safe
Consistent
Modular
Appropriately abstracted

Avoid:

Giant components
Unnecessary abstractions
Duplicated financial logic
Unexplained magic numbers
Unnecessary dependencies
Dead code
Unused components
Placeholder interactions
Misleading functionality
Unnecessary configuration changes
Architecture Decision Principles

When making architectural decisions:

Preserve existing working infrastructure.
Prefer the simplest viable solution.
Optimize for the assignment requirements.
Prioritize correctness and maintainability.
Avoid overengineering.
Explain material trade-offs briefly.
Make implementation decisions that can be understood during a code review.
Definition of Done

The technical implementation is ready when:

The architecture is coherent.
Domain models are typed.
Financial calculations are centralized.
Data is consistent.
State updates are reliable.
Important interactions work.
The application builds successfully.
Relevant checks pass.
The code is understandable and reviewable.
The implementation supports the product specification and case study requirements.