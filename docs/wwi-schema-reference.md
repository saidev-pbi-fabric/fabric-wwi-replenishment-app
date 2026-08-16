# WWI DW schema reference (verified columns, not guessed)

Source: `microsoft/sql-server-samples`, `wwi-dw-ssdt` project (the real DDL, not the tutorial's
simplified table list). Loaded into Fabric via the native Warehouse Copy Job wizard: **New Item →
Copy job → Sample data → "Retail Data Model from Wide World Importers"**.

## Fact.Order
Source: `Sales.Orders` + `Sales.OrderLines`.

| Column | Type | Notes |
|---|---|---|
| Order Key | BIGINT | PK |
| City Key, Customer Key, Stock Item Key | INT | FKs |
| Order Date Key, Picked Date Key | DATE | FKs to Dimension.Date |
| Salesperson Key, Picker Key | INT | FKs to Dimension.Employee |
| **WWI Backorder ID** | INT, nullable | **Populated = this line is a backorder.** Direct signal, no derivation needed. |
| Quantity | INT | |
| Unit Price, Total Excluding Tax, Tax Amount, Total Including Tax | DECIMAL(18,2) | |

## Fact.Stock Holding
Source: `Warehouse.StockItemHoldings`.

| Column | Type | Notes |
|---|---|---|
| Stock Holding Key | BIGINT | PK |
| Stock Item Key | INT | FK |
| **Quantity On Hand** | INT | Current stock level |
| **Reorder Level** | INT | **At-risk rule: `Quantity On Hand < Reorder Level`.** |
| **Target Stock Level** | INT | Feeds suggested reorder quantity: `Target Stock Level - Quantity On Hand` |
| Bin Location | NVARCHAR(20) | |
| Last Cost Price | DECIMAL(18,2) | |

## Fact.Purchase
Source: `Purchasing.PurchaseOrderLines`.

| Column | Type | Notes |
|---|---|---|
| Purchase Key | BIGINT | PK |
| Supplier Key, Stock Item Key | INT | FKs |
| Ordered Outers, Ordered Quantity, Received Outers | INT | Expected vs received |
| **Is Order Finalized** | BIT | Use to check "already on order" before suggesting a new reorder |

## Dimension.Stock Item
| Column | Type | Notes |
|---|---|---|
| Stock Item Key | INT | PK |
| Stock Item | NVARCHAR(100) | Display name |
| **Lead Time Days** | INT | Feeds reorder urgency/priority |
| Unit Price, Recommended Retail Price | DECIMAL(18,2) | |

## Dimension.Supplier
| Column | Type | Notes |
|---|---|---|
| Supplier Key | INT | PK |
| Supplier | NVARCHAR(100) | Display name |
| Category, Primary Contact | NVARCHAR | |
| Payment Days | INT | |

## Replenishment risk rule (derived, not invented)
An item is **at risk** when `Fact.Stock Holding.Quantity On Hand < Fact.Stock Holding.Reorder Level`,
or when it has an unresolved `Fact.Order.WWI Backorder ID`. Suggested reorder quantity defaults to
`Target Stock Level - Quantity On Hand`. Priority/urgency uses `Dimension.Stock Item.Lead Time Days`.
Check `Fact.Purchase` for a matching non-finalized order before suggesting a new one (avoid duplicate
suggestions for items already on order).
