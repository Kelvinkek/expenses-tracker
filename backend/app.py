from flask import Flask, request, jsonify
from flask_cors import CORS
import gspread
from google.oauth2.service_account import Credentials
from datetime import datetime
import os
import json
from collections import defaultdict

app = Flask(__name__)
CORS(app)

# === Configuration ===
def get_credentials_file():
    """Get credentials from environment variable or local file"""
    if os.getenv('GOOGLE_CREDENTIALS_JSON'):
        creds_dict = json.loads(os.getenv('GOOGLE_CREDENTIALS_JSON'))
        temp_file = '/tmp/credentials.json'
        with open(temp_file, 'w') as f:
            json.dump(creds_dict, f)
        return temp_file
    else:
        return os.getenv("GOOGLE_CREDENTIALS_FILE", "ruleyourmoney.json")

CREDENTIALS_FILE = get_credentials_file()
SPREADSHEET_NAME = "Monthly Expenses"

SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive"
]
HEADERS = ["Date", "Description", "Category", "Amount", "Account"]
CATEGORIES = ["Income", "Needs", "Wants"]
ACCOUNTS = ["Kek", "Nat", "Joint"]

# === Initialize Google Sheets ===
def init_google_sheets():
    try:
        creds = Credentials.from_service_account_file(CREDENTIALS_FILE, scopes=SCOPES)
        client = gspread.authorize(creds)
        spreadsheet = client.open(SPREADSHEET_NAME)
        
        # Initialize sheets for each account
        sheets = {}
        for account in ACCOUNTS:
            sheet_name = f"{account}_Expenses"
            try:
                sheets[account] = spreadsheet.worksheet(sheet_name)
            except gspread.exceptions.WorksheetNotFound:
                sheets[account] = spreadsheet.add_worksheet(sheet_name, rows=1000, cols=10)
                sheets[account].append_row(HEADERS)
        
        return spreadsheet, sheets
    except Exception as e:
        print(f"Error initializing Google Sheets: {str(e)}")
        raise

spreadsheet, account_sheets = init_google_sheets()
year_sheet_cache = {}

def get_year_sheet(year_name: str, account: str):
    cache_key = f"{account}_{year_name}"
    if cache_key in year_sheet_cache:
        return year_sheet_cache[cache_key]
    
    sheet_name = f"{account}_{year_name}"
    try:
        year_sheet = spreadsheet.worksheet(sheet_name)
    except gspread.exceptions.WorksheetNotFound:
        year_sheet = spreadsheet.add_worksheet(sheet_name, rows=1000, cols=6)
        apply_initial_formatting(year_sheet)
    
    year_sheet_cache[cache_key] = year_sheet
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

