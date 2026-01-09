# Collateral Amount Formatting Fix

## 🐛 **Critical Issue Found & Fixed**

### **Problem Description**

The collateral position amount was displaying incorrectly in the borrow modal because raw blockchain values (in wei/smallest unit) were not being converted to human-readable format.

---

## 📊 **Data Flow Analysis**

### **1. Backend API Response**

```json
{
  "creditLines": [
    {
      "collateralAmount": "90000000000000000000",  // 90 tokens with 18 decimals
      "creditLimit": "53550000000"                 // $53,550 with 6 decimals
    }
  ]
}
```

### **2. Adapter Processing** (`solvency-adapter.util.ts:25`)

**BEFORE (Buggy Code):**
```typescript
const amount = parseInt(line.collateralAmount); // ❌ PROBLEM!
// Result: amount = 90000000000000000000 (raw, not formatted)

return {
  amount,  // Still in raw format!
  valueUSD: parseInt(line.creditLimit) / 1_000_000, // ✅ Correctly formatted
  ...
};
```

**Issue**: The `amount` field is stored as a raw integer without dividing by decimals.

### **3. UI Display** (`UnifiedBorrowModal.tsx:174`)

**BEFORE (Buggy Code):**
```typescript
{selectedPosition ? selectedPosition.amount.toFixed(2) : '0'}
// Displayed: "90000000000000000000.00" ❌ WRONG!
```

**AFTER (Fixed Code):**
```typescript
{selectedPosition ? formatCollateralAmount(selectedPosition.amount, 18).toFixed(2) : '0'}
// Displays: "90.00" ✅ CORRECT!
```

---

## ✅ **The Fix**

### **Step 1: Created Formatting Utility**

Added `formatCollateralAmount()` to `src/utils/solvency/formatters.ts`:

```typescript
/**
 * Format collateral amount from raw value to human-readable number
 * @param value Raw amount as number or string (e.g., 90000000000000000000)
 * @param decimals Token decimals (default: 18 for most ERC20 tokens)
 * @returns Formatted number (e.g., 90.00)
 */
export const formatCollateralAmount = (
  value: number | string | null | undefined,
  decimals: number = 18
): number => {
  if (value === null || value === undefined || value === 0 || value === '0') {
    return 0;
  }

  try {
    // Convert to string if it's a number
    const valueStr = typeof value === 'number' ? value.toString() : value;

    // Use ethers to properly handle large numbers
    const formatted = ethers.formatUnits(valueStr, decimals);
    return parseFloat(formatted);
  } catch (error) {
    console.error('Error formatting collateral amount:', error, { value, decimals });
    return 0;
  }
};
```

**How it works:**
1. Takes raw value (e.g., `90000000000000000000`)
2. Uses `ethers.formatUnits(value, 18)` to divide by `10^18`
3. Returns human-readable number (e.g., `90.00`)

### **Step 2: Updated Borrow Modal**

**Import the formatter:**
```typescript
import { formatCollateralAmount } from '../../../utils/solvency/formatters';
```

**Use it in the display:**
```typescript
<div className="text-5xl font-light text-gray-900">
  {selectedPosition ? formatCollateralAmount(selectedPosition.amount, 18).toFixed(2) : '0'}
</div>
```

---

## 🔍 **Why This Issue Occurred**

### **Root Cause:**

The `CollateralPosition` interface defines:

```typescript
export interface CollateralPosition {
  amount: number; // raw amount in token decimals ← THIS!
  valueUSD: number; // USD value of collateral
  ...
}
```

The comment "raw amount in token decimals" indicates it's **not formatted**, but the adapter at `line 25-26` does:

```typescript
const amount = parseInt(line.collateralAmount);  // No division!
const valueUSD = parseInt(line.creditLimit) / 1_000_000;  // Properly divided
```

**Inconsistency:**
- `valueUSD` is correctly formatted (divided by 1M for 6 decimals)
- `amount` is NOT formatted (left as raw integer)

---

## 📝 **Comparison: Correct vs Incorrect**

| Component | Before (Wrong) | After (Correct) |
|---|---|---|
| **Raw Value** | `90000000000000000000` | `90000000000000000000` |
| **Formatter** | None (`.toFixed(2)` only) | `formatCollateralAmount(value, 18)` |
| **Display** | `90000000000000000000.00` ❌ | `90.00` ✅ |

---

## 🎯 **Standard Token Decimals**

| Token Type | Decimals | Example Raw | Example Formatted |
|---|---|---|---|
| **Most ERC20** | 18 | `90000000000000000000` | `90.00` |
| **USDC** | 6 | `50000000` | `50.00` |
| **USDT** | 6 | `100000000` | `100.00` |
| **WBTC** | 8 | `100000000` | `1.00` |

---

## ✅ **Testing Checklist**

- [x] Created `formatCollateralAmount()` utility
- [x] Updated borrow modal to use formatter
- [x] Tested with 18-decimal tokens (most ERC20)
- [x] Handles null/undefined gracefully
- [x] Handles zero values correctly
- [x] Uses ethers.js for safe large number handling
- [x] Error handling with try-catch
- [x] Console logging for debugging

---

## 🔄 **Similar Issues in Other Components**

### **MyLoansTable (Already Correct):**

```typescript
const formatCollateralAmount = (value: string, decimals: number = 18) => {
  if (!value) return '0.00';
  const num = parseFloat(value) / Math.pow(10, decimals);  // ✅ Correct!
  return num.toFixed(2);
};

// Usage:
{formatCollateralAmount(position.collateralAmount, 18)} tokens
```

This component already had the fix, which is why we used the same pattern.

---

## 📌 **Key Takeaways**

1. **Always check decimal places** when displaying blockchain values
2. **Raw values from contracts** are in smallest unit (wei/satoshi)
3. **Use `ethers.formatUnits()`** for safe conversion
4. **Standardize formatting** across all components
5. **Document expectations** in type definitions

---

## 🚀 **Result**

**Before:**
```
Collateral Position
90000000000000000000.00  ← WRONG!
$76,500.00
```

**After:**
```
Collateral Position
90.00  ← CORRECT!
$76,500.00
```

**The collateral amount now displays correctly as a human-readable value!** ✅
