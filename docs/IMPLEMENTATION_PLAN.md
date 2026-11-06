IMPLEMENTATION PLAN — Oak Banking

Objective

Deliver a polished, functional, and publicly deployed banking dashboard for the Post Oak Group technical case study within the available deadline.

The implementation should prioritize:

Meeting the assignment requirements.
High-quality UI/UX.
Functional banking interactions.
Financial data consistency.
Clean and maintainable code.
Successful verification and deployment.
A professional GitHub repository and submission package.

Avoid spending time on features that do not materially improve the final submission.

Deployment and Submission Target

The application will be deployed to my existing Hostinger VPS.

Purchasing a domain is not required.
The application should be accessible through the VPS public IP address and an appropriate port, for example "http://VPS_IP:3000".
The source code will be submitted through a GitHub repository.
The final submission must include both the public deployed application URL and the GitHub repository URL.

Claude Code must not assume that a domain name, reverse proxy, or specific VPS configuration is already available.

Before making any VPS changes, inspect the existing environment and avoid disrupting other applications or services.

Development Workflow

Claude Code should follow an iterative development workflow.

For each major phase:

Inspect the current implementation.
Identify the highest-priority task.
Implement the task.
Verify the result.
Review the quality.
Continue to the next phase.

Do not implement the entire application in one enormous code-generation step.

Use the project documents as the source of truth. If the existing repository differs from the expected setup, inspect it and adapt rather than blindly replacing working infrastructure.

Phase 0 — Repository Inspection

Before modifying files:

Inspect the project structure.
Inspect "package.json".
Identify the framework and package manager.
Inspect the existing styling setup.
Inspect existing UI components.
Inspect routing.
Identify available scripts.
Run the current application if practical.
Identify any existing errors.
Review the repository's current state and avoid overwriting existing work.

Preserve working infrastructure.

Do not replace the existing project setup without a clear reason.

Deliverable

A brief understanding of the existing project and a proposed implementation approach.

Phase 1 — Foundation

Implement the application foundation.

Tasks:

Establish the design tokens.
Establish the application layout.
Implement the sidebar.
Implement the top navigation.
Establish page routing.
Create shared UI components.
Establish responsive behavior.
Define banking domain types.
Define centralized mock data.
Establish reusable formatting utilities for currency, dates, and financial values.

Deliverable

A coherent application shell with consistent visual styling.

Phase 2 — Overview Dashboard

Implement the main Overview page.

Tasks:

Account summary.
Available cash.
Pending funds.
Financial metrics.
Cash flow visualization.
Account overview.
Recent transactions.
Supporting financial information.

Ensure that all displayed values are derived from the data model.

The overview should immediately communicate the financial position of the demo business and feel polished enough for a professional banking product.

Deliverable

A complete and polished dashboard overview.

Phase 3 — Transaction Management

Implement the Transactions page.

Tasks:

Transaction dataset.
Transaction list or table.
Search.
Filters.
Sorting.
Transaction details drawer or modal.
Empty states.
Responsive transaction presentation.

Verify that the interactions operate on the actual dataset.

Ensure transaction values, dates, statuses, categories, and related account information are consistent.

Deliverable

A fully functional transaction management experience.

Phase 4 — Banking Interactions

Implement supporting banking functionality according to priority.

Potential features:

Account details.
Account selection.
Transfer simulation.
Card management.
Freeze/unfreeze card.
Confirmation dialogs.
Notifications.
State updates.

Each feature should be functional, not merely visual.

All banking operations must use simulated data. Do not connect to real financial institutions or process real payments.

Ensure that state changes are reflected consistently in relevant views.

Deliverable

A convincing demonstration of common banking workflows.

Phase 5 — Analytics

Implement financial analytics.

Tasks:

Income vs. expenses.
Cash flow trends.
Spending by category.
Time-range selection.
Interactive chart tooltips.
Responsive chart layouts.

Ensure the visualizations are based on the same underlying data used elsewhere.

Deliverable

A coherent financial analytics experience.

Phase 6 — Visual Polish

Review the entire application.

Focus on:

Visual hierarchy.
Typography.
Spacing.
Alignment.
Component consistency.
Interaction feedback.
Responsive layouts.
Empty states.
Loading states.
Error states.
Chart readability.
Table readability.
Accessibility.

Identify and fix generic or unfinished-looking areas.

Do not add new features merely to make the application appear more complex.

Deliverable

A polished, professional fintech application.

Phase 7 — Verification

Perform a final quality review.

Functional Verification

Check:

Main navigation.
Overview metrics.
Transaction search.
Transaction filtering.
Transaction sorting.
Transaction details.
Chart interactions.
Account selection.
Transfer validation.
Transfer updates.
Card controls.
Notifications.
Empty states.