def rebuild_yearly_sheets(account: str):
    """Rebuild all yearly sheets from scratch using raw expense data"""
    print(f"\n{'='*60}")
    print(f"REBUILDING YEARLY SHEETS FOR {account}")
    print(f"{'='*60}")
    
    # Get all expenses from raw sheet
    raw_sheet = account_sheets[account]
    all_data = raw_sheet.get_all_values()
    
    if len(all_data) <= 1:
        print(f"No data found for {account}")
        return
    
    # Group expenses by year and month
    expenses_by_year_month = defaultdict(lambda: {'income': [], 'needs': [], 'wants': []})
    
    for row in all_data[1:]:  # Skip header
        if len(row) >= 4 and row[0] and row[3]:
            try:
                date_str = row[0]
                description = row[1]
                category = row[2]
                amount = float(row[3])
                
                date_obj = datetime.strptime(date_str, "%Y-%m-%d")
                year_name = date_obj.strftime("%Y")
                month = date_obj.month
                
                key = (year_name, month)
                
                if category == "Income":
                    expenses_by_year_month[key]['income'].append([date_str, description, amount])
                elif category == "Needs":
                    expenses_by_year_month[key]['needs'].append([date_str, description, amount])
                elif category == "Wants":
                    expenses_by_year_month[key]['wants'].append([date_str, description, amount])
                    
            except (ValueError, IndexError) as e:
                print(f"Skipping invalid row: {row}, Error: {e}")
                continue
    
    # Get all unique years
    years = set(year_month[0] for year_month in expenses_by_year_month.keys())
    
    print(f"Found {len(years)} year(s) with data: {sorted(years)}")
    
    # Rebuild each year sheet
    for year_name in sorted(years):
        print(f"\nRebuilding {account}_{year_name}...")
        
        # Clear the year sheet cache
        cache_key = f"{account}_{year_name}"
        if cache_key in year_sheet_cache:
            del year_sheet_cache[cache_key]
        
        # Get or create year sheet
        sheet_name = f"{account}_{year_name}"
        try:
            year_sheet = spreadsheet.worksheet(sheet_name)
            # Clear all content
            year_sheet.clear()
        except gspread.exceptions.WorksheetNotFound:
            year_sheet = spreadsheet.add_worksheet(sheet_name, rows=1000, cols=6)
        
        apply_initial_formatting(year_sheet)
        
        # Build the sheet month by month
        current_row = 1
        
        for month in range(1, 13):
            key = (year_name, month)
            if key not in expenses_by_year_month:
                continue
            
            month_data = expenses_by_year_month[key]
            month_name = datetime(int(year_name), month, 1).strftime("%B")
            
            print(f"  Adding {month_name}: Income={len(month_data['income'])}, Needs={len(month_data['needs'])}, Wants={len(month_data['wants'])}")
            
            # Month header
            year_sheet.update(f'A{current_row}', [[f"{month_name} {year_name}"]])
            spreadsheet.batch_update({"requests": [{
                "mergeCells": {
                    "range": {
                        "sheetId": year_sheet.id,
                        "startRowIndex": current_row - 1,
                        "endRowIndex": current_row,
                        "startColumnIndex": 0,
                        "endColumnIndex": 6
                    },
                    "mergeType": "MERGE_ALL"
                }
            }]})
            current_row += 1
            
            # Column headers
            year_sheet.update(f'A{current_row}', [["Date", "Source of income", "Amount", "Date", "Description", "Amount"]])
            current_row += 1
            
            data_start_row = current_row
            
            # Add previous month savings for first row (except January)
            all_income_rows = []
            if month > 1:
                prev_month = month - 1
                prev_month_name = datetime(int(year_name), prev_month, 1).strftime("%B")
                # Look for previous month's savings cell
                prev_savings_cell = f"'{sheet_name}'!C{find_savings_row_for_month(year_sheet, prev_month_name)}"
                if find_savings_row_for_month(year_sheet, prev_month_name):
                    all_income_rows.append(["", "FROM Previous month", f"={prev_savings_cell}"])
            elif month == 1:
                # Check previous year
                prev_year = str(int(year_name) - 1)
                try:
                    prev_year_sheet = spreadsheet.worksheet(f"{account}_{prev_year}")
                    # Find December savings
                    prev_savings_row = find_savings_row_for_month(prev_year_sheet, "December")
                    if prev_savings_row:
                        prev_savings_cell = f"'{account}_{prev_year}'!C{prev_savings_row}"
                        all_income_rows.append(["", "FROM Previous month", f"={prev_savings_cell}"])
                except:
                    pass
            
            all_income_rows.extend(month_data['income'])
            all_expense_rows = month_data['needs'] + month_data['wants']
            
            # Build data rows
            max_rows = max(len(all_income_rows), len(all_expense_rows))
            new_rows = []
            for i in range(max_rows):
                row = ["", "", "", "", "", ""]
                if i < len(all_income_rows):
                    row[0:3] = all_income_rows[i]
                if i < len(all_expense_rows):
                    row[3:6] = all_expense_rows[i]
                new_rows.append(row)
            
            if new_rows:
                year_sheet.update(f'A{current_row}', new_rows, value_input_option='USER_ENTERED')
                current_row += len(new_rows)
            
            data_end_row = current_row - 1
            
            # Blank row
            year_sheet.update(f'A{current_row}', [["", "", "", "", "", ""]])
            current_row += 1
            
            # Totals
            totals_formula_income = f"=SUM(C{data_start_row}:C{data_end_row})"
            totals_formula_expenses = f"=SUM(F{data_start_row}:F{data_end_row})"
            
            year_sheet.update(f'A{current_row}', [["", "Total income", totals_formula_income, "", "", ""]], 
                            value_input_option='USER_ENTERED')
            current_row += 1
            
            # Savings row
            savings_formula = f"=C{current_row - 1}-F{current_row}"
            year_sheet.update(f'A{current_row}', [["", "Savings", savings_formula, "", "Total expenses", totals_formula_expenses]], 
                            value_input_option='USER_ENTERED')
            current_row += 1
            
            # Spacing
            year_sheet.update(f'A{current_row}', [["", "", "", "", "", ""]])
            current_row += 1
            year_sheet.update(f'A{current_row}', [["", "", "", "", "", ""]])
            current_row += 1
        
        print(f"✓ Completed {account}_{year_name}")
    
    print(f"\n{'='*60}")
    print(f"REBUILD COMPLETE FOR {account}")
    print(f"{'='*60}\n")

