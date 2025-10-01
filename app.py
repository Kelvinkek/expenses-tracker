from flask import Flask, request, jsonify
from flask_cors import CORS
import gspread
from google.oauth2.service_account import Credentials
from datetime import datetime
import os
import json

# For production: Load credentials from environment variable
if os.getenv('GOOGLE_CREDENTIALS_JSON'):
    creds_dict = json.loads(os.getenv('GOOGLE_CREDENTIALS_JSON'))
    CREDENTIALS_FILE = 'temp_creds.json'
    with open(CREDENTIALS_FILE, 'w') as f:
        json.dump(creds_dict, f)
elif not os.path.exists(os.getenv("GOOGLE_CREDENTIALS_FILE", "ruleyourmoney.json")):
    raise FileNotFoundError("Google credentials file not found")

app = Flask(__name__)
CORS(app)  # Enable CORS for React frontend

# === Configuration ===
CREDENTIALS_FILE = os.getenv("GOOGLE_CREDENTIALS_FILE", "ruleyourmoney.json")
SPREADSHEET_NAME = "Monthly Expenses"
SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive"
]
HEADERS = ["Date", "Description", "Category", "Amount"]
CATEGORIES = ["Income", "Needs", "Wants"]

# === Initialize Google Sheets ===
def init_google_sheets():
    try:
        creds = Credentials.from_service_account_file(CREDENTIALS_FILE, scopes=SCOPES)
        client = gspread.authorize(creds)
        spreadsheet = client.open(SPREADSHEET_NAME)
        
        try:
            raw_sheet = spreadsheet.worksheet("Expenses")
        except gspread.exceptions.WorksheetNotFound:
            raw_sheet = spreadsheet.add_worksheet("Expenses", rows=1000, cols=10)
            raw_sheet.append_row(HEADERS)
        
        return spreadsheet, raw_sheet
    except Exception as e:
        print(f"Error initializing Google Sheets: {str(e)}")
        raise

spreadsheet, raw_sheet = init_google_sheets()
year_sheet_cache = {}

def get_year_sheet(year_name: str):
    if year_name in year_sheet_cache:
        return year_sheet_cache[year_name]
    
    try:
        year_sheet = spreadsheet.worksheet(year_name)
    except gspread.exceptions.WorksheetNotFound:
        year_sheet = spreadsheet.add_worksheet(year_name, rows=1000, cols=6)
        apply_initial_formatting(year_sheet)
    
    year_sheet_cache[year_name] = year_sheet
    return year_sheet

def apply_initial_formatting(year_sheet):
    format_requests = [
        {
            "updateDimensionProperties": {
                "range": {
                    "sheetId": year_sheet.id,
                    "dimension": "COLUMNS",
                    "startIndex": 0,
                    "endIndex": 6
                },
                "properties": {"pixelSize": 150},
                "fields": "pixelSize"
            }
        },
        {
            "repeatCell": {
                "range": {
                    "sheetId": year_sheet.id,
                    "startRowIndex": 0,
                    "endRowIndex": 1000,
                    "startColumnIndex": 0,
                    "endColumnIndex": 6
                },
                "cell": {
                    "userEnteredFormat": {
                        "horizontalAlignment": "CENTER",
                        "verticalAlignment": "MIDDLE"
                    }
                },
                "fields": "userEnteredFormat(horizontalAlignment,verticalAlignment)"
            }
        }
    ]
    spreadsheet.batch_update({"requests": format_requests})

def find_previous_month_savings_cell(year_name: str, month: int):
    if month == 1:
        prev_year = str(int(year_name) - 1)
        prev_month = 12
        try:
            prev_year_sheet = spreadsheet.worksheet(prev_year)
            all_values = prev_year_sheet.get_all_values()
            sheet_name = prev_year
        except:
            return None
    else:
        prev_month = month - 1
        year_sheet = get_year_sheet(year_name)
        all_values = year_sheet.get_all_values()
        sheet_name = year_name
    
    prev_month_name = datetime(2000, prev_month, 1).strftime("%B")
    
    for i, row in enumerate(all_values):
        if row and prev_month_name in str(row[0]):
            for j in range(i + 1, min(i + 50, len(all_values))):
                if all_values[j] and "Savings" in str(all_values[j][1]):
                    return f"'{sheet_name}'!C{j + 1}"
    return None

