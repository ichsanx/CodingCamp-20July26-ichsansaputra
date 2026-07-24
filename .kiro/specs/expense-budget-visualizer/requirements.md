# Requirements Document

## Project
Expense & Budget Visualizer

## User story
As a user, I want to record daily spending and see totals and category distribution so that I can understand and control my expenses.

## Functional requirements

### FR-1 Add transaction
- The form shall collect item name, amount, date, and category.
- Category shall include Food, Transport, and Fun.
- The user may add a custom category.
- All required fields shall be validated before submission.

### FR-2 Transaction history
- The app shall display all saved transactions in a scrollable list.
- Each transaction shall show item name, amount, category, and date.
- The user shall be able to delete a transaction.

### FR-3 Total and monthly summary
- The app shall calculate and display the total value of all transactions.
- The app shall calculate a summary for the selected month.
- Totals shall update immediately after add or delete actions.

### FR-4 Visual chart
- The app shall display spending distribution by category as a pie/doughnut chart.
- The chart shall update when transactions or the month filter change.

### FR-5 Local persistence
- Transactions, budget limit, and theme preference shall be stored in browser Local Storage.

### FR-6 Optional features
- Custom categories
- Monthly summary
- Sorting by date, amount, or category
- Monthly spending limit and over-limit warning
- Dark/light mode

## Technical constraints
- HTML for structure
- One CSS file inside `css/`
- One JavaScript file inside `js/`
- Vanilla JavaScript only
- No backend server
- Modern browser compatibility
