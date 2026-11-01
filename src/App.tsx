import { useState, useEffect, useMemo, type FormEvent } from 'react';
import {
  Users,
  Calendar,
  CheckCircle2,
  Plus,
  Search,
  Filter,
  RotateCcw,
  IndianRupee,
  Printer,
  Edit3,
  Trash2,
  Building2,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  AlertCircle,
  Briefcase,
  FileText,
  Download,
  X,
  BadgeCheck
} from 'lucide-react';

// --- Types ---
type StatusCode = 'P' | 'A';

interface StatusConfig {
  code: StatusCode;
  label: string;
  short: string;
  bg: string;
  activeBg: string;
  cellBg: string;
  dot: string;
}

// All staff are a single type: Housekeeping
interface Employee {
  id: string;
  name: string;
  role: string;
  department: string;
  perDaySalary: number;
  pfDeduction: number;
  joinDate: string;
}

// A record may hold only a remark; a missing status means Present once the date has arrived
interface AttendanceEntry {
  status?: StatusCode;
  remarks?: string;
}

type AttendanceRecords = Record<string, Record<string, AttendanceEntry>>;

interface PayrollAdjustment {
  bonus: number;
  advance: number;
  extraDays: number;
}

type AdjustmentField = keyof PayrollAdjustment;

interface EmployeeMonthStats {
  present: number;
  absent: number;
  upcoming: number;
  extraDays: number;
  effectiveDays: number;
  perDaySalary: number;
  earnedBasicSalary: number;
  bonus: number;
  advance: number;
  pfDeduction: number;
  pfWaived: boolean;
  grossEarned: number;
  totalDeductions: number;
  netPayable: number;
  shortfall: number;
}

type Tab = 'daily' | 'monthly' | 'payroll' | 'employees';

const COMPANY_NAME = 'SLG Housekeeping & Facility Services';

// --- Constants & Simplified Status Configurations (Only Present & Absent) ---
const STATUS_CONFIG: Record<StatusCode, StatusConfig> = {
  P: {
    code: 'P',
    label: 'Present',
    short: 'P',
    bg: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    activeBg: 'bg-emerald-600 text-white border-emerald-600 shadow-sm',
    cellBg: 'bg-emerald-500/15 text-emerald-700 border-emerald-200 hover:bg-emerald-500/25',
    dot: 'bg-emerald-500'
  },
  A: {
    code: 'A',
    label: 'Absent',
    short: 'A',
    bg: 'bg-rose-100 text-rose-800 border-rose-300',
    activeBg: 'bg-rose-600 text-white border-rose-600 shadow-sm',
    cellBg: 'bg-rose-500/15 text-rose-700 border-rose-200 hover:bg-rose-500/25',
    dot: 'bg-rose-500'
  }
};

const STATUS_CYCLE: StatusCode[] = ['P', 'A'];

// Monthly grid cell for a date that has not arrived yet (not clickable)
const FUTURE_CELL = 'bg-slate-100 border-slate-100';

const INITIAL_EMPLOYEES: Employee[] = [
  {
    id: 'EMP-101',
    name: 'Rajesh Sharma',
    role: 'Operations Manager',
    department: 'Operations',
    perDaySalary: 1200,
    pfDeduction: 1500,
    joinDate: '2023-03-15'
  },
  {
    id: 'EMP-102',
    name: 'Priya Nair',
    role: 'Senior Accountant',
    department: 'Accounts',
    perDaySalary: 1000,
    pfDeduction: 1200,
    joinDate: '2023-06-01'
  },
  {
    id: 'EMP-103',
    name: 'Suresh Babu',
    role: 'Floor Supervisor',
    department: 'Operations',
    perDaySalary: 850,
    pfDeduction: 800,
    joinDate: '2023-08-12'
  },
  {
    id: 'EMP-104',
    name: 'Karthik Reddy',
    role: 'IT & Systems Support',
    department: 'Tech',
    perDaySalary: 950,
    pfDeduction: 1000,
    joinDate: '2024-01-10'
  },
  {
    id: 'EMP-105',
    name: 'Ananya Verma',
    role: 'HR & Admin Executive',
    department: 'Admin',
    perDaySalary: 750,
    pfDeduction: 600,
    joinDate: '2024-02-20'
  },
  {
    id: 'EMP-106',
    name: 'Vikram Singh',
    role: 'Dispatch & Store Assistant',
    department: 'Operations',
    perDaySalary: 650,
    pfDeduction: 0,
    joinDate: '2024-04-18'
  },
  {
    id: 'EMP-107',
    name: 'Meena Kumari',
    role: 'Front Desk Assistant',
    department: 'Admin',
    perDaySalary: 550,
    pfDeduction: 0,
    joinDate: '2024-05-05'
  },
  {
    id: 'EMP-108',
    name: 'Lakshmi Devi',
    role: 'Senior Housekeeping Staff',
    department: 'Facility',
    perDaySalary: 500,
    pfDeduction: 0,
    joinDate: '2024-06-10'
  },
  {
    id: 'EMP-109',
    name: 'Ramesh Goud',
    role: 'Facility Helper & Attendant',
    department: 'Facility',
    perDaySalary: 450,
    pfDeduction: 0,
    joinDate: '2024-07-01'
  },
  {
    id: 'EMP-110',
    name: 'Naveen Kumar',
    role: 'Security & Gate Staff',
    department: 'Facility',
    perDaySalary: 600,
    pfDeduction: 0,
    joinDate: '2024-08-01'
  }
];

const DEPARTMENTS = ['All', 'Operations', 'Accounts', 'Tech', 'Admin', 'Facility'];

// Helper to format YYYY-MM-DD
const formatDateKey = (year: number, month: number, day: number) => {
  const m = String(month + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
};

// Parse YYYY-MM-DD as a local date (new Date('YYYY-MM-DD') would parse it as UTC)
const parseDateKey = (dateKey: string) => {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, m - 1, d);
};

const todayKey = () => {
  const t = new Date();
  return formatDateKey(t.getFullYear(), t.getMonth(), t.getDate());
};

// Next free ID: one past the highest existing EMP-<number>, so deleted IDs are never reused
const nextEmployeeId = (employees: Employee[]) => {
  const maxNum = employees.reduce((max, e) => {
    const n = Number(/^EMP-(\d+)$/.exec(e.id)?.[1]);
    return Number.isFinite(n) && n > max ? n : max;
  }, 100);
  return `EMP-${maxNum + 1}`;
};

// Quote a CSV cell and escape embedded quotes
const csvCell = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;

