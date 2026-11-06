PRODUCT SPECIFICATION — Oak Banking

Product Overview

Product Name

Oak Banking

The name is provisional. Use it consistently unless explicitly changed.

Product Type

A modern business banking dashboard for small businesses, startups, and finance teams.

Product Concept

Oak Banking is a fictional digital business banking platform that gives users a clear view of their company's finances and allows them to manage everyday banking activities through a modern, intuitive interface.

The product should feel like a credible fintech application rather than a static dashboard template.

Product Objective

Deliver a polished, interactive banking dashboard that demonstrates:

Strong product thinking
Modern UI/UX
Full-stack engineering capability
Financial domain understanding
Technical judgment
Effective AI-assisted development
Target Users

Primary users:

Startup founders
Small business owners
Finance and operations teams
Business administrators

User Needs

Users need to:

Understand their current financial position quickly.
See how much money is available.
Monitor incoming and outgoing payments.
Review recent transactions.
Find specific transactions.
Understand cash flow trends.
Access account information.
Perform common banking actions.
Receive clear feedback when actions are completed.
Product Experience Principles

Financial Clarity

Important financial information should be immediately understandable.

Trust

The interface should feel professional, reliable, and secure.

Simplicity

Avoid unnecessary complexity and excessive visual elements.

Functionality

Interactive controls must perform meaningful actions.

Consistency

Use consistent layouts, interaction patterns, financial formatting, and terminology.

Responsiveness

The experience should adapt gracefully to desktop, tablet, and mobile devices.

Originality

Use Mercury and Slash as references for quality and conventions, not as templates to copy.

Application Structure

The application should use a persistent navigation layout on desktop.

Suggested primary navigation:

Overview
Transactions
Accounts
Cards
Payments
Analytics

Additional navigation items may include:

Notifications
Settings
Help

The navigation should clearly identify the active page.

On mobile, use an appropriate compact navigation pattern rather than squeezing the desktop sidebar into a narrow screen.

Primary Pages

Overview

The main banking dashboard.

Transactions

A dedicated transaction management page.

Accounts

A list of business accounts with account-specific details.

Cards

A card management interface.

Payments

A payment and transfer interface.

Analytics

A more detailed financial analytics experience.

Prioritize Overview and Transactions. The other pages should be implemented according to the available time and overall quality.

Overview Dashboard

The Overview page is the most important screen in the application.

It should provide a clear financial snapshot.

5.1 Account Summary

Display:

Total account balance
Available balance
Pending funds
Number of accounts, where relevant

Use clear labels and supporting information.

Avoid presenting multiple financial metrics that mean the same thing.

5.2 Cash Flow

Display a meaningful visualization of incoming and outgoing money.

Recommended visualization:

A line or area chart showing cash flow over time.
Separate income and expense series.
A selectable time range.
Clear tooltips showing exact values.

Suggested time ranges:

7 days
30 days
90 days
12 months

The chart must update based on the selected range.

5.3 Account Overview

Show the user's business accounts.

Example account types:

Operating Account
Reserve Account
Payroll Account

Each account should include:

Account name
Account type
Balance
Currency
Relevant account status

Account values must be consistent with the underlying dataset.

5.4 Recent Transactions

Show a compact list of recent transactions.

Each transaction should include:

Merchant or counterparty
Description
Date
Category
Amount
Direction or status

Provide an obvious way to navigate to the full transaction history.

5.5 Financial Summary

Display useful supplementary metrics, such as:

Money in
Money out
Net cash flow
Spending breakdown

Avoid unnecessary financial metrics that cannot be explained or calculated reliably.

Transaction Management

The Transactions page must be a functional transaction management interface.

6.1 Transaction Data

Each transaction should support an appropriate set of fields:

Unique ID
Merchant or counterparty
Description
Amount
Currency
Transaction direction
Category
Date and time
Account ID
Status
Transaction type
Reference number

Additional metadata may be included where useful.

6.2 Transaction List

Display a professional transaction table on desktop.

On mobile, adapt the presentation into a readable list or card layout.

The list should include:

Merchant or counterparty
Description
Date
Account
Category
Status
Amount

Use consistent financial formatting.

Income and outgoing transactions should be visually distinguishable.

6.3 Search

Users must be able to search transactions.

Search should support relevant fields such as:

Merchant name
Description
Counterparty
Transaction reference

Search should update the displayed results.

6.4 Filtering

Provide useful filters, including:

Transaction direction
Status
Category
Account
Date range

The exact filter UI may be adapted to maintain a clean experience.

Filters must operate on the actual transaction dataset.

6.5 Sorting

Support useful sorting options, including:

Date
Amount

Default sorting should show the most recent transactions first.

6.6 Transaction Details

