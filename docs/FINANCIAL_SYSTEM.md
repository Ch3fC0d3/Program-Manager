# Financial Management System

## Overview
Complete budget vs actual tracking system with AI-powered expense classification and automatic allocation.

## Database Schema

### Core Models

#### `Budget`
- **Purpose**: Top-level budget container for a period
- **Key Fields**:
  - `name`, `amount`, `currency`, `period` (DAILY/WEEKLY/MONTHLY/QUARTERLY/YEARLY/CUSTOM)
  - `category`, `boardId`, `vendorId`
  - `startDate`, `endDate`
  - `aiSourceId`, `aiConfidence`, `aiExtractedData` - AI metadata
- **Relations**: `lineItems[]`, `allocations[]`, `board`, `vendor`, `createdBy`

#### `BudgetLineItem`
- **Purpose**: Granular budget tracking by category/vendor/project
- **Key Fields**:
  - `name`, `type` (CATEGORY/VENDOR/PROJECT/CUSTOM)
  - `category`, `vendorId`, `boardId`
  - `periodStart`, `periodEnd`
  - `plannedAmount`, `currency`, `notes`
  - `aiSourceId`, `aiConfidence`, `aiExtractedData`
- **Relations**: `budget`, `vendor`, `board`, `allocations[]`, `snapshots[]`

#### `Expense`
- **Purpose**: Actual spending records
- **Key Fields**:
  - `amount`, `currency`, `category`, `description`, `date`
  - `vendorId`, `taskId`, `boardId`
  - `receiptUrl`, `receiptData`
  - `aiVendorName`, `aiConfidence`, `aiExtractedData`
- **Relations**: `lineItems[]`, `allocations[]`, `vendor`, `task`, `board`, `createdBy`

#### `ExpenseLineItem`
- **Purpose**: Detailed expense breakdown (invoice line items)
- **Key Fields**:
  - `description`, `quantity`, `unitCost`, `totalAmount`, `category`
  - `aiExtractedData`
- **Relations**: `expense`, `allocations[]`

#### `ExpenseAllocation`
- **Purpose**: Links expenses to budget line items
- **Key Fields**:
  - `budgetId`, `budgetLineItemId`, `expenseId`, `expenseLineItemId`
  - `amount`, `currency`, `notes`
- **Relations**: `budget`, `budgetLineItem`, `expense`, `expenseLineItem`

#### `BudgetSnapshot`
- **Purpose**: Historical variance tracking
- **Key Fields**:
  - `periodStart`, `periodEnd`
  - `plannedAmount`, `actualAmount`, `variance`, `currency`
  - `generatedAt`
- **Relations**: `budgetLineItem`

## API Endpoints

### `/api/budgets`
- **GET**: List budgets with spending calculations
  - Query params: `boardId`, `vendorId`, `active`
  - Returns budgets with `spent`, `remaining`, `percentUsed`, `isOverBudget`
  - Includes `lineItems` and `allocations`
- **POST**: Create new budget
  - Body: `name`, `amount`, `period`, `category`, `boardId`, `vendorId`, `startDate`, `endDate`

### `/api/financials/dashboard`
- **GET**: Comprehensive budget vs actual analysis
  - Query params: `boardId`, `period` (month/quarter/year)
  - Returns:
    - `summary`: Total budgeted, actual, variance, percent used, status
    - `categoryBreakdown`: Budget vs actual by category with variance
    - `topCategories`: Top 5 spending categories
    - `recentExpenses`: Last 10 expenses
    - `budgets`: Budget summaries with allocation totals

### `/api/ai/classify`
- **POST**: AI-powered document classification
  - Creates `Expense` with `ExpenseLineItem` records from invoices
  - Auto-allocates expenses to matching budgets
  - Updates `BudgetSnapshot` records
  - Extracts line items (description, quantity, rate, total)

## Auto-Allocation Logic

### `autoAllocateExpense(expenseId)`
Located in `/lib/expense-allocator.ts`

**Matching Criteria** (in order of priority):
1. **Date range**: Budget must cover expense date
2. **Board**: Match expense.boardId to budget.boardId
3. **Vendor**: Match expense.vendorId to budget.vendorId
4. **Category**: Match expense.category to budgetLineItem.category

