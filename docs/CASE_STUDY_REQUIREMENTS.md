CASE STUDY REQUIREMENTS — Post Oak Group

Purpose

This document defines the explicit requirements of the Post Oak Group technical case study.

Claude Code must use this document as a checklist throughout implementation.

Every requirement must be addressed. Do not assume that a visually complete dashboard satisfies a functional requirement.

Original Assignment

The assignment is to design and develop a modern banking dashboard, taking inspiration from platforms such as Mercury or Slash, while creating an original implementation and user experience.

The project is evaluated on:

Modern UI/UX
Account Overview
Transaction Management
Data Visualization
Functional Features
Technical Implementation
Effective AI-Assisted Development
Requirement Checklist

R1 — Modern UI/UX

Requirement: Create a clean, responsive, professional interface with intuitive navigation and a polished fintech-style experience.

Acceptance criteria:

 The interface has a coherent visual identity.
 The layout feels like a modern banking product.
 Navigation is intuitive and consistent.
 Typography, spacing, colors, and component styling are consistent.
 The interface works on desktop, tablet, and mobile screen sizes.
 Loading, empty, and relevant error states are handled.
 Interactive elements provide clear feedback.
 No unnecessary visual clutter.
 The implementation is original and does not directly copy Mercury or Slash.

Verification:

Review the application at multiple viewport sizes and inspect the main user journeys.

R2 — Account Overview

Requirement: Display account balances, financial summaries, cash position, and other relevant banking metrics.

Acceptance criteria:

 Display total account balance.
 Display available cash.
 Display pending funds or transactions where appropriate.
 Display relevant account information.
 Display financial summaries that are understandable.
 All displayed values are derived from consistent sample data.
 The relationship between total balance, available balance, and pending amounts is clear.
 Currency formatting is consistent.

Verification:

Confirm that summary values are accurate and reconcile with the underlying account data.

R3 — Transaction Management

Requirement: Include transaction history with filtering, searching, transaction details, and realistic sample data.

Acceptance criteria:

 Display a transaction history.
 Use realistic transaction descriptions and merchant names.
 Include transaction dates.
 Include transaction amounts.
 Include transaction types or categories.
 Distinguish money entering and leaving accounts.
 Search transactions.
 Filter transactions by relevant criteria.
 Support sorting where appropriate.
 Open a transaction detail view.
 Transaction details contain meaningful information.
 Empty search and filter states are handled.
 Search, filtering, and sorting operate on the actual transaction dataset.

Verification:

Test search, filters, sorting, and transaction detail views with different data combinations.

R4 — Data Visualization

Requirement: Incorporate interactive charts or visualizations showing account activity, spending, cash flow, or financial performance.

Acceptance criteria:

 Include at least one meaningful financial chart.
 Chart data is derived from the underlying sample data.
 Charts communicate useful financial information.
 Charts have clear labels and understandable values.
 Chart interactions work where applicable.
 Time range selection works if provided.
 Chart values remain consistent with the selected period.
 Charts are responsive.
 Empty or insufficient data states are handled.

Verification:

Change chart filters or time ranges and confirm that the displayed visualization updates correctly.

R5 — Functional Features

Requirement: Include working interactive elements demonstrating how a real banking platform might operate.

Acceptance criteria:

 Main navigation works.
 Buttons and controls perform their advertised actions.
 Account selection or account-related interactions work.
 Transaction interactions work.
 Financial chart interactions work.
 Any additional banking actions work as intended.
 User feedback is provided after actions.
 State changes are reflected consistently in the UI.
 Simulated actions are clearly understood as demo functionality.
 No prominent control is purely decorative while implying functionality.

Verification:

Perform a manual interaction walkthrough of every major feature.

R6 — Technical Implementation

Requirement: Use modern development frameworks and demonstrate clean, scalable, well-structured code.

Acceptance criteria:

 Use a modern framework and TypeScript where appropriate.
 Components have clear responsibilities.
 Business logic is separated from presentation where appropriate.
 Data models are typed.
 State management is appropriate for the application's complexity.
 Reusable components are introduced where they provide value.
 Naming and file organization are consistent.
 Avoid unnecessary abstractions.
 Avoid unnecessary dependencies.
 Avoid duplicated logic.
 No secrets or credentials are committed.
 No obvious runtime errors.
 Build and relevant checks pass.

Verification:

Review the codebase and run the available linting, type-checking, testing, and build commands.

R7 — AI-Assisted Development

Requirement: Demonstrate effective use of AI-assisted development tools while maintaining high standards of functionality, design, usability, and code quality.

Acceptance criteria:

 AI tools are used to accelerate implementation.
 Generated code is reviewed.
 Important technical decisions are intentional.
 AI-generated functionality is verified.
 The final application meets the quality expectations.
 The technologies and AI tools used can be explained honestly in the submission.

Verification:

Prepare a brief and accurate explanation of the development workflow and tools used.

Submission Requirements

The submission must include:

 A working application link.
 A deployed version, preferably.
 A GitHub repository or equivalent containing source code.
 A brief explanation of the technologies used.
 A brief explanation of the AI tools used.
 A direct reply to the assignment email.
 Confirmation of assignment receipt and understanding.
Deadline

The assignment allows up to 24 hours from receipt of the email.

Earlier submissions are encouraged because candidates are reviewed on a rolling basis.

The project should prioritize a complete, polished, and verifiable implementation over unnecessary features.

Prioritization

When time is limited, prioritize:

P0 — Mandatory

Professional responsive dashboard UI.
Account overview.
Transaction history.
Transaction search and filtering.
Transaction detail view.
Meaningful financial visualization.
Working primary interactions.
Clean implementation.
Successful build.
Deployment and repository.

P1 — High Value

Account switching.
Time-range selection for charts.
Transaction sorting.
Transfer simulation.
Card controls.
Helpful empty states.
Responsive mobile navigation.
Polished interaction feedback.

P2 — Optional

Additional analytics.
Advanced filtering.
Additional account types.
Additional banking features.
Further visual enhancements.

Optional features must never compromise P0 requirements.

Definition of Completion

The case study is ready for submission only when:

All P0 requirements are implemented.
The application has been tested.
The major interactions have been verified.
The build succeeds.
The deployed application is accessible.
The source code is available.
The submission materials are prepared.

Do not mark requirements as complete based solely on implementation intent. Verify them.