Selecting a transaction should open a detail view.

Use a side drawer or modal where appropriate.

Display relevant details:

Merchant or counterparty
Amount
Status
Date and time
Transaction type
Category
Account
Description
Reference number

The details should be consistent with the selected transaction.

6.7 Empty States

Provide meaningful empty states when:

No transactions exist.
Search returns no matches.
Filters return no results.

Users should be able to clear filters or search and return to the full transaction list.

Accounts

The Accounts page should provide an overview of all business accounts.

Required Behavior

Display all accounts.
Show balances.
Show account type.
Show currency.
Show account status.
Allow users to open account details.
Show relevant account information.

If account selection is implemented elsewhere, the selected account should update relevant information consistently.

Do not fabricate real bank account numbers or imply that actual financial accounts are connected.

Use clearly fictional account identifiers.

Cards

The Cards page should demonstrate basic business card management.

Possible card fields:

Cardholder
Card type
Last four digits
Linked account
Status
Spending limit

Required Interactions

If card management is implemented:

Display cards.
Allow users to inspect card details.
Support a functional freeze/unfreeze interaction.
Reflect the card status in the UI.
Provide feedback after an action.

All card operations are simulated.

Do not imply that the application can control a real payment card.

Payments and Transfers

The Payments page should demonstrate a realistic simulated transfer workflow.

Transfer Form

Support:

Source account
Destination account
Transfer amount
Optional description

Transfer Validation

Validate:

Source and destination are different.
Amount is greater than zero.
Amount is a valid monetary value.
Source account has sufficient available funds.
Required fields are completed.

Transfer Behavior

When a transfer is confirmed:

Update the relevant account balances.
Create corresponding transaction records.
Reflect the changes in account summaries.
Update relevant charts and transaction lists.
Provide clear confirmation feedback.

Avoid creating duplicate transfers from repeated submissions.

The transfer should be atomic within the demo state: either all relevant updates happen together or none do.

All transfers are simulated and must not initiate real financial activity.

Analytics

The Analytics page should provide useful financial insights.

Potential visualizations:

Income vs. expenses
Spending by category
Cash flow trends
Account activity

Requirements

Use realistic sample data.
Ensure charts communicate meaningful information.
Use clear labels and tooltips.
Provide appropriate time-range selection.
Keep the UI responsive.
Ensure the displayed metrics are calculated from the underlying data.

Analytics should complement the Overview page rather than duplicate it unnecessarily.

Notifications and Feedback

Use a consistent feedback pattern for user actions.

Examples:

Transfer completed
Card frozen
Card unfrozen
Filters applied
Transaction selected
Invalid transfer amount
Insufficient funds

Use appropriate UI feedback such as toasts, inline messages, or confirmation dialogs.

Avoid unnecessary browser alerts.

Sample Data

The application should use realistic fictional banking data.

The dataset should include enough variation to demonstrate:

Incoming transactions
Outgoing transactions
Pending transactions
Completed transactions
Different categories
Multiple accounts
Different transaction amounts
Different dates
Recurring business expenses
Payroll
Vendor payments
Customer payments
Card transactions

Data Integrity

Financial data must be internally consistent.

Examples:

Account balances should reconcile with the initial balances and transactions.
Available balances should account for pending funds according to the chosen model.
Income and expense totals should be calculated correctly.
Cash flow should reflect the underlying transactions.
Category totals should reconcile with the selected dataset and period.
Transfer transactions should not be counted as external income or expenses in consolidated business analytics.

Do not hardcode dashboard metrics independently from the data they represent.

Use a centralized and clearly defined data model.

Demo Behavior

This project is a technical case study.

A real banking backend, banking API integration, real payment processing, or actual card infrastructure is not required unless a clear implementation decision justifies it.

The product should use a reliable local demo data model.

Simulated banking functionality must be transparent and must not be represented as real financial activity.

The demo should be usable without requiring external credentials or a complicated setup.

Scope Control

The core experience must remain focused.

Must Have

Overview dashboard
Account summary
Financial visualization
Transaction history
Transaction search
Transaction filtering
Transaction details
Functional primary interactions
Responsive UI
Realistic sample data

Should Have

Account details
Account switching
Transfer simulation
Card management
Analytics page
Notifications
Mobile navigation

Could Have

Advanced analytics
Additional transaction filters
More account types
Additional financial workflows
Additional visual refinements

Do not implement optional functionality at the expense of core quality.

Definition of Done

The product is complete when:

The main banking dashboard is polished.
Core user workflows are functional.
Transactions can be searched, filtered, and inspected.
Financial charts are interactive and data-driven.
Financial summaries are internally consistent.
The application is responsive.
The implementation is maintainable.
All important interactions have been verified.
The project satisfies the case study requirements.