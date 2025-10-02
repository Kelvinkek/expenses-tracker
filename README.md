# 💰 Expense Tracker Mobile App

A beautiful, multi-account expense tracking app with real-time Google Sheets synchronization and advanced analytics.

## ✨ Features

### 🎯 Core Features
- ✅ **Multi-Account Support** - Track expenses for Kek, Nat, and Joint Account separately
- ✅ **One-Tap Category Selection** - Quick button-based selection (Income, Needs, Wants)
- ✅ **Batch Entry** - Add multiple expenses at once
- ✅ **Real-time Sync** - Automatic synchronization with Google Sheets
- ✅ **Progressive Web App (PWA)** - Install on mobile devices
- ✅ **Mobile-First Design** - Optimized for smartphones and tablets

### 📊 Analytics & Visualizations
- 📈 **Interactive Charts** - Pie charts for expense distribution
- 📊 **Monthly Trends** - Bar charts showing income vs expenses over time
- 💰 **Automatic Savings Calculation** - Track your monthly savings
- 📅 **Monthly Breakdown** - Detailed summaries for each month
- 🔍 **Recent Transactions** - View your last 30 expenses

### 🎨 User Experience
- 🌈 **Color-Coded Accounts** - Purple (Kek), Pink (Nat), Blue (Joint)
- 🎯 **Intuitive Interface** - Clean, modern design
- ⚡ **Fast Loading** - Optimized performance
- 📱 **Touch-Friendly** - Large buttons for easy mobile use

## 🖼️ Screenshots

### Account Selection
Beautiful landing page to choose your account:
- Kek (Personal - Purple theme)
- Nat (Personal - Pink theme)
- Joint Account (Shared - Blue theme)

### Add Expenses
- Quick date selection
- Button-based category picker
- Simple description and amount fields
- Add multiple entries before saving

### History & Analytics
- Summary cards for Income, Needs, and Wants
- Total savings display
- Pie chart for expense distribution
- Monthly trends bar chart
- Detailed transaction history

## 🛠️ Tech Stack

### Backend
- **Framework**: Flask (Python)
- **Database**: Google Sheets API
- **Authentication**: Google OAuth2
- **CORS**: Flask-CORS
- **Server**: Gunicorn

### Frontend
- **Framework**: React 18
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Icons**: Lucide React
- **Build Tool**: Create React App
- **PWA**: Service Workers

## 📋 Prerequisites

- Python 3.8 or higher
- Node.js 14 or higher
- Google Cloud Project with Sheets API enabled
- Google Service Account credentials

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone <your-repo-url>
cd expense-tracker
```

### 2. Backend Setup

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# Mac/Linux
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 3. Google Sheets Configuration

1. Create a Google Cloud Project
2. Enable Google Sheets API and Google Drive API
3. Create a Service Account
4. Download credentials JSON file
5. Rename to `ruleyourmoney.json` and place in `backend/` folder
6. Create a Google Sheet named "Monthly Expenses"
7. Share the sheet with your service account email

### 4. Frontend Setup

```bash
cd frontend
npm install
```

### 5. Environment Variables

Create `.env` file in frontend folder:
```env
REACT_APP_API_URL=http://localhost:5000/api
```

### 6. Run the Application

**Terminal 1 - Backend:**
```bash
cd backend
python app.py
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm start
```

The app will open at `http://localhost:3000`

## 📁 Project Structure

```
expense-tracker/
├── backend/
│   ├── app.py                 # Main Flask application
│   ├── requirements.txt       # Python dependencies
│   ├── ruleyourmoney.json    # Google credentials (not in repo)
│   └── render.yaml           # Deployment config
│
├── frontend/
│   ├── public/
│   │   ├── index.html
│   │   ├── manifest.json
│   │   └── icons/
│   ├── src/
│   │   ├── App.jsx           # Main React component
│   │   ├── index.js          # Entry point
│   │   └── index.css         # Global styles
│   └── package.json
│
└── README.md
```

## 🔑 API Endpoints

### GET `/api/health`
Health check endpoint
```json
{ "status": "ok", "message": "Backend is running" }
```

### GET `/api/accounts`
Get available accounts
```json
{ "accounts": ["Kek", "Nat", "Joint"] }
```

### GET `/api/categories`
Get expense categories
```json
{ "categories": ["Income", "Needs", "Wants"] }
```

### POST `/api/expenses`
Add new expenses
```json
{
  "account": "Kek",
  "expenses": [
    {
      "date": "2024-01-15",
      "description": "Grocery shopping",
      "category": "Needs",
      "amount": 150.50
    }
  ]
}
```