// Generate realistic demo attendance using ONLY Present (P) and Absent (A),
// for days up to today only, so future days stay upcoming
const generateDemoAttendance = (employees: Employee[], year: number, month: number) => {
  const records: AttendanceRecords = {};
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = todayKey();

  for (let d = 1; d <= daysInMonth; d++) {
    const dateKey = formatDateKey(year, month, d);
    if (dateKey > today) break;
    records[dateKey] = {};

    employees.forEach((emp, idx) => {
      const seed = (d * 13 + idx * 7) % 100;
      const isAbsent = seed === 4 || seed === 19 || seed === 31;

      records[dateKey][emp.id] = {
        status: isAbsent ? 'A' : 'P',
        remarks: isAbsent ? 'Absent' : ''
      };
    });
  }
  return records;
};

// Demo data covers the current and previous month
const generateInitialDemoAttendance = (employees: Employee[]): AttendanceRecords => {
  const now = new Date();
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return {
    ...generateDemoAttendance(employees, prev.getFullYear(), prev.getMonth()),
    ...generateDemoAttendance(employees, now.getFullYear(), now.getMonth())
  };
};

const EMPTY_ADJUSTMENT: PayrollAdjustment = { bonus: 0, advance: 0, extraDays: 0 };

// Format INR Currency
const formatCurrency = (val: number | undefined) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(Math.round(val || 0));
};

