# WWI schema reference (verified against the actual loaded tables)

Source: Fabric Warehouse Copy Job wizard's **"Retail Data Model from Wide World Importers"**
sample (New Item → Copy job → Sample data), landed into `WWIWarehouse.dbo` in workspace
`Fabric-App-Hackathon`. Verified 2026-08-17 via `onelake_get_table` (Iceberg/Delta metadata) against
the live tables — not from GitHub DDL, not guessed.

**This is a different, smaller artifact than the `wwi-dw-ssdt` GitHub sample.** It is 6 flat tables,
no purchasing/stock-holding/backorder tables exist. The previous version of this doc (researched
from `microsoft/sql-server-samples` `wwi-dw-ssdt`) described a schema that was never actually
loaded — `Fact.Order`, `Fact.Stock Holding`, `Fact.Purchase`, `Dimension.Supplier` **do not exist**.
Do not reference those names anywhere in this project.

## fact_sale
~50.15M rows. One row per invoice line (`WWIInvoiceID` + line).

| Column | Type | Notes |
|---|---|---|
| SaleKey | bigint | PK |
| CityKey, CustomerKey, BillToCustomerKey, StockItemKey, SalespersonKey | int | FKs |
| InvoiceDateKey, DeliveryDateKey | timestamptz | FKs to dimension_date (join on `Date`) |
| WWIInvoiceID | int | |
| Description, Package | string | |
| Quantity | int | Units sold on this line |
| UnitPrice, TotalExcludingTax, TaxAmount, TotalIncludingTax, Profit | decimal(18,2) | |
| TaxRate | decimal(18,3) | |
| TotalDryItems, TotalChillerItems | int | |
| LineageKey | int | |

**No stock-on-hand, reorder-level, or backorder column exists anywhere in this table or the whole
model.** This is a sales fact only.

**Verified via direct SQL (2026-08-17, AAD-token connection to the SQL analytics endpoint):**
`InvoiceDateKey`/`DeliveryDateKey` span only **335 distinct dates, 2000-01-01 to 2000-11-30** —
the entire 50.15M rows are one ~11-month window, not multi-year history. This is not a
"filter to a recent date range" problem (there's no multi-year span to trim) — it's ~150K
rows/day. **Import-mode grain decision: aggregate at load time, not row-level.** Grouping to
(StockItemKey, InvoiceDateKey) with `SUM(Quantity)`, `SUM(TotalExcludingTax)`, `SUM(TaxAmount)`,
`SUM(Profit)`, `SUM(TotalIncludingTax)`, `COUNT(*)` folds server-side to **73,365 rows** —
trivial for Import on trial capacity. No city/customer/salesperson breakdown is needed per
`SPEC.md` success criteria (KPI strip, at-risk trend chart, top-at-risk ranked list — all
stock-item + date grain), so those columns are dropped from the semantic model fact table.

## dimension_stock_item
672 rows.

| Column | Type | Notes |
|---|---|---|
| StockItemKey | int | PK |
| WWIStockItemID | int | |
| StockItem | string | Display name |
| Color, SellingPackage, BuyingPackage, Brand, Size, Barcode | string | |
| **LeadTimeDays** | int | Only supply-side signal available — usable for reorder urgency |
| QuantityPerOuter | int | |
| IsChillerStock | boolean | |
| TaxRate | decimal(18,3) | |
| UnitPrice, RecommendedRetailPrice | decimal(18,2) | |
| TypicalWeightPerUnit | decimal(18,3) | |
| Photo | binary | |
| ValidFrom, ValidTo | timestamptz | SCD2 columns (this sample is a snapshot, not tracking history) |
| LineageKey | int | |

**No current quantity-on-hand or reorder-level column.**

## dimension_city
116,295 rows. CityKey PK; City, StateProvince, Country, Continent, SalesTerritory, Region,
Subregion, Location, LatestRecordedPopulation, ValidFrom/ValidTo, LineageKey.

## dimension_customer
403 rows. CustomerKey PK; WWICustomerID, Customer, BillToCustomer, Category, BuyingGroup,
PrimaryContact, PostalCode, ValidFrom/ValidTo, LineageKey.

## dimension_date
6,210 rows. `Date` (timestamptz) is the join key — not a separate DateKey int. DayNumber, Day,
Month, ShortMonth, CalendarMonthNumber, CalendarMonthLabel, CalendarYear, CalendarYearLabel,
FiscalMonthNumber, FiscalMonthLabel, FiscalYear, FiscalYearLabel, ISOWeekNumber.

## dimension_employee
213 rows. EmployeeKey PK; WWIEmployeeID, Employee, PreferredName, IsSalesperson (boolean),
Photo, ValidFrom/ValidTo, LineageKey.

## Replenishment risk rule — re-derived (proxy, not a real inventory rule)

There is no real stock-on-hand or backorder signal in this dataset, so the "back-order risk"
framing from the original scope can't be literal. Reframed as **demand-driven reorder
attention**, built only from `fact_sale` + `dimension_stock_item` + `dimension_date`:

- **Recent daily sales rate** — avg `Quantity` per day over a trailing window (e.g. last 30 days
  of data present in the filtered import range).
- **Prior daily sales rate** — same window, immediately preceding period (e.g. days 31-60 back).
- **Demand trend** — recent rate vs prior rate. Accelerating demand (recent > prior) raises risk.
- **Suggested Reorder Qty (proxy)** — classic reorder-point formula using the only real supply
  signal available: `Recent Daily Sales Rate × StockItem.LeadTimeDays`, optionally with a safety
  buffer (e.g. ×1.2).
- **At-Risk flag** — item ranks high on `Suggested Reorder Qty` *and* `LeadTimeDays`, i.e. items
  that sell fast and take a long time to restock are flagged first. No real on-hand quantity to
  compare against, so this is a relative ranking (top-N / percentile), not an absolute threshold.
- **Priority** — `LeadTimeDays` bucketed (e.g. short/medium/long) combines with the demand trend
  to set severity tier for the Action Center.

This is a deliberate, disclosed proxy — call it out in the demo talk-track as "no real inventory
table in this sample dataset, so risk is derived from sales velocity vs lead time" rather than
presenting it as literal stock-level tracking.
