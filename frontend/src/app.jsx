import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, DollarSign, TrendingUp, TrendingDown, List, PieChart } from 'lucide-react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

function App() {
  const [activeTab, setActiveTab] = useState('add');
  const [expenses, setExpenses] = useState([
    { id: 1, date: new Date().toISOString().split('T')[0], description: '', category: 'Income', amount: '' }
  ]);
  const [recentExpenses, setRecentExpenses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const categories = ['Income', 'Needs', 'Wants'];

  useEffect(() => {
    if (activeTab === 'history') {
      fetchRecentExpenses();
    }
  }, [activeTab]);

  const fetchRecentExpenses = async () => {
    try {
      const response = await fetch(`${API_URL}/summary`);
      const data = await response.json();
      setRecentExpenses(data.expenses || []);
    } catch (error) {
      console.error('Error fetching expenses:', error);
    }
  };

  const addExpenseRow = () => {
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
        body: JSON.stringify({ expenses: validExpenses })
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: `✓ Added ${validExpenses.length} expense(s) successfully!` });
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

  const summary = recentExpenses.reduce((acc, exp) => {
    if (exp.category === 'Income') acc.income += exp.amount;
    else if (exp.category === 'Needs') acc.needs += exp.amount;
    else if (exp.category === 'Wants') acc.wants += exp.amount;
    return acc;
  }, { income: 0, needs: 0, wants: 0 });

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 via-pink-50 to-blue-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-6 pb-20 shadow-lg">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <DollarSign className="w-8 h-8" />
          Expense Tracker
        </h1>
        <p className="text-purple-100 text-sm mt-1">Manage your finances easily</p>
      </div>

      {/* Tab Navigation */}
      <div className="relative -mt-12 mx-4 bg-white rounded-2xl shadow-xl p-2 flex gap-2">
        <button
          onClick={() => setActiveTab('add')}
          className={`flex-1 py-3 rounded-xl font-semibold transition-all ${
            activeTab === 'add'
              ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-md'
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
              ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-md'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <List className="w-5 h-5 inline mr-1" />
          History
        </button>
      </div>

      {/* Message */}
      {message.text && (
        <div className={`mx-4 mt-4 p-4 rounded-xl ${
          message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {message.text}
        </div>
      )}

      {/* Add Expenses Tab */}
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
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Category</label>
                  <select
                    value={expense.category}
                    onChange={(e) => updateExpense(expense.id, 'category', e.target.value)}
                    className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none"
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
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
            className="w-full py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold rounded-2xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
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

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className="p-4 space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-xl p-4 shadow-lg">
              <TrendingUp className="w-6 h-6 mb-2" />
              <div className="text-xs opacity-90">Income</div>
              <div className="text-lg font-bold">${summary.income.toFixed(2)}</div>
            </div>
            <div className="bg-gradient-to-br from-red-500 to-red-600 text-white rounded-xl p-4 shadow-lg">
              <TrendingDown className="w-6 h-6 mb-2" />
              <div className="text-xs opacity-90">Needs</div>
              <div className="text-lg font-bold">${summary.needs.toFixed(2)}</div>
            </div>
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl p-4 shadow-lg">
              <PieChart className="w-6 h-6 mb-2" />
              <div className="text-xs opacity-90">Wants</div>
              <div className="text-lg font-bold">${summary.wants.toFixed(2)}</div>
            </div>
          </div>

          {/* Savings Card */}
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-2xl p-6 shadow-xl">
            <div className="text-sm opacity-90">Current Savings</div>
            <div className="text-3xl font-bold mt-1">
              ${(summary.income - summary.needs - summary.wants).toFixed(2)}
            </div>
          </div>

          {/* Recent Expenses List */}
          <div className="space-y-3">
            <h2 className="font-bold text-gray-700 text-lg px-2">Recent Transactions</h2>
            {recentExpenses.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center text-gray-400">
                No expenses yet. Start adding some!
              </div>
            ) : (
              recentExpenses.slice(0, 20).map((exp, idx) => (
                <div key={idx} className="bg-white rounded-xl p-4 shadow-md border-l-4 border-purple-500">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="font-semibold text-gray-800">{exp.description}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${getCategoryBg(exp.category)} ${getCategoryColor(exp.category)}`}>
                          {exp.category}
                        </span>
                        <span className="text-xs text-gray-500">{exp.date}</span>
                      </div>
                    </div>
                    <div className={`text-lg font-bold ${getCategoryColor(exp.category)}`}>
                      ${exp.amount.toFixed(2)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Bottom padding */}
      <div className="h-20"></div>
    </div>
  );
}

export default App;