### GET `/api/summary?account=Kek`
Get expense summary for specific account
```json
{
  "expenses": [...],
  "total": 42,
  "categoryTotals": {
    "Income": 5000,
    "Needs": 2000,
    "Wants": 500
  },
  "monthlySummary": [...],
  "savings": 2500,
  "account": "Kek"
}
```

## 📊 Google Sheets Structure

The app creates the following sheets automatically:

### Raw Data Sheets
- `Kek_Expenses` - All Kek's transactions
- `Nat_Expenses` - All Nat's transactions
- `Joint_Expenses` - All Joint account transactions

### Formatted Yearly Sheets
- `Kek_2024`, `Kek_2025`, etc.
- `Nat_2024`, `Nat_2025`, etc.
- `Joint_2024`, `Joint_2025`, etc.

Each yearly sheet contains:
- Monthly sections with income and expenses
- Automatic total calculations
- Savings from previous month carried forward
- Beautiful formatting and cell alignment

## 🎯 How to Use

### Adding Expenses
1. **Select Account** - Choose Kek, Nat, or Joint Account
2. **Set Date** - Pick the transaction date
3. **Choose Category** - Tap Income, Needs, or Wants button
4. **Enter Details** - Add description and amount
5. **Add More** (Optional) - Click "Add Another Entry"
6. **Save** - Tap "Save All Expenses" to sync

### Viewing Analytics
1. **Switch to History Tab** - Tap "History" button
2. **Review Summary** - See income, needs, wants totals
3. **Check Savings** - View your current savings
4. **Analyze Charts** - Study pie chart and monthly trends
5. **Browse Transactions** - Scroll through recent expenses

### Switching Accounts
- Tap "Change Account" button in the header
- Select different account from landing page
- Each account maintains separate data

## 🔧 Troubleshooting

### Backend Issues

**Error: ModuleNotFoundError: No module named 'flask_cors'**
```bash
pip install flask-cors
```

**Error: Google Sheets authentication failed**
- Verify `ruleyourmoney.json` is in backend folder
- Check service account has access to the spreadsheet
- Ensure APIs are enabled in Google Cloud Console

### Frontend Issues

**Error: Cannot connect to backend**
- Verify backend is running on port 5000
- Check `REACT_APP_API_URL` in `.env` file
- Ensure CORS is enabled in backend

**Charts not displaying**
```bash
npm install recharts
```

### Data Issues

**Expenses not saving**
- Check backend console for errors
- Verify Google Sheets is accessible
- Ensure account name is valid (Kek, Nat, or Joint)

**History tab empty**
- Make sure you've added some expenses first
- Check browser console for API errors
- Verify the correct account is selected

## 🚀 Deployment

### Backend (Render/Heroku)

1. Set environment variable:
```
GOOGLE_CREDENTIALS_JSON=<your-credentials-json>
```

2. Deploy using:
```bash
gunicorn app:app
```

### Frontend (Vercel/Netlify)

1. Build the app:
```bash
npm run build
```

2. Set environment variable:
```
REACT_APP_API_URL=https://your-backend-url.com/api
```

3. Deploy the `build` folder

## 📝 Development Notes

### Adding New Accounts
Edit `ACCOUNTS` list in `backend/app.py`:
```python
ACCOUNTS = ["Kek", "Nat", "Joint", "NewAccount"]
```

Add account info in `frontend/src/App.jsx`:
```javascript
const accounts = [
  { id: 'NewAccount', name: 'New Account', icon: User, color: 'from-orange-500 to-orange-600' }
];
```

### Adding New Categories
Edit `CATEGORIES` in both backend and frontend:
```python
CATEGORIES = ["Income", "Needs", "Wants", "Savings"]
```

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👥 Authors

- **Your Name** - Initial work

## 🙏 Acknowledgments

- Built with React and Flask
- Charts powered by Recharts
- Icons from Lucide React
- Styling with Tailwind CSS
- Data storage via Google Sheets API

## 📞 Support

For support, please open an issue on GitHub or contact the maintainers.

## 🔮 Future Enhancements

Planned features for future releases:

- [ ] Search and filter expenses
- [ ] Export to CSV/PDF
- [ ] Budget goals with alerts
- [ ] Recurring expenses
- [ ] Dark mode
- [ ] Multi-currency support
- [ ] Receipt photo upload
- [ ] Expense categories customization
- [ ] Email reports
- [ ] Expense comparison between accounts

---

Made with ❤️ for better financial tracking