def find_savings_row_for_month(year_sheet, month_name):
    """Find the row number where savings is calculated for a given month"""
    try:
        all_values = year_sheet.get_all_values()
        for i, row in enumerate(all_values):
            if row and month_name in str(row[0]):
                # Found month header, look for Savings row below
                for j in range(i + 1, min(i + 50, len(all_values))):
                    if all_values[j] and "Savings" in str(all_values[j][1]):
                        return j + 1  # Return 1-indexed row number
        return None
    except:
        return None

def find_previous_month_savings_cell(year_name: str, month: int, account: str):
    if month == 1:
        prev_year = str(int(year_name) - 1)
        prev_month = 12
        try:
            prev_year_sheet = spreadsheet.worksheet(f"{account}_{prev_year}")
            all_values = prev_year_sheet.get_all_values()
            sheet_name = f"{account}_{prev_year}"
        except:
            return None
    else:
        prev_month = month - 1
        year_sheet = get_year_sheet(year_name, account)
        all_values = year_sheet.get_all_values()
        sheet_name = f"{account}_{year_name}"
    
    prev_month_name = datetime(2000, prev_month, 1).strftime("%B")
    
    for i, row in enumerate(all_values):
        if row and prev_month_name in str(row[0]):
            for j in range(i + 1, min(i + 50, len(all_values))):
                if all_values[j] and "Savings" in str(all_values[j][1]):
                    return f"'{sheet_name}'!C{j + 1}"
    return None

def append_to_month(year_sheet, month: int, year_name: str, account: str, income_rows, needs_rows, wants_rows):
    """Append rows to a specific month without clearing existing data"""
    all_values = year_sheet.get_all_values()
    month_name = datetime(int(year_name), month, 1).strftime("%B")
    
    month_row = None
    for i, row in enumerate(all_values):
        if row and month_name in str(row[0]):
            month_row = i
            break
    
    print(f"DEBUG: Processing {month_name} {year_name} for {account}, found at row: {month_row}")
    
    if month_row is None:
        last_content_row = 0
        for i in range(len(all_values) - 1, -1, -1):
            if any(cell for cell in all_values[i] if str(cell).strip()):
                last_content_row = i + 1
                break
        
        last_row = last_content_row + 3 if last_content_row > 0 else 1
        prev_savings_cell = find_previous_month_savings_cell(year_name, month, account)
        
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
    
    insert_row = None
    for i in range(month_row + 2, len(all_values)):
        if all_values[i] and ("Total income" in str(all_values[i]) or "total income" in str(all_values[i]).lower()):
            insert_row = i
            break
    
    if insert_row:
        all_expense_rows = needs_rows + wants_rows
        new_rows = []
        max_rows = max(len(income_rows), len(all_expense_rows))
        
        for i in range(max_rows):
            row = ["", "", "", "", "", ""]
            if i < len(income_rows):
                row[0] = income_rows[i][0]
                row[1] = income_rows[i][1]
                row[2] = income_rows[i][2]
            if i < len(all_expense_rows):
                row[3] = all_expense_rows[i][0]
                row[4] = all_expense_rows[i][1]
                row[5] = all_expense_rows[i][2]
            new_rows.append(row)
        
        print(f"DEBUG: Inserting {len(new_rows)} rows at position {insert_row}")
        year_sheet.insert_rows(new_rows, insert_row, value_input_option='USER_ENTERED')
        
        spacing_row = insert_row + len(new_rows)
        totals_row = spacing_row + 1
        total_expenses_row = totals_row + 1
        data_start = month_row + 3
        data_end = spacing_row - 1
        
        totals_formula_income = f"=SUM(C{data_start}:C{data_end})"
        totals_formula_expenses = f"=SUM(F{data_start}:F{data_end})"
        
        year_sheet.update(f'A{totals_row}', [["", "Total income", totals_formula_income, 
                                               "", "", ""]], value_input_option='USER_ENTERED')
        
        savings_formula = f"=C{totals_row}-F{total_expenses_row}"
        year_sheet.update(f'A{total_expenses_row}', [["", "Savings", savings_formula, 
                                                "", "Total expenses", totals_formula_expenses]], 
                         value_input_option='USER_ENTERED')

