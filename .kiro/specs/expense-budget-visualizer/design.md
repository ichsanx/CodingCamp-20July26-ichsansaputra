# Design Document

## Architecture
The application is a static single-page website. `index.html` provides semantic structure, `css/style.css` provides responsive presentation, and `js/script.js` controls state, storage, validation, calculations, filtering, sorting, theme, and chart rendering.

## Data model
Each transaction contains:

```js
{
  id: string,
  itemName: string,
  amount: number,
  category: string,
  date: "YYYY-MM-DD",
  createdAt: ISODateString
}
```

## Storage
- Transactions: `expenseVisualizer.transactions.v1`
- Budget: `expenseVisualizer.budget.v1`
- Theme: `expenseVisualizer.theme.v1`

## Main UI areas
1. Header and theme toggle
2. Summary cards
3. Add transaction form
4. Transaction list with month filter and sorting
5. Category chart
6. Monthly budget limit

## Chart strategy
The chart is rendered directly with the HTML Canvas API, avoiding external dependencies and keeping loading fast.

## Responsive behavior
- Desktop uses a two-column content layout.
- Tablet stacks the main content and chart sections.
- Mobile uses single-column cards and full-width controls.