**Allocation Strategy**:
- If expense has line items:
  - Allocate each line item to matching budget line item by category
  - Check remaining budget before allocating
  - Fall back to budget-level allocation if no line item match
- If no line items:
  - Allocate entire expense to matching budget line item
  - Fall back to budget-level allocation if no line item match

**Budget Snapshot Updates**:
- Automatically updates `BudgetSnapshot` after allocation
- Calculates `actualAmount` from all allocations
- Computes `variance` (planned - actual)

## Frontend Dashboard

### `/financials`
**Features**:
- Summary cards: Total budgeted, spent, remaining, % used
- Budget vs actual table by category
- Visual status indicators (good/warning/over)
- Recent expenses feed
- Period filters (month/quarter/year)
- Board filters

**Status Colors**:
- **Good** (green): < 90% of budget used
- **Warning** (yellow): 90-100% of budget used
- **Over** (red): > 100% of budget used

## AI Integration

### Expense Classification
When uploading an invoice/receipt:
1. AI extracts:
   - Vendor name
   - Total amount, subtotal, tax
   - Line items (description, quantity, rate, total)
   - Category
   - Date
2. Creates `Expense` record
3. Creates `ExpenseLineItem` records
4. Auto-allocates to matching budgets
5. Updates budget snapshots

### Supported Formats
- PDF invoices
- Excel/CSV spreadsheets
- Text documents
- Images (via OCR - future enhancement)

## Usage Examples

### Creating a Budget
```javascript
POST /api/budgets
{
  "name": "Q1 2025 Operations",
  "amount": 500000,
  "period": "QUARTERLY",
  "category": "Operations",
  "boardId": "board-id",
  "startDate": "2025-01-01",
  "endDate": "2025-03-31"
}
```

### Uploading an Invoice
```javascript
POST /api/ai/classify
{
  "content": "Invoice text...",
  "fileName": "invoice-001.pdf",
  "fileType": "application/pdf",
  "attachment": {
    "id": "file-id",
    "url": "https://...",
    ...
  }
}
```

### Viewing Financial Dashboard
```
GET /api/financials/dashboard?period=quarter&boardId=board-id
```

## Database Indexes

Optimized queries with indexes on:
- `Budget`: `boardId`, `vendorId`, `startDate`
- `BudgetLineItem`: `budgetId`, `(boardId, category)`, `vendorId`
- `Expense`: `vendorId`, `taskId`, `boardId`, `date`, `createdById`
- `ExpenseLineItem`: `expenseId`, `category`
- `ExpenseAllocation`: `budgetId`, `budgetLineItemId`, `expenseId`
- `BudgetSnapshot`: `(budgetLineItemId, periodStart)`

## Future Enhancements

1. **Multi-currency support**: Automatic currency conversion
2. **Approval workflows**: Expense approval before allocation
3. **Recurring budgets**: Auto-create budgets for recurring periods
4. **Budget templates**: Reusable budget structures
5. **Forecasting**: AI-powered spending predictions
6. **Alerts**: Email/Slack notifications for budget thresholds
7. **Export**: CSV/Excel export of financial reports
8. **Charts**: Trend analysis and visualizations (Recharts/Chart.js)
9. **Purchase orders**: Link POs to budgets and expenses
10. **Vendor performance**: Track vendor spending and reliability

## Testing

### Seed Data
Run `npx prisma db seed` to populate:
- Current quarter budget ($500K)
- 4 budget line items (Water/Desal, Helium, Equipment, Community)
- 2 sample expenses ($73.5K total)
- Expense line items with allocations
- Budget snapshots

### Manual Testing
1. Visit `/financials` to view dashboard
2. Upload an invoice via AI classification
3. Check auto-allocation in database
4. Verify budget snapshots updated
5. Test filters and period selection

## TypeScript Notes

**Known IDE Warnings**: TypeScript server may show errors for new Prisma models until reloaded. These are cosmetic and don't affect runtime. To fix:
- Restart TypeScript server: `Ctrl+Shift+P` → "TypeScript: Restart TS Server"
- Or restart dev server: `npm run dev`

The Prisma Client is correctly generated and works at runtime.
