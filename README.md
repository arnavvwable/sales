# 📊 E-Commerce Sales Analytics Dashboard

## Overview
A **single-file, browser-based** analytics dashboard for e-commerce businesses. No backend required — open `index.html` in any browser. Built with **Chart.js**, **Font Awesome**, and vanilla JS.

## 🎯 What This Dashboard Does

### Layer 1 — Sales Performance
| Feature | Description |
|---------|-------------|
| **KPI Cards** | Weekly / Monthly / Yearly revenue with comparison to previous period |
| **Revenue Chart** | Interactive bar chart of daily revenue, filterable by date & category |
| **Orders Table** | Full CRUD (Add / Edit / Delete) on orders with live updates |
| **Insights Panel** | Top category, top customer, avg daily revenue |

### Layer 2 — Behavioral Analytics
| Feature | Description |
|---------|-------------|
| **Conversion Funnel** | View → Cart → Checkout → Purchase conversion with drop-off rates |
| **Cohort Retention** | Heatmap showing % of users returning each month after first purchase |
| **RFM Segmentation** | Customers scored by Recency, Frequency, Monetary → segmented into Champions/Loyal/At Risk/Hibernating/New |
| **Feature Adoption** | Which product features (Discount, Express Ship, Gift Wrap) are used most |

### Layer 3 — Predictions & Explanations *(NEW)*
| Feature | Algorithm | Parameters |
|---------|-----------|------------|
| **Revenue Forecast** | 7-day Moving Average + Linear Trend | Past daily revenues, trend slope |
| **Growth Prediction** | Exponential Smoothing (α=0.3) | Historical monthly growth rates |
| **Churn Risk Score** | Weighted scoring model | Days since last purchase, order frequency, monetary value |
| **Next Purchase Prediction** | Average inter-purchase interval | Per-customer purchase dates |

---

## 🔬 How the Algorithms Work

### 1. Revenue Forecast (Moving Average + Linear Trend)
```
forecast[t] = MA(7) + trend_slope × days_ahead
```
- Calculates a 7-day moving average to smooth noise
- Fits a linear trend line (least-squares) to the moving averages
- Projects forward by extending the trend
- **Parameters**: window_size=7, projection_days=7

### 2. Growth Prediction (Exponential Smoothing)
```
smoothed[t] = α × actual[t] + (1 - α) × smoothed[t-1]
```
- Gives more weight (α=0.3) to recent data
- Older data decays exponentially
- Predicts next month's revenue based on smoothed trend
- **Parameters**: α (smoothing factor) = 0.3

### 3. Churn Risk Scoring
```
risk_score = (recency_score × 0.4) + (frequency_score × 0.35) + (monetary_score × 0.25)
```
- **Recency** (40% weight): Days since last purchase → higher = more risk
- **Frequency** (35% weight): Total orders → fewer = more risk  
- **Monetary** (25% weight): Total spend → lower = more risk
- Score 0-100, where 100 = highest churn risk
- **Thresholds**: 0-25 Low, 25-50 Medium, 50-75 High, 75-100 Critical

### 4. RFM Segmentation
Each customer scored 1-5 on Recency, Frequency, Monetary:
| Segment | Rule |
|---------|------|
| Champions | Avg score ≥ 4 |
| Loyal | Avg score ≥ 3.2 |
| At Risk | Frequency ≥ 2 but Recency ≤ 2 |
| Hibernating | Recency ≤ 2 |
| New | Everyone else |

### 5. Cohort Retention
- Groups users by their **first purchase month**
- Tracks what % made a purchase in subsequent months
- Month 0 = acquisition month (always 100%)

---

## 📁 Project Structure
```
sales dashboard/
├── index.html    ← Entire dashboard (HTML + CSS + JS in one file)
└── README.md     ← This file
```

## 🔧 Tech Stack
- **HTML5 / CSS3 / JavaScript** (vanilla, no frameworks)
- **Chart.js 4.4** — bar, doughnut, line charts
- **Font Awesome 6.5** — icons
- **Google Fonts (Inter)** — typography

## 🚀 How to Use
1. Open `index.html` in any modern browser
2. Use date range and category filters to explore data
3. Click **+ Add Order** to create orders (stored in-memory)
4. All charts, KPIs, predictions update live on filter/CRUD changes
5. Hover over any ℹ️ icon to understand how each metric is calculated

## 📋 Changes Made (v2 Redesign)

### UI/UX Improvements
- ✅ Redesigned KPIs as Weekly/Monthly/Yearly cards with period comparisons (inspired by reference)
- ✅ Added info tooltips explaining every algorithm directly on page
- ✅ Improved color scheme: green/cyan/purple palette on dark background
- ✅ Better typography and spacing for readability  
- ✅ Responsive grid layout for all screen sizes

### Data & Analytics Additions
- ✅ Revenue forecast with 7-day moving average + trend line
- ✅ Churn risk scoring with weighted model
- ✅ Self-documenting: each section explains its parameters and logic
- ✅ Fixed cohort retention Month 0 bug (timezone-safe month calculation)
- ✅ 40 realistic orders spanning Jan–Mar 2024 with 10 mock customers

### Architecture
- ✅ Single-file deployment (no build step, no dependencies to install)
- ✅ All data client-side in JavaScript arrays
- ✅ Event-driven updates: any filter/CRUD change refreshes all components

## 📊 Data Model
```javascript
// Order
{ id, date, userId, category, amount, features[] }

// Event (generated per order)
{ eventType, date, userId, orderId, amount }
// Types: view_product → add_to_cart → initiate_checkout → purchase

// RFM Customer
{ userId, recency (days), frequency (count), monetary ($), segment }
```

## License
MIT — Free for personal and commercial use.
