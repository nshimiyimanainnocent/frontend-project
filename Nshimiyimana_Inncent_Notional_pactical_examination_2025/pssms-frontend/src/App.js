import React, { useState, useEffect } from 'react';
import axios from 'axios';

// Configure axios
axios.defaults.baseURL = 'http://localhost:5000';
axios.defaults.withCredentials = true;

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('login');
  const [slots, setSlots] = useState([]);
  const [parkingRecords, setParkingRecords] = useState([]);
  const [dailyReport, setDailyReport] = useState([]);
  const [filteredReport, setFilteredReport] = useState([]);
  const [weeklyReport, setWeeklyReport] = useState([]);
  const [monthlyReport, setMonthlyReport] = useState([]);
  const [allPayments, setAllPayments] = useState([]);
  const [paymentStats, setPaymentStats] = useState({
    totalRevenue: 0,
    totalTransactions: 0,
    avgAmount: 0,
    todayRevenue: 0,
    weeklyRevenue: 0,
    monthlyRevenue: 0
  });
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalTransactions, setTotalTransactions] = useState(0);
  const [loading, setLoading] = useState(false);
  const [billData, setBillData] = useState(null);
  const [loginData, setLoginData] = useState({ username: '', password: '' });
  const [dateFilter, setDateFilter] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [reportSummary, setReportSummary] = useState({
    totalAmount: 0,
    totalTransactions: 0,
    uniqueVehicles: 0
  });
  const [formData, setFormData] = useState({
    plate_number: '',
    driver_name: '',
    phone: '',
    slot_id: '',
    entry_time: '',
    record_id: ''
  });

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await axios.get('/api/check-auth');
      if (response.data.authenticated) {
        setIsAuthenticated(true);
        setUser(response.data.user);
        setActiveTab('dashboard');
        fetchAllData();
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    }
  };

  const fetchAllData = async () => {
    setLoading(true);
    await Promise.all([
      fetchSlots(),
      fetchParkingRecords(),
      fetchDailyReport(),
      fetchWeeklyReport(),
      fetchMonthlyReport(),
      fetchAllPayments(),
      fetchRevenueStats()
    ]);
    setLoading(false);
  };

  const fetchSlots = async () => {
    try {
      const response = await axios.get('/api/slots');
      setSlots(response.data);
    } catch (error) {
      console.error('Error fetching slots:', error);
    }
  };

  const fetchParkingRecords = async () => {
    try {
      const response = await axios.get('/api/parking-records');
      setParkingRecords(response.data);
    } catch (error) {
      console.error('Error fetching records:', error);
    }
  };

  const fetchDailyReport = async () => {
    try {
      const response = await axios.get('/api/daily-report');
      setDailyReport(response.data);
      applyDateFilter(dateFilter.startDate, dateFilter.endDate, response.data);
    } catch (error) {
      console.error('Error fetching daily report:', error);
    }
  };

  const fetchWeeklyReport = async () => {
    try {
      const response = await axios.get('/api/weekly-report');
      setWeeklyReport(response.data);
    } catch (error) {
      console.error('Error fetching weekly report:', error);
    }
  };

  const fetchMonthlyReport = async () => {
    try {
      const response = await axios.get('/api/monthly-report');
      setMonthlyReport(response.data);
    } catch (error) {
      console.error('Error fetching monthly report:', error);
    }
  };

  const fetchAllPayments = async () => {
    try {
      const response = await axios.get('/api/all-payments');
      setAllPayments(response.data);
      calculatePaymentStats(response.data);
    } catch (error) {
      console.error('Error fetching payments:', error);
    }
  };

  const fetchRevenueStats = async () => {
    try {
      await axios.get('/api/statistics');
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const calculatePaymentStats = (payments) => {
    const total = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const today = new Date().toISOString().split('T')[0];
    const todayPayments = payments.filter(p => p.payment_date?.split('T')[0] === today);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekPayments = payments.filter(p => new Date(p.payment_date) >= weekAgo);
    const monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    const monthPayments = payments.filter(p => new Date(p.payment_date) >= monthAgo);
    
    setPaymentStats({
      totalRevenue: total,
      totalTransactions: payments.length,
      avgAmount: payments.length > 0 ? total / payments.length : 0,
      todayRevenue: todayPayments.reduce((sum, p) => sum + (p.amount || 0), 0),
      weeklyRevenue: weekPayments.reduce((sum, p) => sum + (p.amount || 0), 0),
      monthlyRevenue: monthPayments.reduce((sum, p) => sum + (p.amount || 0), 0)
    });
  };

  const fetchCustomReport = async (startDate, endDate) => {
    setLoading(true);
    try {
      const response = await axios.post('/api/custom-report', {
        start_date: startDate,
        end_date: endDate
      });
      setFilteredReport(response.data.records || []);
      setReportSummary({
        totalAmount: response.data.summary?.total_revenue || 0,
        totalTransactions: response.data.summary?.total_transactions || 0,
        uniqueVehicles: response.data.summary?.unique_vehicles || 0
      });
    } catch (error) {
      console.error('Error fetching custom report:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyDateFilter = (startDate, endDate, data = dailyReport) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    
    const filtered = data.filter(item => {
      const itemDate = new Date(item.exit_time || item.payment_date || item.entry_time);
      return itemDate >= start && itemDate <= end;
    });
    
    setFilteredReport(filtered);
    
    const total = filtered.reduce((sum, item) => sum + (item.amount_paid || 0), 0);
    const uniqueVehicles = new Set(filtered.map(item => item.plate_number)).size;
    
    setReportSummary({
      totalAmount: total,
      totalTransactions: filtered.length,
      uniqueVehicles: uniqueVehicles
    });
    setTotalRevenue(total);
    setTotalTransactions(filtered.length);
  };

  const handleDateFilterChange = (e) => {
    const { name, value } = e.target;
    const newDateFilter = { ...dateFilter, [name]: value };
    setDateFilter(newDateFilter);
    
    if (newDateFilter.startDate && newDateFilter.endDate) {
      fetchCustomReport(newDateFilter.startDate, newDateFilter.endDate);
    }
  };

  const resetAllSlots = async () => {
    setLoading(true);
    try {
      const response = await axios.post('/api/reset-slots');
      alert('✅ ' + response.data.message);
      await fetchSlots();
    } catch (error) {
      alert('Error resetting slots: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await axios.post('/api/login', loginData);
      setIsAuthenticated(true);
      setUser(response.data.user);
      setActiveTab('dashboard');
      await fetchAllData();
    } catch (error) {
      alert('Login failed: ' + (error.response?.data?.error || 'Invalid credentials'));
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await axios.post('/api/logout');
      setIsAuthenticated(false);
      setUser(null);
      setActiveTab('login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleCarEntry = async (e) => {
    e.preventDefault();
    if (!formData.slot_id) {
      alert('Please select a parking slot');
      return;
    }
    
    setLoading(true);
    try {
      const carResponse = await axios.post('/api/cars', {
        plate_number: formData.plate_number,
        driver_name: formData.driver_name,
        phone: formData.phone
      });
      
      await axios.post('/api/parking-records', {
        car_id: carResponse.data.car_id,
        slot_id: formData.slot_id,
        entry_time: new Date().toISOString().slice(0, 19).replace('T', ' ')
      });
      
      alert('✅ Car entry recorded successfully!');
      setFormData({
        plate_number: '',
        driver_name: '',
        phone: '',
        slot_id: '',
        entry_time: '',
        record_id: ''
      });
      await fetchAllData();
    } catch (error) {
      alert('Error: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleCarExit = async (e) => {
    e.preventDefault();
    if (!formData.record_id) {
      alert('Please select a parking record');
      return;
    }
    
    setLoading(true);
    try {
      const response = await axios.post('/api/generate-bill', {
        record_id: formData.record_id,
        exit_time: new Date().toISOString().slice(0, 19).replace('T', ' ')
      });
      setBillData(response.data);
      alert(`💰 Bill generated: ${response.data.amount_paid} RWF`);
      setFormData({ ...formData, record_id: '' });
      await fetchAllData();
    } catch (error) {
      alert('Error: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRecord = async (recordId) => {
    if (window.confirm('Delete this record?')) {
      setLoading(true);
      try {
        await axios.delete(`/api/parking-records/${recordId}`);
        alert('Record deleted');
        await fetchAllData();
      } catch (error) {
        alert('Error: ' + (error.response?.data?.error || error.message));
      } finally {
        setLoading(false);
      }
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('rw-RW', {
      style: 'currency',
      currency: 'RWF',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatShortDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  const availableSlots = slots.filter(slot => slot.status === 'available');
  const activeRecords = parkingRecords.filter(record => record.status === 'active');

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊', color: 'from-blue-500 to-blue-600' },
    { id: 'car-entry', label: 'Car Entry', icon: '🚗', color: 'from-green-500 to-green-600' },
    { id: 'car-exit', label: 'Car Exit', icon: '🚙', color: 'from-yellow-500 to-yellow-600' },
    { id: 'records', label: 'Records', icon: '📝', color: 'from-purple-500 to-purple-600' },
    { id: 'payments', label: 'Payments', icon: '💰', color: 'from-pink-500 to-rose-600' },
    { id: 'report', label: 'Daily Report', icon: '📈', color: 'from-indigo-500 to-indigo-600' }
  ];

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-8 w-full max-w-md border border-white/20">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">🅿️</div>
            <h1 className="text-4xl font-bold text-white mb-2">SmartPark</h1>
            <p className="text-gray-200">Parking Management System</p>
            <p className="text-sm text-gray-300 mt-1">Rubavu District, Rwanda</p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-gray-200 mb-2 font-semibold">Username</label>
              <input
                type="text"
                className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50"
                value={loginData.username}
                onChange={(e) => setLoginData({ ...loginData, username: e.target.value })}
                required
                placeholder="Enter username"
              />
            </div>
            <div>
              <label className="block text-gray-200 mb-2 font-semibold">Password</label>
              <input
                type="password"
                className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50"
                value={loginData.password}
                onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                required
                placeholder="Enter password"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 rounded-lg hover:from-blue-600 hover:to-purple-700 transition font-semibold disabled:opacity-50"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>
          
          <div className="mt-6 p-4 bg-white/10 rounded-lg backdrop-blur-sm">
            <p className="text-sm text-gray-200 text-center">
              <strong>Demo Credentials:</strong><br />
              Username: <span className="font-mono">admin</span><br />
              Password: <span className="font-mono">admin123</span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-600 to-purple-700 shadow-lg sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-white">SmartPark PSSMS</h1>
              <p className="text-sm text-blue-100">Rubavu District, Western Province, Rwanda</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-white font-semibold">Welcome, {user?.username}</p>
                <p className="text-xs text-blue-100">Parking Manager</p>
              </div>
              <button
                onClick={handleLogout}
                className="bg-red-500/20 hover:bg-red-500/30 text-white px-5 py-2 rounded-lg transition font-semibold backdrop-blur-sm"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-wrap gap-3 mb-8">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setBillData(null); }}
              className={`
                relative px-6 py-3 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105
                ${activeTab === tab.id 
                  ? `bg-gradient-to-r ${tab.color} text-white shadow-lg` 
                  : 'bg-white text-gray-700 hover:shadow-md border border-gray-200'
                }
              `}
            >
              <span className="text-xl mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Loading Overlay */}
        {loading && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-2xl shadow-2xl">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-4 text-gray-700">Processing...</p>
            </div>
          </div>
        )}

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
                <div className="text-3xl mb-2">🅿️</div>
                <div className="text-2xl font-bold">{slots.length}</div>
                <div className="text-sm opacity-90">Total Slots</div>
              </div>
              <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg">
                <div className="text-3xl mb-2">✅</div>
                <div className="text-2xl font-bold">{availableSlots.length}</div>
                <div className="text-sm opacity-90">Available Slots</div>
              </div>
              <div className="bg-gradient-to-r from-red-500 to-red-600 rounded-xl p-6 text-white shadow-lg">
                <div className="text-3xl mb-2">🔴</div>
                <div className="text-2xl font-bold">{slots.length - availableSlots.length}</div>
                <div className="text-sm opacity-90">Occupied Slots</div>
              </div>
              <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg">
                <div className="text-3xl mb-2">🚗</div>
                <div className="text-2xl font-bold">{activeRecords.length}</div>
                <div className="text-sm opacity-90">Active Vehicles</div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Parking Slots Status</h2>
                <button
                  onClick={resetAllSlots}
                  className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-5 py-2 rounded-lg hover:from-blue-600 hover:to-blue-700 transition font-semibold"
                >
                  🔄 Reset All Slots
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {slots.map(slot => (
                  <div
                    key={slot.slot_id}
                    className={`p-4 rounded-xl text-center transition-all transform hover:scale-105 cursor-pointer ${
                      slot.status === 'available'
                        ? 'bg-gradient-to-br from-green-400 to-green-500 text-white shadow-md hover:shadow-xl'
                        : 'bg-gradient-to-br from-red-400 to-red-500 text-white shadow-md hover:shadow-xl'
                    }`}
                  >
                    <div className="text-3xl font-bold">{slot.slot_number}</div>
                    <div className="text-sm mt-2 font-semibold">
                      {slot.status === 'available' ? 'Available' : 'Occupied'}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-bold mb-6 text-gray-800">Currently Parked Vehicles</h2>
              {activeRecords.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🚗💨</div>
                  <p className="text-gray-500 text-lg">No vehicles currently parked</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gradient-to-r from-gray-800 to-gray-900 text-white rounded-lg">
                      <tr>
                        <th className="px-4 py-3 text-left">Plate Number</th>
                        <th className="px-4 py-3 text-left">Driver</th>
                        <th className="px-4 py-3 text-left">Phone</th>
                        <th className="px-4 py-3 text-left">Slot</th>
                        <th className="px-4 py-3 text-left">Entry Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeRecords.map(record => (
                        <tr key={record.record_id} className="border-b hover:bg-gray-50 transition">
                          <td className="px-4 py-3 font-semibold text-gray-800">{record.plate_number}</td>
                          <td className="px-4 py-3">{record.driver_name}</td>
                          <td className="px-4 py-3">{record.phone}</td>
                          <td className="px-4 py-3">
                            <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold">
                              {record.slot_number}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-600">{new Date(record.entry_time).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Car Entry Tab */}
        {activeTab === 'car-entry' && (
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="text-center mb-8">
              <div className="text-5xl mb-3">🚗</div>
              <h2 className="text-3xl font-bold text-gray-800">Record New Car Entry</h2>
              <p className="text-gray-600 mt-2">Enter vehicle details to register parking</p>
            </div>
            
            <form onSubmit={handleCarEntry} className="max-w-2xl mx-auto space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-gray-700 font-semibold mb-2">Plate Number *</label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-green-500 transition"
                    value={formData.plate_number}
                    onChange={(e) => setFormData({ ...formData, plate_number: e.target.value.toUpperCase() })}
                    required
                    placeholder="e.g., RAB001A"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-semibold mb-2">Driver Name *</label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-green-500 transition"
                    value={formData.driver_name}
                    onChange={(e) => setFormData({ ...formData, driver_name: e.target.value })}
                    required
                    placeholder="Full name"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-semibold mb-2">Phone Number *</label>
                  <input
                    type="tel"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-green-500 transition"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    required
                    placeholder="e.g., 0788 123 456"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-semibold mb-2">Select Parking Slot *</label>
                  <select
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-green-500 transition"
                    value={formData.slot_id}
                    onChange={(e) => setFormData({ ...formData, slot_id: e.target.value })}
                    required
                  >
                    <option value="">Select a slot</option>
                    {availableSlots.map(slot => (
                      <option key={slot.slot_id} value={slot.slot_id}>
                        {slot.slot_number} - Available
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  disabled={loading || availableSlots.length === 0}
                  className="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white py-3 rounded-lg hover:from-green-600 hover:to-green-700 transition font-semibold disabled:opacity-50"
                >
                  🚗 Record Entry
                </button>
                <button
                  type="button"
                  onClick={resetAllSlots}
                  className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-3 rounded-lg hover:from-blue-600 hover:to-blue-700 transition font-semibold"
                >
                  🔄 Reset Slots
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Car Exit Tab */}
        {activeTab === 'car-exit' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-lg p-8">
              <div className="text-center mb-8">
                <div className="text-5xl mb-3">🚙</div>
                <h2 className="text-3xl font-bold text-gray-800">Process Car Exit</h2>
                <p className="text-gray-600 mt-2">Generate bill and process vehicle exit</p>
              </div>
              
              <form onSubmit={handleCarExit} className="max-w-2xl mx-auto">
                <div className="mb-6">
                  <label className="block text-gray-700 font-semibold mb-2">Select Vehicle *</label>
                  <select
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-yellow-500 transition"
                    value={formData.record_id}
                    onChange={(e) => setFormData({ ...formData, record_id: e.target.value })}
                    required
                  >
                    <option value="">Select a parked vehicle</option>
                    {activeRecords.map(record => (
                      <option key={record.record_id} value={record.record_id}>
                        {record.plate_number} - {record.driver_name} (Slot: {record.slot_number})
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={loading || activeRecords.length === 0}
                  className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 text-white py-3 rounded-lg hover:from-yellow-600 hover:to-yellow-700 transition font-semibold disabled:opacity-50"
                >
                  🧾 Generate Bill & Exit
                </button>
              </form>
            </div>

            {billData && (
              <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl shadow-lg p-8 border-2 border-yellow-400">
                <div className="text-center mb-6">
                  <div className="text-5xl mb-3">🧾</div>
                  <h3 className="text-2xl font-bold text-gray-800">Parking Bill</h3>
                  <p className="text-gray-600">SmartPark - Rubavu District, Rwanda</p>
                </div>
                <div className="space-y-3 max-w-md mx-auto">
                  <div className="flex justify-between py-2 border-b">
                    <span className="font-semibold">Plate Number:</span>
                    <span className="font-bold text-blue-600 text-lg">{billData.plate_number}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="font-semibold">Entry Time:</span>
                    <span>{new Date(billData.entry_time).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="font-semibold">Exit Time:</span>
                    <span>{new Date(billData.exit_time).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="font-semibold">Duration:</span>
                    <span className="font-bold text-yellow-600">{billData.duration} hour(s)</span>
                  </div>
                  <div className="flex justify-between py-4 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-lg px-4 mt-4">
                    <span className="font-bold text-white text-lg">Total Amount:</span>
                    <span className="font-bold text-white text-2xl">{billData.amount_paid} RWF</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Records Tab */}
        {activeTab === 'records' && (
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="text-center mb-8">
              <div className="text-5xl mb-3">📝</div>
              <h2 className="text-3xl font-bold text-gray-800">Parking Records</h2>
              <p className="text-gray-600 mt-2">Complete parking history</p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
                  <tr>
                    <th className="px-4 py-3 text-left">Plate</th>
                    <th className="px-4 py-3 text-left">Driver</th>
                    <th className="px-4 py-3 text-left">Slot</th>
                    <th className="px-4 py-3 text-left">Entry Time</th>
                    <th className="px-4 py-3 text-left">Exit Time</th>
                    <th className="px-4 py-3 text-left">Duration</th>
                    <th className="px-4 py-3 text-left">Amount</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {parkingRecords.map(record => (
                    <tr key={record.record_id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3 font-semibold">{record.plate_number}</td>
                      <td className="px-4 py-3">{record.driver_name}</td>
                      <td className="px-4 py-3">{record.slot_number}</td>
                      <td className="px-4 py-3 text-sm">{new Date(record.entry_time).toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm">{record.exit_time ? new Date(record.exit_time).toLocaleString() : '-'}</td>
                      <td className="px-4 py-3">{record.duration || '-'}</td>
                      <td className="px-4 py-3 font-semibold text-green-600">{record.amount_paid ? record.amount_paid + ' RWF' : '-'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          record.status === 'active' ? 'bg-green-200 text-green-800' : 'bg-gray-200 text-gray-800'
                        }`}>
                          {record.status === 'active' ? 'Parked' : 'Completed'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {record.status === 'active' && (
                          <button
                            onClick={() => handleDeleteRecord(record.record_id)}
                            className="bg-red-500 text-white px-3 py-1 rounded-lg text-sm hover:bg-red-600"
                          >
                            Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Payments Tab */}
        {activeTab === 'payments' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg">
                <div className="text-3xl mb-2">💰</div>
                <div className="text-2xl font-bold">{formatCurrency(paymentStats.totalRevenue)}</div>
                <div className="text-sm opacity-90">Total Revenue</div>
              </div>
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
                <div className="text-3xl mb-2">📊</div>
                <div className="text-2xl font-bold">{paymentStats.totalTransactions}</div>
                <div className="text-sm opacity-90">Total Transactions</div>
              </div>
              <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg">
                <div className="text-3xl mb-2">⭐</div>
                <div className="text-2xl font-bold">{formatCurrency(paymentStats.avgAmount)}</div>
                <div className="text-sm opacity-90">Average Amount</div>
              </div>
              <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-xl p-6 text-white shadow-lg">
                <div className="text-3xl mb-2">📅</div>
                <div className="text-2xl font-bold">{formatCurrency(paymentStats.todayRevenue)}</div>
                <div className="text-sm opacity-90">Today's Revenue</div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-8">
              <div className="text-center mb-8">
                <div className="text-5xl mb-3">💳</div>
                <h2 className="text-3xl font-bold text-gray-800">Payment History</h2>
                <p className="text-gray-600 mt-2">Complete payment transactions history</p>
              </div>
              
              {allPayments.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gradient-to-r from-pink-600 to-rose-600 text-white">
                      <tr>
                        <th className="px-4 py-3 text-left">#</th>
                        <th className="px-4 py-3 text-left">Plate Number</th>
                        <th className="px-4 py-3 text-left">Driver Name</th>
                        <th className="px-4 py-3 text-left">Amount</th>
                        <th className="px-4 py-3 text-left">Payment Date</th>
                        <th className="px-4 py-3 text-left">Duration</th>
                        <th className="px-4 py-3 text-left">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allPayments.map((payment, index) => (
                        <tr key={payment.payment_id || index} className="border-b hover:bg-gray-50 transition">
                          <td className="px-4 py-3 font-semibold text-gray-600">{index + 1}</td>
                          <td className="px-4 py-3 font-semibold text-gray-800">{payment.plate_number || 'N/A'}</td>
                          <td className="px-4 py-3 text-gray-700">{payment.driver_name || 'N/A'}</td>
                          <td className="px-4 py-3 font-bold text-green-600">{formatCurrency(payment.amount)}</td>
                          <td className="px-4 py-3 text-gray-600">{formatDate(payment.payment_date)}</td>
                          <td className="px-4 py-3 text-center">
                            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-semibold">
                              {payment.duration || '-'} hrs
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-semibold">
                              Completed
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gradient-to-r from-gray-100 to-gray-200">
                      <tr className="font-bold">
                        <td colSpan="3" className="px-4 py-4 text-right text-lg">Total:</td>
                        <td className="px-4 py-4 text-left text-2xl text-green-600">{formatCurrency(paymentStats.totalRevenue)}</td>
                        <td colSpan="3"></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">💳</div>
                  <p className="text-gray-500 text-lg">No payment records found</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Daily Report Tab */}
        {activeTab === 'report' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
              <h3 className="text-xl font-bold mb-4 text-center">📅 Filter Report by Date</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold mb-2">Start Date</label>
                  <input
                    type="date"
                    name="startDate"
                    value={dateFilter.startDate}
                    onChange={handleDateFilterChange}
                    className="w-full px-4 py-3 rounded-lg text-gray-800 font-semibold focus:outline-none focus:ring-2 focus:ring-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">End Date</label>
                  <input
                    type="date"
                    name="endDate"
                    value={dateFilter.endDate}
                    onChange={handleDateFilterChange}
                    className="w-full px-4 py-3 rounded-lg text-gray-800 font-semibold focus:outline-none focus:ring-2 focus:ring-white"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg">
                <div className="text-3xl mb-2">💰</div>
                <div className="text-2xl font-bold">{formatCurrency(reportSummary.totalAmount)}</div>
                <div className="text-sm opacity-90">Total Revenue</div>
              </div>
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
                <div className="text-3xl mb-2">📊</div>
                <div className="text-2xl font-bold">{reportSummary.totalTransactions}</div>
                <div className="text-sm opacity-90">Total Transactions</div>
              </div>
              <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg">
                <div className="text-3xl mb-2">🚗</div>
                <div className="text-2xl font-bold">{reportSummary.uniqueVehicles}</div>
                <div className="text-sm opacity-90">Unique Vehicles</div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-8">
              <div className="text-center mb-8">
                <div className="text-5xl mb-3">📈</div>
                <h2 className="text-3xl font-bold text-gray-800">Payment Report</h2>
                <p className="text-gray-600 mt-2">
                  Report from {formatShortDate(dateFilter.startDate)} to {formatShortDate(dateFilter.endDate)}
                </p>
              </div>
              
              {filteredReport.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
                      <tr>
                        <th className="px-4 py-3 text-left">#</th>
                        <th className="px-4 py-3 text-left">Plate Number</th>
                        <th className="px-4 py-3 text-left">Driver Name</th>
                        <th className="px-4 py-3 text-left">Entry Time</th>
                        <th className="px-4 py-3 text-left">Exit Time</th>
                        <th className="px-4 py-3 text-center">Duration (hrs)</th>
                        <th className="px-4 py-3 text-right">Amount Paid</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredReport.map((report, index) => (
                        <tr key={index} className="border-b hover:bg-gray-50 transition">
                          <td className="px-4 py-3 font-semibold text-gray-600">{index + 1}</td>
                          <td className="px-4 py-3 font-semibold text-gray-800">{report.plate_number}</td>
                          <td className="px-4 py-3 text-gray-700">{report.driver_name || 'N/A'}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{formatDate(report.entry_time)}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{formatDate(report.exit_time)}</td>
                          <td className="px-4 py-3 text-center font-semibold text-blue-600">{report.duration}</td>
                          <td className="px-4 py-3 text-right font-bold text-green-600">{formatCurrency(report.amount_paid)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gradient-to-r from-gray-100 to-gray-200">
                      <tr className="font-bold">
                        <td colSpan="6" className="px-4 py-4 text-right text-lg">Total Revenue:</td>
                        <td className="px-4 py-4 text-right text-2xl text-green-600">{formatCurrency(reportSummary.totalAmount)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">📭</div>
                  <p className="text-gray-500 text-lg">No payments recorded in this date range</p>
                </div>
              )}
            </div>

            {weeklyReport.length > 0 && (
              <div className="bg-white rounded-xl shadow-lg p-8">
                <h3 className="text-2xl font-bold text-gray-800 mb-6 text-center">Weekly Summary (Last 7 Days)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {weeklyReport.slice(0, 4).map((week, index) => (
                    <div key={index} className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 text-center">
                      <div className="text-sm text-gray-600 font-semibold">{week.date}</div>
                      <div className="text-2xl font-bold text-blue-600 mt-2">{week.total_transactions}</div>
                      <div className="text-xs text-gray-600">Transactions</div>
                      <div className="text-lg font-semibold text-green-600 mt-2">{formatCurrency(week.total_revenue)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;