export default function App() {
  const todayObj = new Date();
  const initialYear = todayObj.getFullYear();
  const initialMonth = todayObj.getMonth();
  const initialDateStr = formatDateKey(initialYear, initialMonth, todayObj.getDate());

  // Navigation & UI State
  const [activeTab, setActiveTab] = useState<Tab>('daily');
  const [selectedDate, setSelectedDate] = useState(initialDateStr);
  const [selectedYear, setSelectedYear] = useState(initialYear);
  const [selectedMonth, setSelectedMonth] = useState(initialMonth);
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('All');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals State
  const [payslipModalEmp, setPayslipModalEmp] = useState<Employee | null>(null);
  const [empModalOpen, setEmpModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [empFormError, setEmpFormError] = useState<string | null>(null);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Employee | null>(null);

  // Core Data State (with v3 localStorage keys for individual per-day salary formula)
  const [employees, setEmployees] = useState<Employee[]>(() => {
    try {
      const saved = localStorage.getItem('att_employees_v3');
      return saved ? JSON.parse(saved) : INITIAL_EMPLOYEES;
    } catch {
      return INITIAL_EMPLOYEES;
    }
  });

  const [attendance, setAttendance] = useState<AttendanceRecords>(() => {
    try {
      const saved = localStorage.getItem('att_records_v3');
      if (saved) return JSON.parse(saved);
      return generateInitialDemoAttendance(INITIAL_EMPLOYEES);
    } catch {
      return generateInitialDemoAttendance(INITIAL_EMPLOYEES);
    }
  });

  const [payrollAdjustments, setPayrollAdjustments] = useState<Record<string, PayrollAdjustment>>(() => {
    try {
      const saved = localStorage.getItem('att_payroll_adj_v3');
      if (!saved) return {};
      // Older saves called the advance "customDeduction"
      const parsed: Record<string, PayrollAdjustment & { customDeduction?: number }> =
        JSON.parse(saved);
      return Object.fromEntries(
        Object.entries(parsed).map(([key, { customDeduction, ...adj }]) => [
          key,
          { ...adj, advance: adj.advance ?? customDeduction ?? 0 }
        ])
      );
    } catch {
      return {};
    }
  });

  // Save to localStorage whenever state updates
  useEffect(() => {
    try {
      localStorage.setItem('att_employees_v3', JSON.stringify(employees));
    } catch (e) {
      console.error('Failed saving employees', e);
    }
  }, [employees]);

  useEffect(() => {
    try {
      localStorage.setItem('att_records_v3', JSON.stringify(attendance));
    } catch (e) {
      console.error('Failed saving attendance', e);
    }
  }, [attendance]);

  useEffect(() => {
    try {
      localStorage.setItem('att_payroll_adj_v3', JSON.stringify(payrollAdjustments));
    } catch (e) {
      console.error('Failed saving payroll adjustments', e);
    }
  }, [payrollAdjustments]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3000);
  };

  // Sync selectedYear & selectedMonth when selectedDate changes in Daily View
  const handleDateChange = (newDateStr: string) => {
    // Ignore a cleared date input so selectedDate always stays a valid YYYY-MM-DD
    if (!/^\d{4}-\d{2}-\d{2}$/.test(newDateStr)) return;
    const [y, m] = newDateStr.split('-').map(Number);
    setSelectedDate(newDateStr);
    setSelectedYear(y);
    setSelectedMonth(m - 1);
  };

  const daysInSelectedMonth = useMemo(() => {
    return new Date(selectedYear, selectedMonth + 1, 0).getDate();
  }, [selectedYear, selectedMonth]);

  const monthName = useMemo(() => {
    return new Date(selectedYear, selectedMonth, 1).toLocaleString('default', {
      month: 'long',
      year: 'numeric'
    });
  }, [selectedYear, selectedMonth]);

  // Filtered employees list (by Department and Search)
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const matchesDept = deptFilter === 'All' || emp.department === deptFilter;
      const matchesSearch =
        emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.role.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesDept && matchesSearch;
    });
  }, [employees, deptFilter, searchQuery]);

  // Only absences need marking: a day with no status counts as Present once the date
  // has arrived, while future days stay undefined (upcoming, not paid)
  const today = todayKey();
  const getStatus = (dateKey: string, empId: string): StatusCode | undefined =>
    attendance[dateKey]?.[empId]?.status ?? (dateKey <= today ? 'P' : undefined);

  // --- Attendance Update Handlers ---
  // newStatus undefined clears the stored status back to the default
  const updateAttendanceStatus = (dateKey: string, empId: string, newStatus: StatusCode | undefined) => {
    setAttendance((prev) => {
      const dayRecords = prev[dateKey] || {};
      const existing = dayRecords[empId] || {};
      return {
        ...prev,
        [dateKey]: {
          ...dayRecords,
          [empId]: {
            ...existing,
            status: newStatus
          }
        }
      };
    });
  };

  const updateAttendanceRemarks = (dateKey: string, empId: string, value: string) => {
    setAttendance((prev) => {
      const dayRecords = prev[dateKey] || {};
      const existing = dayRecords[empId] || {};
      return {
        ...prev,
        [dateKey]: {
          ...dayRecords,
          [empId]: {
            ...existing,
            remarks: value
          }
        }
      };
    });
  };

  const handleBulkStatus = (statusKey: StatusCode) => {
    const empMap: Record<string, AttendanceEntry> = {};
    filteredEmployees.forEach((emp) => {
      empMap[emp.id] = {
        status: statusKey,
        remarks: attendance[selectedDate]?.[emp.id]?.remarks || ''
      };
    });

    setAttendance((prev) => ({
      ...prev,
      [selectedDate]: {
        ...(prev[selectedDate] || {}),
        ...empMap
      }
    }));
    showToast(`Marked ${filteredEmployees.length} staff as ${STATUS_CONFIG[statusKey].label}`);
  };

  // Toggle between Present (P) and Absent (A) on Monthly Grid cell click
  const toggleCellStatus = (dayNumber: number, empId: string) => {
    const dateKey = formatDateKey(selectedYear, selectedMonth, dayNumber);
    updateAttendanceStatus(dateKey, empId, getStatus(dateKey, empId) === 'A' ? 'P' : 'A');
  };

  // Direct inline update of an employee's individual Per-Day Salary
  const handlePerDaySalaryChange = (empId: string, newRate: string) => {
    const cleanRate = Math.max(0, Number(newRate) || 0);
    setEmployees((prev) =>
      prev.map((emp) =>
        emp.id === empId
          ? {
              ...emp,
              perDaySalary: cleanRate
            }
          : emp
      )
    );
  };

  // --- Monthly Summary & Individual (No. of Days × Per-Day Salary) Calculation ---
  const monthlyStatsAndPayroll = useMemo(() => {
    const statsByEmp: Record<string, EmployeeMonthStats> = {};
    let totalMonthlyNetPayroll = 0;
    let totalMonthlyGross = 0;

    employees.forEach((emp) => {
      let present = 0;
      let absent = 0;
      let upcoming = 0;

      // Present days (including blank days up to today) are paid; upcoming days are not
      for (let d = 1; d <= daysInSelectedMonth; d++) {
        const dateKey = formatDateKey(selectedYear, selectedMonth, d);
        const st = getStatus(dateKey, emp.id);

        if (st === 'P') present++;
        else if (st === 'A') absent++;
        else upcoming++;
      }

      const adjKey = `${selectedYear}-${selectedMonth}_${emp.id}`;
      const adj = payrollAdjustments[adjKey] || EMPTY_ADJUSTMENT;

      // Each employee has their own individual Per-Day Salary
      const perDaySalary = Number(emp.perDaySalary || 0);
      const extraDays = Number(adj.extraDays || 0);
      const effectiveDays = Math.max(0, present + extraDays);

      // Core Formula: No. of Days × Individual Per-Day Salary
      const earnedBasicSalary = Math.round(effectiveDays * perDaySalary);
      const bonus = Number(adj.bonus || 0);
      // PF is a share of wages, so it is not charged in a month with no payable days
      const pfWaived = effectiveDays === 0 && Number(emp.pfDeduction || 0) > 0;
      const pfDeduction = pfWaived ? 0 : Number(emp.pfDeduction || 0);
      const advance = Number(adj.advance || 0);

      const grossEarned = earnedBasicSalary + bonus;
      const totalDeductions = pfDeduction + advance;
      const rawNet = Math.round(grossEarned - totalDeductions);
      const netPayable = Math.max(0, rawNet);
      // Deductions beyond what was earned; shown so the gap is not silently lost
      const shortfall = Math.max(0, -rawNet);

      totalMonthlyGross += earnedBasicSalary;
      totalMonthlyNetPayroll += netPayable;

      statsByEmp[emp.id] = {
        present,
        absent,
        upcoming,
        extraDays,
        effectiveDays,
        perDaySalary,
        earnedBasicSalary,
        bonus,
        advance,
        pfDeduction,
        pfWaived,
        grossEarned,
        totalDeductions,
        netPayable,
        shortfall
      };
    });

    return { statsByEmp, totalMonthlyNetPayroll, totalMonthlyGross };
  }, [employees, attendance, today, selectedYear, selectedMonth, daysInSelectedMonth, payrollAdjustments]);

  // Daily KPI metrics for the selectedDate
  const dailyKPIs = useMemo(() => {
    let presentCount = 0;
    let absentCount = 0;
    let upcomingCount = 0;

    employees.forEach((emp) => {
      const st = getStatus(selectedDate, emp.id);
      if (st === 'P') presentCount++;
      else if (st === 'A') absentCount++;
      else upcomingCount++;
    });

    const total = employees.length || 1;
    const attendanceRate = Math.round((presentCount / total) * 100);

    return {
      totalStaff: employees.length,
      presentCount,
      absentCount,
      upcomingCount,
      attendanceRate
    };
  }, [employees, attendance, today, selectedDate]);

  // Update Payroll Bonus, Custom Deduction, or Extra Days adjustment
  const handleAdjustmentChange = (empId: string, field: AdjustmentField, value: string) => {
    const numVal = field === 'extraDays' ? Number(value) || 0 : Math.max(0, Number(value) || 0);
    const adjKey = `${selectedYear}-${selectedMonth}_${empId}`;
    setPayrollAdjustments((prev) => ({
      ...prev,
      [adjKey]: {
        ...(prev[adjKey] || EMPTY_ADJUSTMENT),
        [field]: numVal
      }
    }));
  };

  // --- CSV Export Functionality (Only Present & Absent + No. of Days * Per Day Salary) ---
  const exportToCSV = (type: 'attendance' | 'payroll') => {
    let csvContent = '';
    let filename = '';

    if (type === 'attendance') {
      const dayHeaders = Array.from({ length: daysInSelectedMonth }, (_, i) => `Day ${i + 1}`);
      const headers = [
        'Emp ID',
        'Name',
        'Department',
        'Role',
        'Per-Day Salary (INR)',
        ...dayHeaders,
        'Total Present Days (P)',
        'Total Absent Days (A)',
        'Upcoming Days (-)'
      ];
      const rows = employees.map((emp) => {
        const st = monthlyStatsAndPayroll.statsByEmp[emp.id];
        const dailyCols = Array.from({ length: daysInSelectedMonth }, (_, i) => {
          const dKey = formatDateKey(selectedYear, selectedMonth, i + 1);
          return getStatus(dKey, emp.id) ?? '-';
        });
        return [
          emp.id,
          emp.name,
          emp.department,
          emp.role,
          st.perDaySalary,
          ...dailyCols,
          st.present,
          st.absent,
          st.upcoming
        ]
          .map(csvCell)
          .join(',');
      });
      csvContent = [headers.map(csvCell).join(','), ...rows].join('\n');
      filename = `Attendance_${monthName.replace(/\s+/g, '_')}.csv`;
    } else {
      const headers = [
        'Emp ID',
        'Name',
        'Department',
        'Role',
        'Total Days in Month',
        'Present Days',
        'Absent Days',
        'Upcoming Days',
        'Extra/Adj Days',
        'Total Payable Days (No. of Days)',
        'Per-Day Salary (INR)',
        'Formula (No. of Days x Per-Day Salary)',
        'Earned Basic Salary (INR)',
        'Bonus / Allowance (+)',
        'PF / Fixed Deduction (-)',
        'Advance (-)',
        'Net Payable Salary (INR)',
        'Deduction Shortfall (INR)'
      ];
      const rows = employees.map((emp) => {
        const st = monthlyStatsAndPayroll.statsByEmp[emp.id];
        return [
          emp.id,
          emp.name,
          emp.department,
          emp.role,
          daysInSelectedMonth,
          st.present,
          st.absent,
          st.upcoming,
          st.extraDays,
          st.effectiveDays,
          st.perDaySalary,
          `${st.effectiveDays} Days x Rs.${st.perDaySalary}`,
          st.earnedBasicSalary,
          st.bonus,
          st.pfDeduction,
          st.advance,
          st.netPayable,
          st.shortfall
        ]
          .map(csvCell)
          .join(',');
      });
      csvContent = [headers.map(csvCell).join(','), ...rows].join('\n');
      filename = `Salary_Sheet_${monthName.replace(/\s+/g, '_')}.csv`;
    }

    // BOM so Excel reads ₹ and other non-ASCII characters correctly
    const blob = new Blob(['﻿' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast(`Exported ${filename}`);
  };

  // Reset Demo Data
  const handleResetDemoData = () => {
    setEmployees(INITIAL_EMPLOYEES);
    setAttendance(generateInitialDemoAttendance(INITIAL_EMPLOYEES));
    setPayrollAdjustments({});
    setConfirmResetOpen(false);
    showToast('Demo data restored to default settings');
  };

  // Open Add/Edit Modal
  const openEmployeeModal = (emp: Employee | null = null) => {
    setEditingEmployee(emp);
    setEmpFormError(null);
    setEmpModalOpen(true);
  };

  // Add / Edit Employee Submit
  const handleSaveEmployee = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const field = (key: string) => String(formData.get(key) ?? '').trim();
    const perDaySalaryInput = Math.max(0, Number(formData.get('perDaySalary')) || 0);

    const empData: Employee = {
      id: editingEmployee ? editingEmployee.id : field('id').toUpperCase(),
      name: field('name'),
      role: field('role'),
      department: field('department'),
      perDaySalary: perDaySalaryInput,
      pfDeduction: Math.max(0, Number(formData.get('pfDeduction')) || 0),
      joinDate: field('joinDate') || initialDateStr
    };

    if (editingEmployee) {
      setEmployees((prev) => prev.map((item) => (item.id === editingEmployee.id ? empData : item)));
      showToast(`Updated ${empData.name} (₹${perDaySalaryInput}/day)`);
    } else {
      if (employees.some((emp) => emp.id.toUpperCase() === empData.id)) {
        setEmpFormError(`Employee ID ${empData.id} is already in use. Choose a different ID.`);
        return;
      }
      setEmployees((prev) => [...prev, empData]);
      showToast(`Added ${empData.name} (₹${perDaySalaryInput}/day)`);
    }
    // Advance applies to the month currently selected
    handleAdjustmentChange(empData.id, 'advance', field('advance'));
    setEmpModalOpen(false);
    setEditingEmployee(null);
  };

  // Remove the employee along with their attendance and payroll adjustments,
  // so a future employee reusing the ID does not inherit old records
  const handleDeleteEmployee = (emp: Employee) => {
    setEmployees((prev) => prev.filter((e) => e.id !== emp.id));
    setAttendance((prev) => {
      const next: AttendanceRecords = {};
      Object.entries(prev).forEach(([dateKey, day]) => {
        const { [emp.id]: _removed, ...rest } = day;
        next[dateKey] = rest;
      });
      return next;
    });
    setPayrollAdjustments((prev) =>
      Object.fromEntries(Object.entries(prev).filter(([key]) => !key.endsWith(`_${emp.id}`)))
    );
    setDeleteTarget(null);
    showToast(`Removed ${emp.name}`);
  };

  const shiftMonth = (delta: number) => {
    const newDate = new Date(selectedYear, selectedMonth + delta, 1);
    setSelectedYear(newDate.getFullYear());
    setSelectedMonth(newDate.getMonth());
    setSelectedDate(formatDateKey(newDate.getFullYear(), newDate.getMonth(), 1));
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Top Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-lg border border-slate-700 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Top Navigation Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-sm shadow-indigo-200">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg font-bold tracking-tight text-slate-900">
                  {COMPANY_NAME}
                </h1>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                  Housekeeping Staff
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Present/Absent Tracker • Salary = No. of Days Present × Individual Per-Day Salary
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => exportToCSV(activeTab === 'payroll' ? 'payroll' : 'attendance')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 transition shadow-sm"
            >
              <Download className="w-3.5 h-3.5 text-indigo-600" />
              Export {activeTab === 'payroll' ? 'Payroll' : 'Attendance'} CSV
            </button>

            <button
              onClick={() => setConfirmResetOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition"
              title="Reset Demo Data"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset Demo</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* KPI Summary Cards (4 Cards: Total Staff, Present, Absent, Est. Payroll) */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                Total Staff
              </p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {dailyKPIs.totalStaff}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Housekeeping employees
              </p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
              <Users className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                Present ({selectedDate})
              </p>
              <div className="flex items-baseline gap-2 mt-1">
                <p className="text-2xl font-bold text-emerald-600">
                  {dailyKPIs.presentCount}
                </p>
                <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                  {dailyKPIs.attendanceRate}%
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">Marked Present on this date</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                Absent ({selectedDate})
              </p>
              <p className="text-2xl font-bold text-rose-600 mt-1">
                {dailyKPIs.absentCount}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {dailyKPIs.upcomingCount > 0 ? 'Upcoming date' : 'Marked Absent on this date'}
              </p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-indigo-100 shadow-sm flex items-center justify-between bg-gradient-to-br from-indigo-50/50 to-white">
            <div>
              <p className="text-xs font-medium text-indigo-700 uppercase tracking-wider">
                Est. {monthName.split(' ')[0]} Payroll
              </p>
              <p className="text-2xl font-bold text-indigo-950 mt-1">
                {formatCurrency(monthlyStatsAndPayroll.totalMonthlyNetPayroll)}
              </p>
              <p className="text-xs text-indigo-600/80 mt-1">Net payout across all staff types</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-sm">
              <IndianRupee className="w-5 h-5" />
            </div>
          </div>
        </section>

        {/* Navigation Tabs & Global Filters Bar */}
        <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg overflow-x-auto">
            <button
              onClick={() => setActiveTab('daily')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-md text-xs sm:text-sm font-semibold transition whitespace-nowrap ${
                activeTab === 'daily'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              Daily Attendance
            </button>

            <button
              onClick={() => setActiveTab('monthly')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-md text-xs sm:text-sm font-semibold transition whitespace-nowrap ${
                activeTab === 'monthly'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calendar className="w-4 h-4" />
              Monthly Grid & Summary
            </button>

            <button
              onClick={() => setActiveTab('payroll')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-md text-xs sm:text-sm font-semibold transition whitespace-nowrap ${
                activeTab === 'payroll'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <IndianRupee className="w-4 h-4" />
              Salary & Payroll
            </button>

            <button
              onClick={() => setActiveTab('employees')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-md text-xs sm:text-sm font-semibold transition whitespace-nowrap ${
                activeTab === 'employees'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Briefcase className="w-4 h-4" />
              Staff Directory ({employees.length})
            </button>
          </div>

          {/* Search & Department Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 sm:w-48">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search name, ID..."
                className="w-full pl-9 pr-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              />
            </div>

            {/* Department Filter */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="text-xs sm:text-sm font-medium bg-transparent text-slate-700 focus:outline-none"
              >
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>
                    {d === 'All' ? 'All Departments' : d}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* =========================================================
            TAB 1: DAILY ATTENDANCE REGISTER (Present / Absent Only)
           ========================================================= */}
        {activeTab === 'daily' && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Control Subheader */}
            <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4 bg-slate-50/50">
              <div className="flex items-center gap-3 flex-wrap">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Attendance Date:
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => handleDateChange(e.target.value)}
                  className="px-3 py-1.5 text-sm font-semibold bg-white border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <span className="text-xs text-slate-500 font-medium">
                  {parseDateKey(selectedDate).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })}
                </span>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-slate-500 font-medium mr-1">
                  Quick Bulk Action:
                </span>
                <button
                  onClick={() => handleBulkStatus('P')}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition shadow-sm"
                >
                  Mark All Present
                </button>
                <button
                  onClick={() => handleBulkStatus('A')}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 text-white hover:bg-rose-700 transition shadow-sm"
                >
                  Mark All Absent
                </button>
              </div>
            </div>

            {/* Daily Attendance Table (Without Check-In / Check-Out) */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-3">Per-Day Salary</th>
                    <th className="py-3 px-4">Attendance Status</th>
                    <th className="py-3 px-4">Remarks / Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-sm">
                  {filteredEmployees.map((emp) => {
                    const currentStatus = getStatus(selectedDate, emp.id);
                    const currentRemarks = attendance[selectedDate]?.[emp.id]?.remarks || '';

                    return (
                      <tr key={emp.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-900">{emp.name}</div>
                          <div className="text-xs text-slate-500">
                            {emp.id} • {emp.role} ({emp.department})
                          </div>
                        </td>

                        <td className="py-3.5 px-3">
                          <span className="font-bold text-slate-800">
                            {formatCurrency(emp.perDaySalary)}
                          </span>
                          <span className="text-xs text-slate-400"> / day</span>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            {STATUS_CYCLE.map((stKey) => {
                              const cfg = STATUS_CONFIG[stKey];
                              const isSelected = currentStatus === stKey;
                              return (
                                <button
                                  key={stKey}
                                  type="button"
                                  aria-pressed={isSelected}
                                  onClick={() =>
                                    updateAttendanceStatus(selectedDate, emp.id, stKey)
                                  }
                                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition flex items-center gap-1.5 ${
                                    isSelected
                                      ? cfg.activeBg
                                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                                  }`}
                                >
                                  <span
                                    className={`w-2 h-2 rounded-full ${
                                      isSelected ? 'bg-white' : cfg.dot
                                    }`}
                                  />
                                  {cfg.label}
                                </button>
                              );
                            })}
                            {!currentStatus && (
                              <span className="text-[11px] font-medium text-slate-400 italic">
                                Upcoming
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <input
                            type="text"
                            value={currentRemarks}
                            onChange={(e) =>
                              updateAttendanceRemarks(
                                selectedDate,
                                emp.id,
                                e.target.value
                              )
                            }
                            placeholder="Add note or remark..."
                            className="w-full min-w-[200px] px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* =========================================================
            TAB 2: MONTHLY ATTENDANCE MATRIX GRID (Present / Absent Only)
           ========================================================= */}
        {activeTab === 'monthly' && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden space-y-4">
            {/* Month Selector & Legend Bar */}
            <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => shiftMonth(-1)}
                  className="p-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700"
                  title="Previous Month"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-base font-bold text-slate-900 min-w-[150px] text-center">
                  {monthName}
                </span>
                <button
                  onClick={() => shiftMonth(1)}
                  className="p-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700"
                  title="Next Month"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <span className="text-xs text-slate-500 ml-2 hidden sm:inline">
                  💡 Click any day cell to toggle Present (P) ⇄ Absent (A)
                </span>
              </div>

              {/* Status Legend */}
              <div className="flex items-center gap-4 flex-wrap text-xs">
                {STATUS_CYCLE.map((k) => (
                  <div key={k} className="flex items-center gap-1.5">
                    <span className={`w-2.5 h-2.5 rounded-full ${STATUS_CONFIG[k].dot}`} />
                    <span className="font-semibold text-slate-700">
                      {STATUS_CONFIG[k].short}:
                    </span>
                    <span className="text-slate-500">{STATUS_CONFIG[k].label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Interactive Matrix Table */}
            <div className="overflow-x-auto pb-2">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-semibold uppercase text-slate-500">
                    <th className="py-2.5 px-3 sticky left-0 bg-slate-50 z-10 min-w-[185px] border-r border-slate-200">
                      Employee & Category
                    </th>
                    {Array.from({ length: daysInSelectedMonth }, (_, i) => {
                      const d = i + 1;
                      const dayOfWeek = new Date(selectedYear, selectedMonth, d).toLocaleDateString(
                        'en-US',
                        { weekday: 'narrow' }
                      );
                      return (
                        <th
                          key={d}
                          className="py-2 px-1 text-center min-w-[30px] border-r border-slate-100"
                        >
                          <div>{d}</div>
                          <div className="text-[9px] font-normal opacity-75">{dayOfWeek}</div>
                        </th>
                      );
                    })}
                    <th className="py-2 px-3 text-center bg-emerald-50 text-emerald-800 border-l border-slate-200 font-bold">
                      Present (P)
                    </th>
                    <th className="py-2 px-3 text-center bg-rose-50 text-rose-800 font-bold">
                      Absent (A)
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs">
                  {filteredEmployees.map((emp) => {
                    const st = monthlyStatsAndPayroll.statsByEmp[emp.id];
                    return (
                      <tr key={emp.id} className="hover:bg-slate-50/70">
                        <td className="py-2.5 px-3 sticky left-0 bg-white z-10 border-r border-slate-200">
                          <div className="font-semibold text-slate-900 truncate max-w-[170px]">
                            {emp.name}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {emp.role} • {emp.department}
                          </div>
                        </td>

                        {Array.from({ length: daysInSelectedMonth }, (_, i) => {
                          const d = i + 1;
                          const dateKey = formatDateKey(selectedYear, selectedMonth, d);
                          const isFuture = dateKey > today;
                          const code = getStatus(dateKey, emp.id);
                          const cfg = isFuture || !code ? null : STATUS_CONFIG[code];

                          return (
                            <td
                              key={d}
                              onClick={isFuture ? undefined : () => toggleCellStatus(d, emp.id)}
                              className={`p-0.5 border-r border-slate-100 text-center select-none ${
                                isFuture ? 'cursor-not-allowed' : 'cursor-pointer'
                              }`}
                              title={
                                cfg
                                  ? `${emp.name} - ${dateKey}: ${cfg.label} (Click to mark ${cfg.code === 'P' ? 'Absent' : 'Present'})`
                                  : `${dateKey}: Upcoming date`
                              }
                            >
                              <div
                                className={`w-6 h-6 mx-auto rounded flex items-center justify-center text-[10px] font-bold border transition ${cfg ? cfg.cellBg : FUTURE_CELL}`}
                              >
                                {cfg?.short}
                              </div>
                            </td>
                          );
                        })}

                        <td className="py-2 px-3 text-center font-bold text-emerald-700 bg-emerald-50/40 border-l border-slate-200">
                          {st.present}
                        </td>
                        <td className="py-2 px-3 text-center font-bold text-rose-700 bg-rose-50/40">
                          {st.absent}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* =========================================================
            TAB 3: SALARY & DEDUCTION CALCULATOR (No. of Days × Per-Day Salary)
           ========================================================= */}
        {activeTab === 'payroll' && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Payroll Formula & Month Header */}
            <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => shiftMonth(-1)}
                  className="p-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-base font-bold text-slate-900 min-w-[140px] text-center">
                  {monthName}
                </span>
                <button
                  onClick={() => shiftMonth(1)}
                  className="p-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 rounded-lg px-3.5 py-2">
                  <BadgeCheck className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span className="text-xs font-semibold text-indigo-950">
                    Salary Formula:{' '}
                    <span className="font-bold text-indigo-700">
                      (No. of Days Present × Per-Day Salary) + Bonus − Advance − PF
                    </span>
                  </span>
                </div>
              </div>
            </div>

            {/* Individual Per-Day Salary Calculation Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-2 text-center">Present / Absent</th>
                    <th className="py-3 px-2 text-center">Extra Days (±)</th>
                    <th className="py-3 px-3 text-center bg-indigo-50/50 text-indigo-900">
                      No. of Days
                    </th>
                    <th className="py-3 px-3 text-center bg-indigo-50/50 text-indigo-900">
                      Per-Day Salary (₹)
                    </th>
                    <th className="py-3 px-4 bg-emerald-50/50 text-emerald-900">
                      Earned Salary (Days × Rate)
                    </th>
                    <th className="py-3 px-2 text-center">Bonus (+)</th>
                    <th className="py-3 px-2 text-center">Advance (−)</th>
                    <th className="py-3 px-4 text-right">Net Payable</th>
                    <th className="py-3 px-3 text-center">Slip</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-sm">
                  {filteredEmployees.map((emp) => {
                    const st = monthlyStatsAndPayroll.statsByEmp[emp.id];

                    return (
                      <tr key={emp.id} className="hover:bg-slate-50/80 transition">
                        {/* Employee Info */}
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-900">{emp.name}</div>
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            <span className="text-xs text-slate-400">
                              {emp.id} • {emp.role}
                            </span>
                          </div>
                        </td>

                        {/* Present & Absent Count */}
                        <td className="py-3.5 px-2 text-center whitespace-nowrap">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {st.present} P
                          </span>
                          <span className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                            {st.absent} A
                          </span>
                          {st.upcoming > 0 && (
                            <div
                              className="mt-1 text-[10px] font-medium text-slate-400"
                              title="Future days are not paid until the date arrives"
                            >
                              {st.upcoming} upcoming
                            </div>
                          )}
                        </td>

                        {/* Optional Extra / Override Days */}
                        <td className="py-3.5 px-2 text-center">
                          <input
                            type="number"
                            step="1"
                            value={st.extraDays || ''}
                            onChange={(e) =>
                              handleAdjustmentChange(emp.id, 'extraDays', e.target.value)
                            }
                            placeholder="0"
                            title="Add or subtract extra working days if needed"
                            className="w-14 px-1.5 py-1 text-xs text-center font-semibold border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </td>

                        {/* Total Payable No. of Days */}
                        <td className="py-3.5 px-3 text-center bg-indigo-50/20">
                          <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-lg text-xs font-extrabold bg-indigo-100 text-indigo-800">
                            {st.effectiveDays} Days
                          </span>
                        </td>

                        {/* Individual Per-Day Salary (Editable Inline!) */}
                        <td className="py-3.5 px-3 text-center bg-indigo-50/20">
                          <div className="inline-flex items-center border border-indigo-200 rounded-lg bg-white px-2 py-1 shadow-2xs focus-within:ring-2 focus-within:ring-indigo-500">
                            <span className="text-xs font-bold text-slate-400 mr-1">₹</span>
                            <input
                              type="number"
                              min="0"
                              step="10"
                              value={emp.perDaySalary}
                              onChange={(e) =>
                                handlePerDaySalaryChange(emp.id, e.target.value)
                              }
                              className="w-20 text-xs font-bold text-indigo-950 text-right focus:outline-none"
                              title="Edit individual Per-Day Salary for this employee"
                            />
                            <span className="text-[10px] text-slate-400 ml-1">/day</span>
                          </div>
                        </td>

                        {/* Explicit Formula Preview: No. of Days × Per-Day Salary */}
                        <td className="py-3.5 px-4 bg-emerald-50/20">
                          <div className="font-bold text-emerald-800 text-sm">
                            {formatCurrency(st.earnedBasicSalary)}
                          </div>
                          <div className="text-[11px] font-medium text-slate-500">
                            {st.effectiveDays} days × {formatCurrency(st.perDaySalary)}/day
                          </div>
                        </td>

                        {/* Bonus / Incentive (+) */}
                        <td className="py-3.5 px-2 text-center">
                          <input
                            type="number"
                            min="0"
                            step="100"
                            value={st.bonus || ''}
                            onChange={(e) =>
                              handleAdjustmentChange(emp.id, 'bonus', e.target.value)
                            }
                            placeholder="0"
                            className="w-20 px-2 py-1 text-xs text-right font-medium border border-slate-200 rounded-md bg-emerald-50/30 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </td>

                        {/* Advance (-), with the fixed PF noted below */}
                        <td className="py-3.5 px-2 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <input
                              type="number"
                              min="0"
                              step="100"
                              value={st.advance || ''}
                              onChange={(e) =>
                                handleAdjustmentChange(
                                  emp.id,
                                  'advance',
                                  e.target.value
                                )
                              }
                              placeholder="0"
                              title={`Advance paid to ${emp.name} for ${monthName}`}
                              className="w-20 px-2 py-1 text-xs text-right font-medium border border-slate-200 rounded-md bg-rose-50/30 focus:bg-white focus:outline-none focus:ring-1 focus:ring-rose-500"
                            />
                            {st.pfDeduction > 0 && (
                              <span className="text-[10px] text-slate-500">
                                +PF: {formatCurrency(st.pfDeduction)}
                              </span>
                            )}
                            {st.pfWaived && (
                              <span
                                className="text-[10px] text-slate-400"
                                title="No payable days this month, so PF is not charged"
                              >
                                PF waived (0 days)
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Final Net Payable Salary */}
                        <td className="py-3.5 px-4 text-right">
                          <span className="text-base font-extrabold text-slate-900">
                            {formatCurrency(st.netPayable)}
                          </span>
                          {st.shortfall > 0 && (
                            <div
                              className="text-[10px] font-semibold text-rose-600"
                              title="Deductions exceed earnings; this amount was not recovered"
                            >
                              Shortfall {formatCurrency(st.shortfall)}
                            </div>
                          )}
                        </td>

                        {/* Payslip Button */}
                        <td className="py-3.5 px-3 text-center">
                          <button
                            onClick={() => setPayslipModalEmp(emp)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            Slip
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {/* Table Footer Totals */}
                <tfoot>
                  <tr className="bg-slate-100/80 border-t-2 border-slate-200 font-bold text-slate-900 text-xs">
                    <td colSpan={5} className="py-3.5 px-4 text-right uppercase tracking-wider text-slate-600">
                      Total Monthly Payout ({filteredEmployees.length} Staff):
                    </td>
                    <td className="py-3.5 px-4 text-emerald-800 text-sm">
                      {formatCurrency(
                        filteredEmployees.reduce(
                          (acc, e) =>
                            acc +
                            (monthlyStatsAndPayroll.statsByEmp[e.id]?.earnedBasicSalary || 0),
                          0
                        )
                      )}
                    </td>
                    <td colSpan={2} className="py-3.5 px-2 text-right text-slate-500">
                      Net Total:
                    </td>
                    <td className="py-3.5 px-4 text-right text-base font-extrabold text-indigo-950">
                      {formatCurrency(
                        filteredEmployees.reduce(
                          (acc, e) =>
                            acc + (monthlyStatsAndPayroll.statsByEmp[e.id]?.netPayable || 0),
                          0
                        )
                      )}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* =========================================================
            TAB 4: STAFF DIRECTORY (MANAGE DIFFERENT EMPLOYEE TYPES & PER-DAY RATES)
           ========================================================= */}
        {activeTab === 'employees' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Company Staff Directory & Individual Per-Day Rates
                </h2>
                <p className="text-xs text-slate-500">
                  Every employee has their own individual Per-Day Salary rate used to calculate monthly earnings (No. of Days × Per-Day Salary)
                </p>
              </div>
              <button
                onClick={() => openEmployeeModal(null)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Add Employee
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredEmployees.map((emp) => {
                const st = monthlyStatsAndPayroll.statsByEmp[emp.id];

                return (
                  <div
                    key={emp.id}
                    className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                              {emp.id}
                            </span>
                          </div>
                          <h3 className="text-base font-bold text-slate-900 mt-2">
                            {emp.name}
                          </h3>
                          <p className="text-xs text-slate-500 font-medium">
                            {emp.role} • {emp.department}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openEmployeeModal(emp)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100"
                            title="Edit Employee"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(emp)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                            title="Remove Employee"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2.5 text-xs">
                        <div className="bg-indigo-50/60 p-2 rounded-lg border border-indigo-100">
                          <span className="text-indigo-600 font-medium block text-[11px]">
                            Individual Per-Day Salary
                          </span>
                          <span className="font-extrabold text-indigo-950 text-sm">
                            {formatCurrency(emp.perDaySalary)} / day
                          </span>
                        </div>
                        <div className="bg-emerald-50/60 p-2 rounded-lg border border-emerald-100">
                          <span className="text-emerald-700 font-medium block text-[11px]">
                            {monthName.split(' ')[0]} Earned ({st.effectiveDays}d)
                          </span>
                          <span className="font-extrabold text-emerald-900 text-sm">
                            {formatCurrency(st.earnedBasicSalary)}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Standard PF/ESI</span>
                          <span className="font-semibold text-slate-700">
                            {formatCurrency(emp.pfDeduction)}/mo
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Joined On</span>
                          <span className="font-semibold text-slate-700">{emp.joinDate}</span>
                        </div>
                        <label className="col-span-2 flex items-center justify-between gap-2 bg-rose-50/60 p-2 rounded-lg border border-rose-100">
                          <span className="text-rose-700 font-medium text-[11px]">
                            Advance for {monthName}
                          </span>
                          <span className="inline-flex items-center border border-rose-200 rounded-md bg-white px-2 py-1 focus-within:ring-2 focus-within:ring-rose-400">
                            <span className="text-xs font-bold text-slate-400 mr-1">₹</span>
                            <input
                              type="number"
                              min="0"
                              step="100"
                              value={st.advance || ''}
                              onChange={(e) =>
                                handleAdjustmentChange(emp.id, 'advance', e.target.value)
                              }
                              placeholder="0"
                              className="w-20 text-xs font-bold text-rose-900 text-right focus:outline-none"
                            />
                          </span>
                        </label>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* =========================================================
          MODAL 1: PRINTABLE SALARY SLIP (No. of Days × Individual Per-Day Salary)
         ========================================================= */}
      {payslipModalEmp && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div
            id="payslip"
            className="bg-white rounded-2xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden my-8"
          >
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between print:bg-white print:text-slate-900 print:border-b print:border-slate-300">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-indigo-300 print:text-slate-600">
                  {COMPANY_NAME}
                </p>
                <h3 className="text-base font-bold">Monthly Salary & Attendance Slip</h3>
                <p className="text-xs text-slate-400">Pay Period: {monthName}</p>
              </div>
              <div className="flex items-center gap-2 print:hidden">
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-500 transition"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print Slip
                </button>
                <button
                  onClick={() => setPayslipModalEmp(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {(() => {
              const st = monthlyStatsAndPayroll.statsByEmp[payslipModalEmp.id];

              return (
                <div className="p-6 space-y-5 text-sm">
                  <div className="flex justify-between items-start border-b border-slate-200 pb-4">
                    <div>
                      <h4 className="font-bold text-slate-900 text-base">
                        {payslipModalEmp.name}
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {payslipModalEmp.role} ({payslipModalEmp.department})
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Employee ID: <span className="font-semibold">{payslipModalEmp.id}</span>
                      </p>
                    </div>
                    <div className="text-right text-xs">
                      <div className="font-bold text-indigo-700 text-sm">
                        Per-Day Rate: {formatCurrency(st.perDaySalary)}/day
                      </div>
                      <div className="text-slate-500 mt-0.5">
                        Payable Days: <span className="font-bold text-slate-800">{st.effectiveDays} Days</span>
                      </div>
                    </div>
                  </div>

                  {/* Attendance Summary Pills (Present & Absent Only) */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                    <div>
                      <span className="text-slate-400 block">Month Days</span>
                      <span className="font-bold text-slate-800 text-sm">
                        {daysInSelectedMonth}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Present (P)</span>
                      <span className="font-bold text-emerald-700 text-sm">{st.present}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Absent (A)</span>
                      <span className="font-bold text-rose-600 text-sm">{st.absent}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Payable Days</span>
                      <span className="font-extrabold text-indigo-700 text-sm">
                        {st.effectiveDays}
                      </span>
                    </div>
                  </div>

                  {/* Highlighted Formula Calculation Box */}
                  <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3.5 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 block">
                        Basic Salary Calculation (No. of Days × Per-Day Salary)
                      </span>
                      <span className="text-sm font-bold text-slate-900 mt-0.5 block">
                        {st.effectiveDays} Days × {formatCurrency(st.perDaySalary)} / day
                      </span>
                    </div>
                    <div className="text-lg font-extrabold text-emerald-800">
                      {formatCurrency(st.earnedBasicSalary)}
                    </div>
                  </div>

                  {/* Earnings & Deductions Columns */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="border border-slate-200 rounded-xl p-3.5 space-y-2">
                      <div className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-1.5">
                        Earnings
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-600">
                          Earned Basic ({st.effectiveDays}d × {formatCurrency(st.perDaySalary)})
                        </span>
                        <span className="font-semibold text-slate-900">
                          {formatCurrency(st.earnedBasicSalary)}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-600">Bonus / Incentive</span>
                        <span className="font-semibold text-emerald-600">
                          +{formatCurrency(st.bonus)}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs pt-2 border-t border-slate-100 font-bold">
                        <span>Total Gross Earnings</span>
                        <span>{formatCurrency(st.grossEarned)}</span>
                      </div>
                    </div>

                    <div className="border border-slate-200 rounded-xl p-3.5 space-y-2">
                      <div className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-1.5">
                        Deductions
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-600">
                          PF / Statutory{st.pfWaived ? ' (waived, 0 days)' : ''}
                        </span>
                        <span className="font-semibold text-slate-800">
                          -{formatCurrency(st.pfDeduction)}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-600">Salary Advance</span>
                        <span className="font-semibold text-slate-800">
                          -{formatCurrency(st.advance)}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs pt-2 border-t border-slate-100 font-bold text-rose-700">
                        <span>Total Deductions</span>
                        <span>-{formatCurrency(st.totalDeductions)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Net Payable Banner */}
                  <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 block">
                        Final Net Payable Salary
                      </span>
                      <span className="text-xs text-indigo-700">
                        ({st.effectiveDays} Days × {formatCurrency(st.perDaySalary)}) + Bonus − Deductions
                      </span>
                    </div>
                    <div className="text-2xl font-extrabold text-indigo-950">
                      {formatCurrency(st.netPayable)}
                    </div>
                  </div>

                  {st.shortfall > 0 && (
                    <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-800">
                      Deductions exceed earnings by{' '}
                      <span className="font-bold">{formatCurrency(st.shortfall)}</span>. This amount
                      was not recovered this month.
                    </div>
                  )}

                  {st.upcoming > 0 && (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-600">
                      {st.upcoming} upcoming day{st.upcoming === 1 ? ' is' : 's are'} not yet
                      included in payable days.
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* =========================================================
          MODAL 2: ADD / EDIT EMPLOYEE (With Individual Per-Day Salary)
         ========================================================= */}
      {empModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">
                {editingEmployee ? 'Edit Employee & Per-Day Salary' : 'Add New Staff Member'}
              </h3>
              <button
                onClick={() => setEmpModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEmployee} className="p-5 space-y-3.5 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Employee ID
                  </label>
                  <input
                    name="id"
                    required
                    defaultValue={editingEmployee?.id || nextEmployeeId(employees)}
                    readOnly={Boolean(editingEmployee)}
                    onChange={() => setEmpFormError(null)}
                    className={`w-full px-3 py-2 border rounded-lg text-sm ${
                      editingEmployee ? 'bg-slate-50 border-slate-300' : 'bg-white'
                    } ${empFormError ? 'border-rose-400' : 'border-slate-300'}`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Department
                  </label>
                  <select
                    name="department"
                    defaultValue={editingEmployee?.department || 'Operations'}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                  >
                    {DEPARTMENTS.filter((d) => d !== 'All').map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Full Name
                </label>
                <input
                  name="name"
                  required
                  defaultValue={editingEmployee?.name || ''}
                  placeholder="e.g., Arjun Mehta"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Designation / Role
                </label>
                <input
                  name="role"
                  required
                  defaultValue={editingEmployee?.role || ''}
                  placeholder="e.g., Floor Supervisor"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-indigo-700 mb-1">
                    Per-Day Salary Rate (₹/Day) *
                  </label>
                  <input
                    name="perDaySalary"
                    type="number"
                    min="0"
                    required
                    defaultValue={editingEmployee?.perDaySalary ?? 600}
                    placeholder="e.g., 650"
                    className="w-full px-3 py-2 border border-indigo-300 rounded-lg text-sm font-bold text-indigo-950 bg-indigo-50/40"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Monthly PF / ESI Deduction (₹)
                  </label>
                  <input
                    name="pfDeduction"
                    type="number"
                    min="0"
                    defaultValue={editingEmployee?.pfDeduction ?? 0}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-rose-700 mb-1">
                    Advance for {monthName} (₹)
                  </label>
                  <input
                    name="advance"
                    type="number"
                    min="0"
                    defaultValue={
                      editingEmployee
                        ? monthlyStatsAndPayroll.statsByEmp[editingEmployee.id]?.advance || 0
                        : 0
                    }
                    className="w-full px-3 py-2 border border-rose-200 rounded-lg text-sm bg-rose-50/40"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Joining Date
                  </label>
                  <input
                    name="joinDate"
                    type="date"
                    defaultValue={editingEmployee?.joinDate || initialDateStr}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
              </div>

              {empFormError && (
                <p className="text-xs font-medium text-rose-600 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {empFormError}
                </p>
              )}

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEmpModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm"
                >
                  {editingEmployee ? 'Save Changes' : 'Add Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================
          MODAL 3: CONFIRM RESET DEMO DATA
         ========================================================= */}
      {confirmResetOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 border border-slate-200 shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Reset Demo Data?
                </h3>
                <p className="text-xs text-slate-500">
                  This will restore the default employees across all categories and regenerate Present/Absent sample attendance.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setConfirmResetOpen(false)}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={handleResetDemoData}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 text-white hover:bg-rose-700"
              >
                Yes, Reset Data
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          MODAL 4: CONFIRM REMOVE EMPLOYEE
         ========================================================= */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 border border-slate-200 shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Remove {deleteTarget.name}?
                </h3>
                <p className="text-xs text-slate-500">
                  This deletes {deleteTarget.id} along with all of their attendance and payroll
                  adjustments. This cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteEmployee(deleteTarget)}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 text-white hover:bg-rose-700"
              >
                Yes, Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}