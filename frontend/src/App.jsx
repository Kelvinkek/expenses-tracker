import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, DollarSign, TrendingUp, TrendingDown, List, PieChart as PieChartIcon, Calendar, Wallet, User, Users, ArrowLeft, ChevronDown, Search, Edit2, X, Check, BarChart3, ArrowUpDown } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line } from 'recharts';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

function App() {
  const [currentScreen, setCurrentScreen] = useState('account-select');
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [activeTab, setActiveTab] = useState('add');
  const [selectedView, setSelectedView] = useState('summary');
  const [expenses, setExpenses] = useState([
    { id: 1, date: new Date().toISOString().split('T')[0], description: '', category: 'Income', amount: '' }
  ]);
  const [summaryData, setSummaryData] = useState({
    expenses: [],
    categoryTotals: { Income: 0, Needs: 0, Wants: 0 },
    monthlySummary: [],
    savings: 0
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [showMonthDropdown, setShowMonthDropdown] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [editingExpense, setEditingExpense] = useState(null);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [sortBy, setSortBy] = useState('date-desc');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [displayCount, setDisplayCount] = useState(10);

  const accounts = [
    { id: 'Kek', name: 'Kek', icon: User, color: 'from-purple-500 to-purple-600', bgColor: 'bg-purple-50', textColor: 'text-purple-600' },
    { id: 'Nat', name: 'Nat', icon: User, color: 'from-pink-500 to-pink-600', bgColor: 'bg-pink-50', textColor: 'text-pink-600' },
    { id: 'Joint', name: 'Joint Account', icon: Users, color: 'from-blue-500 to-blue-600', bgColor: 'bg-blue-50', textColor: 'text-blue-600' }
  ];

  const categories = ['Income', 'Needs', 'Wants'];

  const sortOptions = [
    { id: 'date-desc', label: 'Date (Newest First)' },
    { id: 'date-asc', label: 'Date (Oldest First)' },
    { id: 'amount-desc', label: 'Amount (Highest First)' },
    { id: 'amount-asc', label: 'Amount (Lowest First)' }
  ];

  useEffect(() => {
    if (activeTab === 'history' && selectedAccount) {
      fetchSummary();
    }
  }, [activeTab, selectedAccount]);

  useEffect(() => {
    setDisplayCount(10);
  }, [selectedView, searchTerm, categoryFilter, sortBy]);

  const fetchSummary = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/summary?account=${selectedAccount}`);
      const data = await response.json();
      setSummaryData(data);
    } catch (error) {
      console.error('Error fetching summary:', error);
      setMessage({ type: 'error', text: 'Failed to load data from Google Sheets' });
    } finally {
      setLoading(false);
    }
  };

  const handleAccountSelect = (accountId) => {
    setSelectedAccount(accountId);
    setCurrentScreen('main');
    setActiveTab('add');
  };

  const handleBackToAccounts = () => {
    setCurrentScreen('account-select');
    setSelectedAccount(null);
    setActiveTab('add');
    setMessage({ type: '', text: '' });
    setSearchTerm('');
    setCategoryFilter('All');
    setSortBy('date-desc');
    setDisplayCount(10);
  };

  const addExpenseRow = () => {
    if (expenses.length >= 10) {
      setMessage({ type: 'error', text: 'Maximum 10 entries allowed per batch. Please save current entries first.' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      return;
    }
    const newExpense = {
      id: Date.now(),
      date: new Date().toISOString().split('T')[0],
      description: '',
      category: 'Needs',
      amount: ''
    };
    setExpenses([...expenses, newExpense]);
  };

  const updateExpense = (id, field, value) => {
    setExpenses(expenses.map(exp => 
      exp.id === id ? { ...exp, [field]: value } : exp
    ));
  };

  const removeExpense = (id) => {
    if (expenses.length > 1) {
      setExpenses(expenses.filter(exp => exp.id !== id));
    }
  };

  const submitExpenses = async () => {
    const validExpenses = expenses.filter(exp => 
      exp.description.trim() && exp.amount && parseFloat(exp.amount) > 0
    );

    if (validExpenses.length === 0) {
      setMessage({ type: 'error', text: 'Please add at least one valid expense' });
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await fetch(`${API_URL}/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          expenses: validExpenses,
          account: selectedAccount 
        })
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: `Added ${validExpenses.length} expense(s) to ${selectedAccount} account!` });
        setExpenses([
          { id: Date.now(), date: new Date().toISOString().split('T')[0], description: '', category: 'Income', amount: '' }
        ]);
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to add expenses' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error. Please check if backend is running.' });
    } finally {
      setLoading(false);
    }
  };

  const startEditExpense = (expense) => {
    setEditingExpense({
      ...expense,
      originalId: expense.id
    });
  };

  const cancelEdit = () => {
    setEditingExpense(null);
  };

  const saveEdit = async () => {
    if (!editingExpense.description.trim() || !editingExpense.amount || parseFloat(editingExpense.amount) <= 0) {
      setMessage({ type: 'error', text: 'Please fill in all fields correctly' });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/expenses/${editingExpense.originalId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: editingExpense.date,
          description: editingExpense.description,
          category: editingExpense.category,
          amount: parseFloat(editingExpense.amount)
        })
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: 'Expense updated! Yearly sheets rebuilt.' });
        setEditingExpense(null);
        await fetchSummary();
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to update expense' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error. Please check if backend is running.' });
    } finally {
      setLoading(false);
    }
  };

  const deleteExpense = async (expenseId, expenseDescription) => {
    if (!window.confirm(`Are you sure you want to delete "${expenseDescription}"?\n\nThis will also rebuild all yearly sheets.`)) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/expenses/${expenseId}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: 'Expense deleted! Yearly sheets rebuilt.' });
        await fetchSummary();
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to delete expense' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error. Please check if backend is running.' });
    } finally {
      setLoading(false);
    }
  };

  const getCategoryColor = (category) => {
    switch(category) {
      case 'Income': return 'text-green-600';
      case 'Needs': return 'text-red-600';
      case 'Wants': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  const getCategoryBg = (category) => {
    switch(category) {
      case 'Income': return 'bg-green-50 border-green-200';
      case 'Needs': return 'bg-red-50 border-red-200';
      case 'Wants': return 'bg-blue-50 border-blue-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  const sortExpenses = (expensesList) => {
    const sorted = [...expensesList];
    
    switch(sortBy) {
      case 'date-desc':
        return sorted.sort((a, b) => new Date(b.date) - new Date(a.date));
      case 'date-asc':
        return sorted.sort((a, b) => new Date(a.date) - new Date(b.date));
      case 'amount-desc':
        return sorted.sort((a, b) => b.amount - a.amount);
      case 'amount-asc':
        return sorted.sort((a, b) => a.amount - b.amount);
      default:
        return sorted;
    }
  };

  const getFilteredData = () => {
    let filteredExpenses = summaryData.expenses;

    if (selectedView !== 'summary') {
      filteredExpenses = filteredExpenses.filter(exp => 
        exp.date.startsWith(selectedView)
      );
    }

    if (searchTerm.trim()) {
      filteredExpenses = filteredExpenses.filter(exp =>
        exp.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (categoryFilter !== 'All') {
      filteredExpenses = filteredExpenses.filter(exp =>
        exp.category === categoryFilter
      );
    }

    filteredExpenses = sortExpenses(filteredExpenses);

    const categoryTotals = filteredExpenses.reduce((acc, exp) => {
      if (exp.category === 'Income') acc.Income += exp.amount;
      else if (exp.category === 'Needs') acc.Needs += exp.amount;
      else if (exp.category === 'Wants') acc.Wants += exp.amount;
      return acc;
    }, { Income: 0, Needs: 0, Wants: 0 });

    const savings = categoryTotals.Income - categoryTotals.Needs - categoryTotals.Wants;

    return {
      categoryTotals,
      expenses: filteredExpenses,
      savings
    };
  };

  const getTrendAnalysisData = () => {
    if (!summaryData.monthlySummary || summaryData.monthlySummary.length < 2) {
      return null;
    }

    const months = [...summaryData.monthlySummary].reverse();
    
    const trends = months.map((month, idx) => {
      if (idx === 0) {
        return {
          month: month.month,
          income: month.income,
          needs: month.needs,
          wants: month.wants,
          savings: month.savings,
          incomeChange: 0,
          needsChange: 0,
          wantsChange: 0,
          savingsChange: 0
        };
      }

      const prev = months[idx - 1];
      return {
        month: month.month,
        income: month.income,
        needs: month.needs,
        wants: month.wants,
        savings: month.savings,
        incomeChange: prev.income ? ((month.income - prev.income) / prev.income * 100) : 0,
        needsChange: prev.needs ? ((month.needs - prev.needs) / prev.needs * 100) : 0,
        wantsChange: prev.wants ? ((month.wants - prev.wants) / prev.wants * 100) : 0,
        savingsChange: prev.savings ? ((month.savings - prev.savings) / prev.savings * 100) : 0
      };
    });

    const avgIncome = months.reduce((sum, m) => sum + m.income, 0) / months.length;
    const avgNeeds = months.reduce((sum, m) => sum + m.needs, 0) / months.length;
    const avgWants = months.reduce((sum, m) => sum + m.wants, 0) / months.length;
    const avgSavings = months.reduce((sum, m) => sum + m.savings, 0) / months.length;

    const bestSavingsMonth = months.reduce((best, m) => m.savings > best.savings ? m : best, months[0]);
    const worstSavingsMonth = months.reduce((worst, m) => m.savings < worst.savings ? m : worst, months[0]);

    return {
      trends,
      averages: { avgIncome, avgNeeds, avgWants, avgSavings },
      bestSavingsMonth,
      worstSavingsMonth,
      totalMonths: months.length
    };
  };

  const filteredData = getFilteredData();
  const trendAnalysis = getTrendAnalysisData();

  const displayedExpenses = filteredData.expenses.slice(0, displayCount);
  const hasMoreExpenses = displayCount < filteredData.expenses.length;

  const loadMore = () => {
    setDisplayCount(prev => prev + 10);
  };

  const pieChartData = [
    { name: 'Needs', value: filteredData.categoryTotals.Needs, color: '#dc2626' },
    { name: 'Wants', value: filteredData.categoryTotals.Wants, color: '#2563eb' },
  ];

  const COLORS = ['#dc2626', '#2563eb'];

  const currentAccountInfo = accounts.find(acc => acc.id === selectedAccount);

  const getMonthDisplay = (monthKey) => {
    if (monthKey === 'summary') return 'All Time Summary';
    const [year, month] = monthKey.split('-');
    const date = new Date(year, parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
  };

  if (currentScreen === 'account-select') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-100 via-pink-50 to-blue-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-4 rounded-3xl shadow-lg">
                <DollarSign className="w-12 h-12 text-white" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Expense Tracker</h1>
            <p className="text-gray-600">Select an account to continue</p>
          </div>

          <div className="space-y-4">
            {accounts.map((account) => {
              const Icon = account.icon;
              return (
                <button
                  key={account.id}
                  onClick={() => handleAccountSelect(account.id)}
                  className="w-full bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 border-2 border-transparent hover:border-purple-300"
                >
                  <div className="flex items-center gap-4">
                    <div className={`bg-gradient-to-r ${account.color} p-4 rounded-xl`}>
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                    <div className="flex-1 text-left">
                      <h3 className="text-xl font-bold text-gray-800">{account.name}</h3>
                      <p className="text-sm text-gray-500">Track {account.name.toLowerCase()} expenses</p>
                    </div>
                    <div className="text-purple-600">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 via-pink-50 to-blue-100">
      <div className={`bg-gradient-to-r ${currentAccountInfo?.color} text-white p-6 pb-20 shadow-lg`}>
        <button
          onClick={handleBackToAccounts}
          className="flex items-center gap-2 text-white/90 hover:text-white mb-4 transition-all"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm">Change Account</span>
        </button>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <DollarSign className="w-8 h-8" />
          {currentAccountInfo?.name}
        </h1>
        <p className="text-white/90 text-sm mt-1">Manage your finances easily</p>
      </div>

      <div className="relative -mt-12 mx-4 bg-white rounded-2xl shadow-xl p-2 flex gap-2">
        <button
          onClick={() => setActiveTab('add')}
          className={`flex-1 py-3 rounded-xl font-semibold transition-all ${
            activeTab === 'add'
              ? `bg-gradient-to-r ${currentAccountInfo?.color} text-white shadow-md`
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Plus className="w-5 h-5 inline mr-1" />
          Add
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-3 rounded-xl font-semibold transition-all ${
            activeTab === 'history'
              ? `bg-gradient-to-r ${currentAccountInfo?.color} text-white shadow-md`
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <List className="w-5 h-5 inline mr-1" />
          History
        </button>
      </div>

      {message.text && (
        <div className={`mx-4 mt-4 p-4 rounded-xl ${
          message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {message.text}
        </div>
      )}

      {activeTab === 'add' && (
        <div className="p-4 space-y-4">
          {expenses.map((expense, index) => (
            <div key={expense.id} className={`bg-white rounded-2xl shadow-lg p-4 border-2 ${getCategoryBg(expense.category)}`}>
              <div className="flex justify-between items-center mb-3">
                <span className={`font-bold text-sm ${getCategoryColor(expense.category)}`}>
                  Entry #{index + 1}
                </span>
                {expenses.length > 1 && (
                  <button
                    onClick={() => removeExpense(expense.id)}
                    className="text-red-500 p-2 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Date</label>
                  <input
                    type="date"
                    value={expense.date}
                    onChange={(e) => updateExpense(expense.id, 'date', e.target.value)}
                    className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-2">Category</label>
                  <div className="grid grid-cols-3 gap-2">
                    {categories.map(cat => (
                      <button
                        key={cat}
                        onClick={() => updateExpense(expense.id, 'category', cat)}
                        className={`py-3 px-2 rounded-xl font-semibold text-sm transition-all ${
                          expense.category === cat
                            ? cat === 'Income'
                              ? 'bg-green-600 text-white shadow-md'
                              : cat === 'Needs'
                              ? 'bg-red-600 text-white shadow-md'
                              : 'bg-blue-600 text-white shadow-md'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Description</label>
                  <input
                    type="text"
                    value={expense.description}
                    onChange={(e) => updateExpense(expense.id, 'description', e.target.value)}
                    placeholder="e.g., Grocery shopping"
                    className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Amount</label>
                  <input
                    type="number"
                    value={expense.amount}
                    onChange={(e) => updateExpense(expense.id, 'amount', e.target.value)}
                    placeholder="0.00"
                    step="0.01"
                    className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          ))}

          <button
            onClick={addExpenseRow}
            className="w-full py-4 bg-white border-2 border-dashed border-purple-300 rounded-2xl text-purple-600 font-semibold hover:bg-purple-50 transition-all"
          >
            <Plus className="w-5 h-5 inline mr-2" />
            Add Another Entry
          </button>

          <button
            onClick={submitExpenses}
            disabled={loading}
            className={`w-full py-4 bg-gradient-to-r ${currentAccountInfo?.color} text-white font-bold rounded-2xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50`}
          >
            {loading ? (
              'Saving...'
            ) : (
              <>
                <Save className="w-5 h-5 inline mr-2" />
                Save All Expenses
              </>
            )}
          </button>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="p-4 space-y-4">
          {loading ? (
            <div className="bg-white rounded-2xl p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
              <p className="text-gray-600 mt-4">Loading data from Google Sheets...</p>
            </div>
          ) : (
            <>
              <div className="bg-white rounded-2xl shadow-lg p-4">
                <div className="relative">
                  <button
                    onClick={() => setShowMonthDropdown(!showMonthDropdown)}
                    className={`w-full flex items-center justify-between p-4 bg-gradient-to-r ${currentAccountInfo?.color} text-white rounded-xl font-semibold`}
                  >
                    <span className="flex items-center gap-2">
                      <Calendar className="w-5 h-5" />
                      {getMonthDisplay(selectedView)}
                    </span>
                    <ChevronDown className={`w-5 h-5 transition-transform ${showMonthDropdown ? 'rotate-180' : ''}`} />
                  </button>

                  {showMonthDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border-2 border-gray-200 z-10 max-h-64 overflow-y-auto">
                      <button
                        onClick={() => {
                          setSelectedView('summary');
                          setShowMonthDropdown(false);
                        }}
                        className={`w-full text-left p-4 hover:bg-purple-50 transition-all ${
                          selectedView === 'summary' ? 'bg-purple-100 font-bold text-purple-600' : 'text-gray-700'
                        }`}
                      >
                        All Time Summary
                      </button>
                      {summaryData.monthlySummary && summaryData.monthlySummary.map((month) => (
                        <button
                          key={month.month}
                          onClick={() => {
                            setSelectedView(month.month);
                            setShowMonthDropdown(false);
                          }}
                          className={`w-full text-left p-4 border-t border-gray-100 hover:bg-purple-50 transition-all ${
                            selectedView === month.month ? 'bg-purple-100 font-bold text-purple-600' : 'text-gray-700'
                          }`}
                        >
                          {getMonthDisplay(month.month)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-lg p-4 space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search by description..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none"
                  />
                </div>
                
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {['All', ...categories].map(cat => (
                    <button
                      key={cat}
                      onClick={() => setCategoryFilter(cat)}
                      className={`px-4 py-2 rounded-xl font-semibold text-sm whitespace-nowrap transition-all ${
                        categoryFilter === cat
                          ? `bg-gradient-to-r ${currentAccountInfo?.color} text-white shadow-md`
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                <div className="relative">
                  <button
                    onClick={() => setShowSortMenu(!showSortMenu)}
                    className="w-full flex items-center justify-between p-3 bg-gray-100 rounded-xl font-semibold text-gray-700 hover:bg-gray-200 transition-all"
                  >
                    <span className="flex items-center gap-2">
                      <ArrowUpDown className="w-4 h-4" />
                      Sort: {sortOptions.find(opt => opt.id === sortBy)?.label}
                    </span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${showSortMenu ? 'rotate-180' : ''}`} />
                  </button>

                  {showSortMenu && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border-2 border-gray-200 z-10">
                      {sortOptions.map((option) => (
                        <button
                          key={option.id}
                          onClick={() => {
                            setSortBy(option.id);
                            setShowSortMenu(false);
                          }}
                          className={`w-full text-left p-3 border-t first:border-t-0 border-gray-100 hover:bg-purple-50 transition-all ${
                            sortBy === option.id ? 'bg-purple-100 font-bold text-purple-600' : 'text-gray-700'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {trendAnalysis && (
                <button
                  onClick={() => setShowAnalytics(!showAnalytics)}
                  className={`w-full py-3 px-4 bg-white rounded-xl shadow-lg font-semibold transition-all flex items-center justify-center gap-2 ${
                    showAnalytics ? 'bg-purple-100 text-purple-600' : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <BarChart3 className="w-5 h-5" />
                  {showAnalytics ? 'Hide' : 'Show'} Trend Analysis
                </button>
              )}

              {showAnalytics && trendAnalysis && (
                <div className="space-y-4">
                  <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-2xl p-6 shadow-xl">
                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                      <BarChart3 className="w-6 h-6" />
                      Key Insights
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-xs opacity-90">Best Month</div>
                        <div className="font-bold text-lg">{getMonthDisplay(trendAnalysis.bestSavingsMonth.month)}</div>
                        <div className="text-sm">${trendAnalysis.bestSavingsMonth.savings.toFixed(2)}</div>
                      </div>
                      <div>
                        <div className="text-xs opacity-90">Worst Month</div>
                        <div className="font-bold text-lg">{getMonthDisplay(trendAnalysis.worstSavingsMonth.month)}</div>
                        <div className="text-sm">${trendAnalysis.worstSavingsMonth.savings.toFixed(2)}</div>
                      </div>
                      <div>
                        <div className="text-xs opacity-90">Avg Income</div>
                        <div className="font-bold">${trendAnalysis.averages.avgIncome.toFixed(2)}</div>
                      </div>
                      <div>
                        <div className="text-xs opacity-90">Avg Savings</div>
                        <div className="font-bold">${trendAnalysis.averages.avgSavings.toFixed(2)}</div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl p-6 shadow-lg">
                    <h3 className="font-bold text-gray-800 text-lg mb-4">Savings Trend</h3>
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={trendAnalysis.trends}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip formatter={(value) => `${value.toFixed(2)}`} />
                        <Legend />
                        <Line type="monotone" dataKey="savings" stroke="#8b5cf6" strokeWidth={3} name="Savings" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="bg-white rounded-2xl p-6 shadow-lg">
                    <h3 className="font-bold text-gray-800 text-lg mb-4">Month-over-Month Changes</h3>
                    <div className="space-y-3">
                      {trendAnalysis.trends.slice(-3).reverse().map((trend, idx) => (
                        <div key={idx} className="border-l-4 border-purple-500 pl-4 py-2">
                          <div className="font-semibold text-gray-700">{getMonthDisplay(trend.month)}</div>
                          <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                            <div>
                              <span className="text-gray-600">Income: </span>
                              <span className={trend.incomeChange >= 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                                {trend.incomeChange >= 0 ? '+' : ''}{trend.incomeChange.toFixed(1)}%
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-600">Savings: </span>
                              <span className={trend.savingsChange >= 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                                {trend.savingsChange >= 0 ? '+' : ''}{trend.savingsChange.toFixed(1)}%
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-600">Needs: </span>
                              <span className={trend.needsChange <= 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                                {trend.needsChange >= 0 ? '+' : ''}{trend.needsChange.toFixed(1)}%
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-600">Wants: </span>
                              <span className={trend.wantsChange <= 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                                {trend.wantsChange >= 0 ? '+' : ''}{trend.wantsChange.toFixed(1)}%
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-3">
                <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-xl p-4 shadow-lg">
                  <TrendingUp className="w-6 h-6 mb-2" />
                  <div className="text-xs opacity-90">Income</div>
                  <div className="text-lg font-bold">${filteredData.categoryTotals.Income.toFixed(2)}</div>
                </div>
                <div className="bg-gradient-to-br from-red-500 to-red-600 text-white rounded-xl p-4 shadow-lg">
                  <TrendingDown className="w-6 h-6 mb-2" />
                  <div className="text-xs opacity-90">Needs</div>
                  <div className="text-lg font-bold">${filteredData.categoryTotals.Needs.toFixed(2)}</div>
                </div>
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl p-4 shadow-lg">
                  <PieChartIcon className="w-6 h-6 mb-2" />
                  <div className="text-xs opacity-90">Wants</div>
                  <div className="text-lg font-bold">${filteredData.categoryTotals.Wants.toFixed(2)}</div>
                </div>
              </div>

              <div className={`bg-gradient-to-r ${currentAccountInfo?.color} text-white rounded-2xl p-6 shadow-xl`}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm opacity-90 flex items-center gap-2">
                      <Wallet className="w-4 h-4" />
                      {selectedView === 'summary' ? 'Total Savings' : 'Month Savings'}
                    </div>
                    <div className="text-3xl font-bold mt-1">
                      ${filteredData.savings.toFixed(2)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs opacity-75">Total Expenses</div>
                    <div className="text-xl font-semibold">
                      ${(filteredData.categoryTotals.Needs + filteredData.categoryTotals.Wants).toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>

              {(filteredData.categoryTotals.Needs > 0 || filteredData.categoryTotals.Wants > 0) && (
                <div className="bg-white rounded-2xl p-6 shadow-lg">
                  <h3 className="font-bold text-gray-800 text-lg mb-4 flex items-center gap-2">
                    <PieChartIcon className="w-5 h-5 text-purple-600" />
                    Expense Distribution
                  </h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={pieChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {pieChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `${value.toFixed(2)}`} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex justify-center gap-6 mt-4">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-red-600 rounded"></div>
                      <span className="text-sm text-gray-600">Needs: ${filteredData.categoryTotals.Needs.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-blue-600 rounded"></div>
                      <span className="text-sm text-gray-600">Wants: ${filteredData.categoryTotals.Wants.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              )}

              {selectedView === 'summary' && summaryData.monthlySummary && summaryData.monthlySummary.length > 0 && (
                <div className="bg-white rounded-2xl p-6 shadow-lg">
                  <h3 className="font-bold text-gray-800 text-lg mb-4 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-purple-600" />
                    Monthly Trends
                  </h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={summaryData.monthlySummary}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(value) => `${value.toFixed(2)}`} />
                      <Legend />
                      <Bar dataKey="income" fill="#10b981" name="Income" />
                      <Bar dataKey="needs" fill="#dc2626" name="Needs" />
                      <Bar dataKey="wants" fill="#2563eb" name="Wants" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              <div className="space-y-3">
                <h2 className="font-bold text-gray-700 text-lg px-2 flex items-center justify-between">
                  <span>
                    {selectedView === 'summary' ? 'Transactions' : 'Month Transactions'}
                  </span>
                  <span className="text-sm text-gray-500">
                    Showing {displayedExpenses.length} of {filteredData.expenses.length}
                  </span>
                </h2>
                {filteredData.expenses.length === 0 ? (
                  <div className="bg-white rounded-2xl p-8 text-center text-gray-400">
                    No expenses found. {searchTerm || categoryFilter !== 'All' ? 'Try adjusting your filters.' : 'Start adding some!'}
                  </div>
                ) : (
                  <>
                    {displayedExpenses.map((exp) => (
                      <ExpenseItem
                        key={exp.id}
                        expense={exp}
                        editingExpense={editingExpense}
                        setEditingExpense={setEditingExpense}
                        categories={categories}
                        onEdit={startEditExpense}
                        onDelete={deleteExpense}
                        onSaveEdit={saveEdit}
                        onCancelEdit={cancelEdit}
                        getCategoryColor={getCategoryColor}
                        getCategoryBg={getCategoryBg}
                        loading={loading}
                      />
                    ))}
                    {hasMoreExpenses && (
                      <button
                        onClick={loadMore}
                        className="w-full py-4 bg-white border-2 border-purple-300 rounded-xl text-purple-600 font-semibold hover:bg-purple-50 transition-all"
                      >
                        Load More ({filteredData.expenses.length - displayCount} remaining)
                      </button>
                    )}
                  </>
                )}
              </div>
            </>
          )}
        </div>
      )}

      <div className="h-20"></div>
    </div>
  );
}

function ExpenseItem({ expense, editingExpense, setEditingExpense, categories, onEdit, onDelete, onSaveEdit, onCancelEdit, getCategoryColor, getCategoryBg, loading }) {
  if (editingExpense && editingExpense.originalId === expense.id) {
    return (
      <div className="bg-white rounded-xl p-4 shadow-md border-2 border-purple-500">
        <div className="space-y-3">
          <div className="flex justify-between items-center mb-2">
            <span className="font-bold text-purple-600 text-sm">Editing</span>
            <div className="flex gap-2">
              <button
                onClick={onSaveEdit}
                disabled={loading}
                className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={onCancelEdit}
                className="p-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          <input
            type="date"
            value={editingExpense.date}
            onChange={(e) => setEditingExpense({...editingExpense, date: e.target.value})}
            className="w-full p-2 border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:outline-none text-sm"
          />
          
          <div className="grid grid-cols-3 gap-2">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setEditingExpense({...editingExpense, category: cat})}
                className={`py-2 px-2 rounded-lg font-semibold text-xs transition-all ${
                  editingExpense.category === cat
                    ? cat === 'Income'
                      ? 'bg-green-600 text-white'
                      : cat === 'Needs'
                      ? 'bg-red-600 text-white'
                      : 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
          
          <input
            type="text"
            value={editingExpense.description}
            onChange={(e) => setEditingExpense({...editingExpense, description: e.target.value})}
            className="w-full p-2 border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:outline-none text-sm"
          />
          
          <input
            type="number"
            value={editingExpense.amount}
            onChange={(e) => setEditingExpense({...editingExpense, amount: e.target.value})}
            step="0.01"
            className="w-full p-2 border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:outline-none text-sm"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-4 shadow-md border-l-4 border-purple-500">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="font-semibold text-gray-800">{expense.description}</div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className={`text-xs font-semibold px-2 py-1 rounded-full ${getCategoryBg(expense.category)} ${getCategoryColor(expense.category)}`}>
              {expense.category}
            </span>
            <span className="text-xs text-gray-500">{expense.date}</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2 ml-3">
          <div className={`text-lg font-bold ${getCategoryColor(expense.category)}`}>
            ${expense.amount.toFixed(2)}
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => onEdit(expense)}
              className="p-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onDelete(expense.id, expense.description)}
              className="p-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;