def append_to_month(year_sheet, month: int, year_name: str, income_rows, needs_rows, wants_rows):
    """Append rows to a specific month without clearing existing data"""
    all_values = year_sheet.get_all_values()
    month_name = datetime(int(year_name), month, 1).strftime("%B")
    
    # Find month header row
    month_row = None
    for i, row in enumerate(all_values):
        if row and month_name in str(row[0]):
            month_row = i
            break
    
    print(f"DEBUG: Processing {month_name} {year_name}, found at row: {month_row}")
    
    if month_row is None:
        # Create new month section
        last_content_row = 0
        for i in range(len(all_values) - 1, -1, -1):
            if any(cell for cell in all_values[i] if str(cell).strip()):
                last_content_row = i + 1
                break
        
        last_row = last_content_row + 3 if last_content_row > 0 else 1
        prev_savings_cell = find_previous_month_savings_cell(year_name, month)
        
        year_sheet.update(f'A{last_row}', [[f"{month_name} {year_name}"]])
        
        spreadsheet.batch_update({"requests": [{
            "mergeCells": {
                "range": {
                    "sheetId": year_sheet.id,
                    "startRowIndex": last_row - 1,
                    "endRowIndex": last_row,
                    "startColumnIndex": 0,
                    "endColumnIndex": 6
                },
                "mergeType": "MERGE_ALL"
            }
        }]})
        
        last_row += 1
        year_sheet.update(f'A{last_row}', [["Date", "Source of income", "Amount", "Date", "Description", "Amount"]])
        
        last_row += 1
        data_start_row = last_row
        
        all_income_rows = []
        if prev_savings_cell:
            all_income_rows.append(["", "FROM Previous month", f"={prev_savings_cell}"])
        all_income_rows.extend(income_rows)
        
        all_expense_rows = needs_rows + wants_rows
        
        new_rows = []
        max_rows = max(len(all_income_rows), len(all_expense_rows))
        
        for i in range(max_rows):
            row = ["", "", "", "", "", ""]
            if i < len(all_income_rows):
                row[0:3] = all_income_rows[i]
            if i < len(all_expense_rows):
                row[3:6] = all_expense_rows[i]
            new_rows.append(row)
        
        year_sheet.update(f'A{last_row}', new_rows, value_input_option='USER_ENTERED')
        
        last_row += len(new_rows)
        data_end_row = last_row - 1
        year_sheet.update(f'A{last_row}', [["", "", "", "", "", ""]])
        
        last_row += 1
        totals_formula_income = f"=SUM(C{data_start_row}:C{data_end_row})"
        totals_formula_expenses = f"=SUM(F{data_start_row}:F{data_end_row})"
        
        year_sheet.update(f'A{last_row}', [["", "Total income", totals_formula_income, "", "", ""]], 
                         value_input_option='USER_ENTERED')
        
        last_row += 1
        savings_formula = f"=C{last_row - 1}-F{last_row}"
        year_sheet.update(f'A{last_row}', [["", "Savings", savings_formula, "", "Total expenses", totals_formula_expenses]], 
                         value_input_option='USER_ENTERED')
        
        last_row += 1
        year_sheet.update(f'A{last_row}:{last_row + 1}', [["", "", "", "", "", ""], ["", "", "", "", "", ""]])
        return
    
    # If month exists, insert before spacing row (which is before totals)
    insert_row = None
    for i in range(month_row + 2, len(all_values)):
        if all_values[i] and ("Total income" in str(all_values[i]) or "total income" in str(all_values[i]).lower()):
            # Insert before the spacing row, which is one row before Total income
            insert_row = i
            break
    
    if insert_row:
        # Combine needs and wants
        all_expense_rows = needs_rows + wants_rows
        
        # Create combined rows
        new_rows = []
        max_rows = max(len(income_rows), len(all_expense_rows))
        
        for i in range(max_rows):
            row = ["", "", "", "", "", ""]
            
            if i < len(income_rows):
                row[0] = income_rows[i][0]  # Date
                row[1] = income_rows[i][1]  # Description
                row[2] = income_rows[i][2]  # Amount
            
            if i < len(all_expense_rows):
                row[3] = all_expense_rows[i][0]  # Date
                row[4] = all_expense_rows[i][1]  # Description
                row[5] = all_expense_rows[i][2]  # Amount
            
            new_rows.append(row)
        
        print(f"DEBUG: Inserting {len(new_rows)} rows at position {insert_row}")
        
        # Insert rows before the spacing row
        year_sheet.insert_rows(new_rows, insert_row, value_input_option='USER_ENTERED')
        
        # Update formulas (spacing row is now at insert_row + len(new_rows))
        spacing_row = insert_row + len(new_rows)
        totals_row = spacing_row + 1
        total_expenses_row = totals_row + 1
        
        data_start = month_row + 3
        data_end = spacing_row - 1
        
        print(f"DEBUG: Formula ranges - data_start: {data_start}, data_end: {data_end}")
        print(f"DEBUG: Totals at row {totals_row}, Expenses at row {total_expenses_row}")
        
        totals_formula_income = f"=SUM(C{data_start}:C{data_end})"
        totals_formula_expenses = f"=SUM(F{data_start}:F{data_end})"
        
        # Total income row
        year_sheet.update(f'A{totals_row}', [["", "Total income", totals_formula_income, 
                                               "", "", ""]], value_input_option='USER_ENTERED')
        
        # Savings and Total expenses on same row
        savings_formula = f"=C{totals_row}-F{total_expenses_row}"
        year_sheet.update(f'A{total_expenses_row}', [["", "Savings", savings_formula, 
                                                "", "Total expenses", totals_formula_expenses]], 
                         value_input_option='USER_ENTERED')
        
        print(f"DEBUG: Successfully updated {month_name} formulas")

