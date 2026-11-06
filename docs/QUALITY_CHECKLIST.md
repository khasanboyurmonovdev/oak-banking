Quality Checklist
 
Use this checklist throughout implementation and before submitting the Post Oak Group technical case study. Mark items complete only after verifying them.
 
1. Product and Scope
 
- [ ] The app clearly communicates a modern business-banking product.
- [ ] The product has an original visual identity and does not directly copy Mercury or Slash.
- [ ] All required case-study features are represented.
- [ ] The interface uses realistic, internally consistent demo data.
- [ ] No unnecessary features compromise completion or quality of required features.
 
2. UI and Visual Design
 
- [ ] The interface feels polished, professional, and trustworthy.
- [ ] Visual hierarchy is clear across page titles, metrics, tables, and actions.
- [ ] Typography, spacing, colors, borders, and radii are consistent.
- [ ] Cards and panels align cleanly.
- [ ] Charts are legible and use consistent formatting.
- [ ] Empty, loading, and error states are considered where appropriate.
- [ ] Icons are consistent and meaningful.
- [ ] No placeholder text, broken images, or unfinished UI remains.
 
3. Responsive Design
 
- [ ] Desktop layout is polished at common laptop widths.
- [ ] Tablet layout remains usable.
- [ ] Mobile layout does not overflow horizontally.
- [ ] Navigation adapts appropriately to smaller screens.
- [ ] Tables and transaction details remain accessible on mobile.
- [ ] Interactive elements have adequate touch targets.
 
4. Overview Dashboard
 
- [ ] Total balance and account balances display correctly.
- [ ] Financial summary metrics are present and understandable.
- [ ] Cash position and activity are represented clearly.
- [ ] Recent transactions are displayed.
- [ ] Chart data corresponds to the selected period or filter.
- [ ] Dashboard figures are derived from the same underlying data as other views.
 
5. Transactions
 
- [ ] Transaction history is populated with realistic sample data.
- [ ] Search works across relevant transaction fields.
- [ ] Filters work and can be cleared.
- [ ] Sorting works where provided.
- [ ] Transaction details can be opened and reviewed.
- [ ] Amounts, dates, statuses, and categories are formatted consistently.
- [ ] Empty search and filter results are handled gracefully.
 
6. Interactions and Demo Behavior
 
- [ ] Navigation links lead to valid views.
- [ ] Buttons perform their advertised actions.
- [ ] Forms validate inputs and provide feedback.
- [ ] Transfer or payment flows clearly communicate that they are simulated.
- [ ] Account or card controls update the UI when applicable.
- [ ] Notifications and dialogs can be opened and dismissed.
- [ ] State changes remain consistent across related views.
- [ ] No action appears functional if it does nothing.
 
7. Charts and Analytics
 
- [ ] At least one meaningful interactive visualization is included.
- [ ] Charts have clear labels, legends, and tooltips where useful.
- [ ] Period selection or chart interaction works.
- [ ] Charts handle empty or insufficient data gracefully.
- [ ] Visualizations are responsive and readable.
- [ ] Chart figures agree with the underlying demo data.
 
8. Engineering Quality
 
- [ ] Existing repository conventions and setup are respected.
- [ ] TypeScript is used appropriately; avoid unnecessary "any".
- [ ] Components have clear responsibilities.
- [ ] Shared UI patterns are reusable.
- [ ] Domain models and formatting utilities are centralized where appropriate.
- [ ] Monetary values use integer cents or another precise representation.
- [ ] Derived values are calculated instead of duplicated.
- [ ] No unnecessary dependencies are introduced.
- [ ] No secrets, credentials, or private data are committed.
- [ ] Console errors and warnings are reviewed.
 
9. Accessibility
 
- [ ] Controls have accessible names.
- [ ] Semantic elements are used appropriately.
- [ ] Keyboard navigation works for core flows.
- [ ] Focus states are visible.
- [ ] Text and interactive elements have sufficient contrast.
- [ ] Color is not the only way information is communicated.
 
10. Verification
 
- [ ] Dependencies install successfully.
- [ ] Development server starts successfully.
- [ ] Production build completes successfully.
- [ ] Linting passes, if configured.
- [ ] Type checking passes, if configured.
- [ ] Core interactions have been tested manually.
- [ ] Desktop and mobile layouts have been reviewed.
- [ ] No broken routes or obvious runtime errors remain.
 
11. Submission Readiness
 
- [ ] The app is deployed and the live URL works, if deployment is feasible.
- [ ] The source repository is accessible and organized.
- [ ] README explains setup and how to run the project.
- [ ] README describes the tech stack and key implementation decisions.
- [ ] README briefly explains AI-assisted development tools and workflow.
- [ ] Demo limitations and simulated banking actions are disclosed.
- [ ] Final submission includes the live app link and repository link.
 
Final Review
 
Before submitting, prioritize:
 
1. Required features working reliably.
2. A coherent, polished user experience.
3. Responsive behavior.
4. Clean, maintainable implementation.
5. Clear documentation and submission links.
 
Do not mark an item complete based only on code being written. Verify the behavior in the running application.