# === API Routes ===
@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({"status": "ok", "message": "Backend is running"})

@app.route('/api/accounts', methods=['GET'])
def get_accounts():
    return jsonify({"accounts": ACCOUNTS})

@app.route('/api/expenses', methods=['POST'])
def add_expenses():
    try:
        data = request.json
        expenses = data.get('expenses', [])
        account = data.get('account')
        
        if not expenses:
            return jsonify({"error": "No expenses provided"}), 400
        
        if not account or account not in ACCOUNTS:
            return jsonify({"error": "Invalid account selected"}), 400
        
        print(f"\n{'='*50}")
        print(f"Processing {len(expenses)} expenses for {account}")
        print(f"{'='*50}")
        
        grouped = {}
        for expense in expenses:
            date_str = expense.get('date')
            description = expense.get('description')
            category = expense.get('category')
            amount = expense.get('amount')
            
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
            
            print(f"Adding to {account} sheet: {date_str} | {description} | {category} | {amount}")
            account_sheets[account].append_row([date_str, description, category, float(amount), account])
            
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
        
        for (year_name, month), data in grouped.items():
            month_name = datetime(int(year_name), month, 1).strftime("%B")
            print(f"\nUpdating {month_name} {year_name} for {account}:")
            print(f"  Income entries: {len(data['income'])}")
            print(f"  Needs entries: {len(data['needs'])}")
            print(f"  Wants entries: {len(data['wants'])}")
            
            cache_key = f"{account}_{year_name}"
            if cache_key in year_sheet_cache:
                del year_sheet_cache[cache_key]
            
            year_sheet = get_year_sheet(year_name, account)
            append_to_month(year_sheet, month, year_name, account, data['income'], data['needs'], data['wants'])
        
        print(f"\n{'='*50}")
        print(f"Successfully processed all expenses for {account}")
        print(f"{'='*50}\n")
        
        return jsonify({
            "success": True,
            "message": f"Added {len(expenses)} expense(s) to {account} account",
            "count": len(expenses)
        })
        
    except Exception as e:
        print(f"\nERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@app.route('/api/summary', methods=['GET'])
def get_summary():
    """Get comprehensive summary with all expenses and analytics"""
    try:
        account = request.args.get('account', 'Kek')
        
        if account not in ACCOUNTS:
            return jsonify({"error": "Invalid account"}), 400
        
        all_data = account_sheets[account].get_all_values()
        
        if len(all_data) <= 1:
            return jsonify({
                "expenses": [], 
                "total": 0,
                "categoryTotals": {"Income": 0, "Needs": 0, "Wants": 0},
                "monthlySummary": {},
                "savings": 0,
                "account": account
            })
        
        expenses = []
        category_totals = {"Income": 0, "Needs": 0, "Wants": 0}
        monthly_data = defaultdict(lambda: {"Income": 0, "Needs": 0, "Wants": 0})
        
        for idx, row in enumerate(all_data[1:], start=2):
            if len(row) >= 4 and row[0] and row[3]:
                try:
                    date_str = row[0]
                    description = row[1]
                    category = row[2]
                    amount = float(row[3])
                    
                    expense = {
                        "id": f"{account}_{idx}",
                        "rowIndex": idx,
                        "date": date_str,
                        "description": description,
                        "category": category,
                        "amount": amount
                    }
                    expenses.append(expense)
                    
                    if category in category_totals:
                        category_totals[category] += amount
                    
                    try:
                        date_obj = datetime.strptime(date_str, "%Y-%m-%d")
                        month_key = date_obj.strftime("%Y-%m")
                        monthly_data[month_key][category] += amount
                    except:
                        pass
                        
                except (ValueError, IndexError):
                    continue
        
        expenses.sort(key=lambda x: x['date'], reverse=True)
        savings = category_totals["Income"] - category_totals["Needs"] - category_totals["Wants"]
        
        monthly_summary = []
        for month_key in sorted(monthly_data.keys(), reverse=True):
            data = monthly_data[month_key]
            monthly_summary.append({
                "month": month_key,
                "income": data["Income"],
                "needs": data["Needs"],
                "wants": data["Wants"],
                "savings": data["Income"] - data["Needs"] - data["Wants"]
            })
        
        return jsonify({
            "expenses": expenses,
            "total": len(expenses),
            "categoryTotals": category_totals,
            "monthlySummary": monthly_summary,
            "savings": savings,
            "account": account
        })
        
    except Exception as e:
        print(f"Error in get_summary: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@app.route('/api/expenses/<expense_id>', methods=['PUT'])
def update_expense(expense_id):
    """Update an existing expense and rebuild yearly sheets"""
    try:
        data = request.json
        
        parts = expense_id.split('_')
        if len(parts) != 2:
            return jsonify({"error": "Invalid expense ID"}), 400
        
        account = parts[0]
        row_index = int(parts[1])
        
        if account not in ACCOUNTS:
            return jsonify({"error": "Invalid account"}), 400
        
        sheet = account_sheets[account]
        
        date_str = data.get('date')
        description = data.get('description')
        category = data.get('category')
        amount = data.get('amount')
        
        if not description or not description.strip():
            return jsonify({"error": "Description cannot be empty"}), 400
        
        if not amount or float(amount) <= 0:
            return jsonify({"error": "Amount must be greater than 0"}), 400
        
        if category not in CATEGORIES:
            return jsonify({"error": f"Invalid category: {category}"}), 400
        
        try:
            datetime.strptime(date_str, "%Y-%m-%d")
        except:
            return jsonify({"error": f"Invalid date format: {date_str}"}), 400
        
        # Update the row
        sheet.update(f'A{row_index}:E{row_index}', 
                    [[date_str, description, category, float(amount), account]])
        
        print(f"Updated expense at row {row_index} in {account} sheet")
        
        # Rebuild yearly sheets
        rebuild_yearly_sheets(account)
        
        return jsonify({
            "success": True,
            "message": f"Expense updated and yearly sheets rebuilt successfully"
        })
        
    except Exception as e:
        print(f"Error updating expense: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@app.route('/api/expenses/<expense_id>', methods=['DELETE'])
def delete_expense(expense_id):
    """Delete an expense and rebuild yearly sheets"""
    try:
        parts = expense_id.split('_')
        if len(parts) != 2:
            return jsonify({"error": "Invalid expense ID"}), 400
        
        account = parts[0]
        row_index = int(parts[1])
        
        if account not in ACCOUNTS:
            return jsonify({"error": "Invalid account"}), 400
        
        sheet = account_sheets[account]
        
        # Delete the row
        sheet.delete_rows(row_index)
        
        print(f"Deleted expense at row {row_index} from {account} sheet")
        
        # Rebuild yearly sheets
        rebuild_yearly_sheets(account)
        
        return jsonify({
            "success": True,
            "message": f"Expense deleted and yearly sheets rebuilt successfully"
        })
        
    except Exception as e:
        print(f"Error deleting expense: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@app.route('/api/rebuild/<account>', methods=['POST'])
def rebuild_account_sheets(account):
    """Manual endpoint to rebuild yearly sheets for a specific account"""
    try:
        if account not in ACCOUNTS:
            return jsonify({"error": "Invalid account"}), 400
        
        print(f"Manual rebuild requested for {account}")
        rebuild_yearly_sheets(account)
        
        return jsonify({
            "success": True,
            "message": f"Successfully rebuilt all yearly sheets for {account}"
        })
        
    except Exception as e:
        print(f"Error rebuilding sheets: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@app.route('/api/categories', methods=['GET'])
def get_categories():
    return jsonify({"categories": CATEGORIES})

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    app.run(debug=False, host='0.0.0.0', port=port)