# === API Routes ===

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({"status": "ok", "message": "Backend is running"})

@app.route('/api/expenses', methods=['POST'])
def add_expenses():
    try:
        data = request.json
        expenses = data.get('expenses', [])
        
        if not expenses:
            return jsonify({"error": "No expenses provided"}), 400
        
        print(f"\n{'='*50}")
        print(f"Processing {len(expenses)} expenses")
        print(f"{'='*50}")
        
        # Validate and group expenses
        grouped = {}
        for expense in expenses:
            date_str = expense.get('date')
            description = expense.get('description')
            category = expense.get('category')
            amount = expense.get('amount')
            
            # Validation
            if not description or not description.strip():
                return jsonify({"error": f"Description cannot be empty"}), 400
            
            if not amount or float(amount) <= 0:
                return jsonify({"error": f"Amount must be greater than 0"}), 400
            
            if category not in CATEGORIES:
                return jsonify({"error": f"Invalid category: {category}"}), 400
            
            try:
                datetime.strptime(date_str, "%Y-%m-%d")
            except:
                return jsonify({"error": f"Invalid date format: {date_str}"}), 400
            
            print(f"Adding to raw sheet: {date_str} | {description} | {category} | {amount}")
            
            # Add to raw sheet
            raw_sheet.append_row([date_str, description, category, float(amount)])
            
            # Group by year/month
            date_obj = datetime.strptime(date_str, "%Y-%m-%d")
            year_name = date_obj.strftime("%Y")
            month = date_obj.month
            
            key = (year_name, month)
            if key not in grouped:
                grouped[key] = {'income': [], 'needs': [], 'wants': []}
            
            if category == "Income":
                grouped[key]['income'].append([date_str, description, float(amount)])
            elif category == "Needs":
                grouped[key]['needs'].append([date_str, description, float(amount)])
            else:
                grouped[key]['wants'].append([date_str, description, float(amount)])
        
        # Update year sheets
        for (year_name, month), data in grouped.items():
            month_name = datetime(int(year_name), month, 1).strftime("%B")
            print(f"\nUpdating {month_name} {year_name}:")
            print(f"  Income entries: {len(data['income'])}")
            print(f"  Needs entries: {len(data['needs'])}")
            print(f"  Wants entries: {len(data['wants'])}")
            
            # Clear cache to ensure fresh data
            if year_name in year_sheet_cache:
                del year_sheet_cache[year_name]
            
            year_sheet = get_year_sheet(year_name)
            append_to_month(year_sheet, month, year_name, data['income'], data['needs'], data['wants'])
        
        print(f"\n{'='*50}")
        print(f"Successfully processed all expenses")
        print(f"{'='*50}\n")
        
        return jsonify({
            "success": True,
            "message": f"Added {len(expenses)} expense(s) successfully",
            "count": len(expenses)
        })
        
    except Exception as e:
        print(f"\nERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@app.route('/api/summary', methods=['GET'])
def get_summary():
    try:
        # Get recent expenses from raw sheet
        all_data = raw_sheet.get_all_values()
        
        if len(all_data) <= 1:
            return jsonify({"expenses": [], "total": 0})
        
        # Get last 50 expenses (excluding header)
        recent = all_data[-50:]
        expenses = []
        
        for row in recent:
            if len(row) >= 4 and row[0]:
                expenses.append({
                    "date": row[0],
                    "description": row[1],
                    "category": row[2],
                    "amount": float(row[3]) if row[3] else 0
                })
        
        expenses.reverse()  # Most recent first
        
        return jsonify({
            "expenses": expenses,
            "total": len(expenses)
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/categories', methods=['GET'])
def get_categories():
    return jsonify({"categories": CATEGORIES})

# if __name__ == '__main__':
#     app.run(debug=True, host='0.0.0.0', port=5000)

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    app.run(debug=False, host='0.0.0.0', port=port)