Only verify features that are actually implemented.

Technical Verification

Run the relevant project checks:

Lint.
TypeScript checks.
Tests, if configured.
Production build.

Inspect browser console errors where practical.

Responsive Verification

Check at least:

Desktop.
Laptop.
Tablet.
Mobile.

Fix critical layout issues before submission.

Deliverable

A verified application with no known critical defects.

Phase 8 — Deployment to Hostinger VPS

Deployment Target

Deploy the application to my existing Hostinger VPS.

A domain name is not required. The intended public URL can use the VPS IP address and a port, for example:

"http://VPS_IP:3000"

The actual port and deployment method should be chosen based on the existing VPS environment and application framework.

Deployment Tasks

Inspect the VPS environment before making changes.
Identify existing applications, services, ports, firewall rules, Docker configuration, and reverse proxy configuration where applicable.
Determine an appropriate deployment method for the application.
Prefer an isolated deployment, such as Docker, if suitable for the existing environment.
Avoid disrupting existing applications or services.
Configure the application to run reliably in production.
Configure the application to be accessible through the VPS public IP address and selected port.
Configure environment variables safely.
Ensure secrets and credentials are not committed to GitHub or exposed publicly.
Confirm the production build succeeds.
Deploy the application.
Verify the public URL from an external network.
Test the deployed application and its primary interactions.
Confirm that the application remains accessible after deployment.
Document the deployment process and any required environment variables.

VPS Safety Requirements

Do not assume the VPS is empty.
Do not overwrite existing NGINX, Docker, firewall, or server configurations without inspecting them.
Do not stop or modify unrelated services.
Do not expose SSH credentials, API keys, environment files, or private data.
Do not use real financial information.
Do not claim deployment is complete until the public application has been verified.

If deployment requires a decision that could affect existing VPS applications, explain the impact before proceeding.

Deliverable

A publicly accessible and verified application URL using the Hostinger VPS IP address and port.

Phase 9 — GitHub Repository and Submission

Prepare the GitHub repository.

Tasks:

Ensure source code is complete.
Remove unnecessary files.
Check for secrets.
Confirm ".gitignore".
Create a useful README.
Explain the product.
Explain the technology stack.
Explain the AI-assisted development workflow.
Include the deployed application URL.
Include setup instructions.
Include deployment instructions.
Explain that banking operations use simulated data.
Ensure the repository is accessible to the reviewers.

Prepare the final email submission.

Final Submission Requirements

The submission must include:

Public deployed application URL.
GitHub repository URL.
Brief explanation of the technology stack.
Brief explanation of the AI-assisted development workflow.

Deliverable

A complete and professional submission package.

Time Management

The assignment has a deadline of up to 24 hours from receipt.

The project should be developed in priority order.

Suggested allocation:

10% — Repository inspection and foundation.
25% — Overview dashboard and design.
25% — Transaction management.
15% — Banking interactions.
10% — Analytics and supporting pages.
10% — Verification and polish.
5% — Deployment and submission.

These percentages are flexible.

If time becomes limited:

Complete the Overview page.
Complete Transaction Management.
Complete the required visualizations.
Ensure the primary interactions work.
Fix critical responsive issues.
Verify the build.
Deploy to the Hostinger VPS.
Prepare the GitHub repository and submission.

Do not sacrifice core requirements to implement optional features.

Deployment should be prepared early enough to identify potential VPS issues before the final hours.

Scope Control

Before adding a new feature, consider:

Does it directly satisfy an assignment requirement?
Does it materially improve the product?
Is it worth the implementation time?
Can it be completed and verified?
Does it introduce unnecessary complexity?

If the feature does not provide meaningful value, defer it.

Claude Code Collaboration

Claude Code should work autonomously on clear implementation tasks.

Avoid asking for approval for every small decision.

However, it should:

Explain material architectural changes.
Ask when a decision significantly affects scope.
Avoid replacing working infrastructure.
Avoid destructive changes without a clear reason.
Report blockers.
Verify significant changes.
Keep the implementation plan updated when priorities change.
Clearly distinguish completed work from suggested work.
Avoid claiming that tests, builds, or deployments succeeded unless they were actually run and verified.

During deployment, Claude Code must inspect the VPS environment before modifying it and must avoid disrupting existing services.

Definition of Completion

The project is ready for submission when:

All mandatory requirements are implemented.
The core banking dashboard is polished.
Transaction management is functional.
Financial visualizations are interactive.
Primary banking interactions work.
Financial data is consistent.
The application is responsive.
Relevant checks pass.
The production deployment is verified.
The public application URL works.
The GitHub repository is ready for review.
The README and deployment instructions are complete.
Submission materials are prepared.