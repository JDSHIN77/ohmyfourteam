/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Calendar, BarChart2, Users, ChevronLeft, ChevronRight, Search, Plus, User, Pencil, Trash2, FileText, X, Wifi, WifiOff, Menu, MapPin, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from './firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc, query, orderBy, getDocFromServer } from 'firebase/firestore';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: any;
}

const handleFirestoreError = (error: unknown, operationType: OperationType, path: string | null) => {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: null, // Simplified for now
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
};

const holidays: Record<string, string> = {
  // 2026 Holidays
  '2026-01-01': '신정',
  '2026-02-16': '설날 연휴',
  '2026-02-17': '설날',
  '2026-02-18': '설날 연휴',
  '2026-03-01': '삼일절',
  '2026-03-02': '대체공휴일',
  '2026-05-05': '어린이날',
  '2026-05-24': '부처님오신날',
  '2026-05-25': '대체공휴일',
  '2026-06-03': '지방선거',
  '2026-06-06': '현충일',
  '2026-08-15': '광복절',
  '2026-08-17': '대체공휴일',
  '2026-09-24': '추석 연휴',
  '2026-09-25': '추석',
  '2026-09-26': '추석 연휴',
  '2026-10-03': '개천절',
  '2026-10-05': '대체공휴일',
  '2026-10-09': '한글날',
  '2026-12-25': '기독탄신일',
  
  // 2027 Holidays
  '2027-01-01': '신정',
  '2027-02-06': '설날 연휴',
  '2027-02-07': '설날',
  '2027-02-08': '설날 연휴',
  '2027-02-09': '대체공휴일',
  '2027-03-01': '삼일절',
  '2027-03-03': '대통령선거',
  '2027-05-05': '어린이날',
  '2027-05-13': '부처님오신날',
  '2027-06-06': '현충일',
  '2027-08-15': '광복절',
  '2027-08-16': '대체공휴일',
  '2027-09-14': '추석 연휴',
  '2027-09-15': '추석',
  '2027-09-16': '추석 연휴',
  '2027-10-03': '개천절',
  '2027-10-04': '대체공휴일',
  '2027-10-09': '한글날',
  '2027-10-11': '대체공휴일',
  '2027-12-25': '기독탄신일',
  '2027-12-27': '대체공휴일',
};

export default function App() {
  const [activeTab, setActiveTab] = useState('schedule'); // 'schedule' | 'personnel' | 'statistics'
  const [isConnected, setIsConnected] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Current Date State
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Schedule State: { [personId]: { [dateString]: { work, status, time } } }
  const [schedules, setSchedules] = useState<Record<number, Record<string, { work: string, status: string, time: string }>>>({});
  
  const [personnelList, setPersonnelList] = useState<{ id: number, branch: string, name: string }[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [newBranch, setNewBranch] = useState('');
  const [newName, setNewName] = useState('');

  // Sync with Firestore
  useEffect(() => {
    const testConnection = async () => {
      try {
        // Use a simple getDoc to check connection
        await getDocFromServer(doc(db, 'test', 'connection'));
        setIsConnected(true);
      } catch (error: any) {
        console.error('Connection test failed:', error);
        // If it's a permission error, we are still "connected" to the service
        if (error.code === 'permission-denied') {
          setIsConnected(true);
        } else {
          setIsConnected(false);
        }
      }
    };
    testConnection();
    const interval = setInterval(testConnection, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const unsubPersonnel = onSnapshot(collection(db, 'personnel'), (snapshot) => {
      const list: any[] = [];
      snapshot.forEach(doc => list.push(doc.data()));
      if (list.length > 0) {
        setPersonnelList(list.sort((a, b) => a.id - b.id));
      } else {
        // Initial data if empty
        const initialPersonnel = [
          { id: 1, branch: '울산', name: '송명호' },
          { id: 2, branch: '동성로/율하', name: '이준창' },
          { id: 3, branch: '동래/오투', name: '정형진' },
          { id: 4, branch: '상인/광장', name: '김락영' },
          { id: 5, branch: '성서/구미공단', name: '김충경' },
        ];
        initialPersonnel.forEach(p => {
          setDoc(doc(db, 'personnel', p.id.toString()), p);
        });
      }
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'personnel'));

    const unsubSchedules = onSnapshot(collection(db, 'schedules'), (snapshot) => {
      const data: any = {};
      snapshot.forEach(doc => {
        const docData = doc.data();
        data[docData.personId] = docData.data;
      });
      setSchedules(data);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'schedules'));

    const unsubPosts = onSnapshot(query(collection(db, 'posts'), orderBy('createdAt', 'desc')), (snapshot) => {
      const list: any[] = [];
      snapshot.forEach(doc => list.push(doc.data()));
      setPosts(list);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'posts'));

    return () => {
      unsubPersonnel();
      unsubSchedules();
      unsubPosts();
    };
  }, []);

  // Modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState<{ id: number, branch: string, name: string } | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingPersonId, setDeletingPersonId] = useState<number | null>(null);

  // Board State
  const [posts, setPosts] = useState<{
    id: number;
    managerName: string;
    date: string;
    scheduledWorkplace: string;
    changedWorkplace: string;
    supportTime: string;
    notes: string;
    createdAt: string;
  }[]>([]);
  const [isWriteModalOpen, setIsWriteModalOpen] = useState(false);
  const [newPost, setNewPost] = useState({
    managerName: '',
    date: '',
    scheduledWorkplace: '',
    changedWorkplace: '',
    supportTime: '',
    notes: ''
  });

  const workOptions = ['근무', '오픈', '마감', '미들', '오_미단독', '마_미단독', '교육', '출장'];
  const statusOptions = ['상태', '겸직', '주휴', '휴무', '대휴', '연차', '휴가', '경조', '반차', '반반차'];

  // Generate dates for current month
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  const today = new Date();
  const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  
  const currentMonthDates = Array.from({ length: daysInMonth }, (_, i) => {
    const d = new Date(year, month, i + 1);
    const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`;
    const weekdayIdx = d.getDay();
    const holidayName = holidays[dateString] || '';
    const isRed = weekdayIdx === 0 || !!holidayName;
    const isBlue = weekdayIdx === 6 && !isRed;
    const isToday = dateString === todayString;
    
    return {
      day: i + 1,
      weekday: ['일', '월', '화', '수', '목', '금', '토'][weekdayIdx],
      dateString,
      holiday: holidayName,
      isRed,
      isBlue,
      isToday
    };
  });

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const updateSchedule = async (personId: number, dateString: string, field: 'work' | 'status' | 'time', value: string) => {
    const personSchedule = schedules[personId] || {};
    const daySchedule = personSchedule[dateString] || { work: '', status: '', time: '' };
    const newData = {
      ...personSchedule,
      [dateString]: { ...daySchedule, [field]: value }
    };
    
    try {
      await setDoc(doc(db, 'schedules', personId.toString()), { personId, data: newData });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `schedules/${personId}`);
    }
  };

  const handleWorkChange = (personId: number, dateString: string, newValue: string) => {
    updateSchedule(personId, dateString, 'work', newValue);
  };

  const handleStatusChange = (personId: number, dateString: string, newValue: string) => {
    updateSchedule(personId, dateString, 'status', newValue);
  };

  const handleTimeChange = (personId: number, dateString: string, value: string) => {
    const digitsOnly = value.replace(/\D/g, '');
    let formattedTime = digitsOnly;
    if (digitsOnly.length > 2) {
      formattedTime = `${digitsOnly.slice(0, 2)}:${digitsOnly.slice(2, 4)}`;
    }
    if (formattedTime.length > 5) {
      formattedTime = formattedTime.slice(0, 5);
    }
    updateSchedule(personId, dateString, 'time', formattedTime);
  };

  const handleAddPersonnel = async () => {
    if (!newBranch.trim() || !newName.trim()) return;
    const newId = personnelList.length > 0 ? Math.max(...personnelList.map(p => p.id)) + 1 : 1;
    const newPerson = { id: newId, branch: newBranch, name: newName };
    
    try {
      await setDoc(doc(db, 'personnel', newId.toString()), newPerson);
      setNewBranch('');
      setNewName('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `personnel/${newId}`);
    }
  };

  const openDeleteModal = (id: number) => {
    setDeletingPersonId(id);
    setIsDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setDeletingPersonId(null);
  };

  const confirmDeletePersonnel = async () => {
    if (deletingPersonId === null) return;
    try {
      await deleteDoc(doc(db, 'personnel', deletingPersonId.toString()));
      await deleteDoc(doc(db, 'schedules', deletingPersonId.toString()));
      closeDeleteModal();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `personnel/${deletingPersonId}`);
    }
  };

  const openEditModal = (person: { id: number, branch: string, name: string }) => {
    setEditingPerson({ ...person });
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setEditingPerson(null);
  };

  const confirmEditPersonnel = async () => {
    if (!editingPerson || !editingPerson.branch.trim() || !editingPerson.name.trim()) return;
    try {
      await setDoc(doc(db, 'personnel', editingPerson.id.toString()), editingPerson);
      closeEditModal();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `personnel/${editingPerson.id}`);
    }
  };

  const handleAddPost = async () => {
    if (!newPost.managerName.trim() || !newPost.date.trim()) return;
    const newId = posts.length > 0 ? Math.max(...posts.map(p => p.id)) + 1 : 1;
    const postToAdd = { ...newPost, id: newId, createdAt: new Date().toISOString() };
    
    try {
      await setDoc(doc(db, 'posts', newId.toString()), postToAdd);
      setNewPost({
        managerName: '',
        date: '',
        scheduledWorkplace: '',
        changedWorkplace: '',
        supportTime: '',
        notes: ''
      });
      setIsWriteModalOpen(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `posts/${newId}`);
    }
  };

  const deletePost = async (id: number) => {
    try {
      await deleteDoc(doc(db, 'posts', id.toString()));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `posts/${id}`);
    }
  };

  const statsData = personnelList.map(person => {
    let openCount = 0;
    let closeCount = 0;
    let concurrentCount = 0;
    let workDays = 0;

    const personSchedule = schedules[person.id] || {};

    currentMonthDates.forEach(date => {
      const day = personSchedule[date.dateString] || { work: '', status: '', time: '' };
      
      // Check if it's a work day
      // 1. Must have a work type assigned (and not just the default '근무' if it's considered "not entered")
      // 2. Must NOT have a full-day off status
      
      const isOffStatus = ['주휴', '휴무', '대휴', '연차', '휴가', '경조'].includes(day.status);
      const hasWorkType = day.work && day.work !== '' && day.work !== '근무';
      const isGeneralWork = day.work === '근무';
      const hasPartialOff = ['반차', '반반차'].includes(day.status);
      const hasTime = day.time && day.time.trim() !== '';
      
      if (day.work === '오픈' || day.work === '오_미단독') openCount++;
      if (day.work === '마감' || day.work === '마_미단독') closeCount++;
      if (day.status === '겸직') concurrentCount++;
      
      // A day is counted as a work day if:
      // - It has a specific work type (오픈, 마감, 미들, 교육, 출장)
      // - OR it has '근무' AND (it has time entered OR it's a concurrent/partial duty)
      // - OR it has a partial off status (반차, 반반차)
      const isActuallyWorking = hasWorkType || (isGeneralWork && (hasTime || day.status === '겸직')) || hasPartialOff;
      
      if (isActuallyWorking && !isOffStatus) {
        workDays++;
      }
    });

    const openRatio = workDays > 0 ? Math.round((openCount / workDays) * 100) : 0;
    const closeRatio = workDays > 0 ? Math.round((closeCount / workDays) * 100) : 0;

    return {
      ...person,
      openCount,
      closeCount,
      openCloseTotal: openCount + closeCount,
      concurrentCount,
      workDays,
      openRatio,
      closeRatio
    };
  });

  const filteredPersonnelList = personnelList.filter(person => 
    person.branch.toLowerCase().includes(searchTerm.toLowerCase()) || 
    person.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredPosts = posts.filter(post => {
    if (!post.date) return false;
    const [postYear, postMonth] = post.date.split('-');
    const matchesMonth = parseInt(postYear) === year && parseInt(postMonth) === month + 1;
    const matchesSearch = post.managerName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         post.scheduledWorkplace.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         post.changedWorkplace.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         post.notes.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesMonth && matchesSearch;
  });

  return (
    <div className="flex h-screen bg-[#f8f9fa] font-sans text-gray-800 overflow-hidden relative">
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 flex flex-col flex-shrink-0 transition-transform duration-300 ease-in-out
        lg:relative lg:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="h-16 flex items-center px-6 border-b border-gray-200 justify-between">
          <div className="flex items-center">
            <Calendar className="w-6 h-6 mr-2 text-gray-800" />
            <h1 className="text-lg font-bold tracking-tight">최강 지역4팀</h1>
          </div>
          <div className="flex items-center space-x-2">
            <div className="flex items-center" title={isConnected ? '동기화됨' : '연결 끊김'}>
              {isConnected ? (
                <Wifi className="w-4 h-4 text-green-500" />
              ) : (
                <WifiOff className="w-4 h-4 text-red-500" />
              )}
            </div>
            <button onClick={() => setIsMobileMenuOpen(false)} className="lg:hidden p-1 hover:bg-gray-100 rounded-lg">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>
        <nav className="flex-1 py-6">
          <ul className="space-y-2">
            <li>
              <motion.button 
                whileHover={{ x: 4 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => { setActiveTab('schedule'); setIsMobileMenuOpen(false); }}
                className={`w-full flex items-center px-6 py-3 rounded-r-xl mx-2 transition-colors ${activeTab === 'schedule' ? 'bg-black text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
              >
                <Calendar className="w-5 h-5 mr-3" />
                <span className="font-medium">근무 스케줄</span>
              </motion.button>
            </li>
            <li>
              <motion.button 
                whileHover={{ x: 4 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => { setActiveTab('statistics'); setIsMobileMenuOpen(false); }}
                className={`w-full flex items-center px-6 py-3 rounded-r-xl mx-2 transition-colors ${activeTab === 'statistics' ? 'bg-black text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
              >
                <BarChart2 className="w-5 h-5 mr-3" />
                <span className="font-medium">통계 분석</span>
              </motion.button>
            </li>
            <li>
              <motion.button 
                whileHover={{ x: 4 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => { setActiveTab('board'); setIsMobileMenuOpen(false); }}
                className={`w-full flex items-center px-6 py-3 rounded-r-xl mx-2 transition-colors ${activeTab === 'board' ? 'bg-black text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
              >
                <FileText className="w-5 h-5 mr-3" />
                <span className="font-medium">근무지원</span>
              </motion.button>
            </li>
          </ul>
          
          <div className="mt-10 px-8 mb-3">
            <span className="text-[11px] font-bold text-gray-400 tracking-widest uppercase">Management</span>
          </div>
          <ul className="space-y-2">
            <li>
              <motion.button 
                whileHover={{ x: 4 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => { setActiveTab('personnel'); setIsMobileMenuOpen(false); }}
                className={`w-full flex items-center px-6 py-3 rounded-r-xl mx-2 transition-colors ${activeTab === 'personnel' ? 'bg-black text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
              >
                <Users className="w-5 h-5 mr-3" />
                <span className="font-medium">인원 관리</span>
              </motion.button>
            </li>
          </ul>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden w-full">
        {/* Header */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-8 flex-shrink-0">
          <div className="flex items-center space-x-3 sm:space-x-6">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Menu className="w-6 h-6 text-gray-600" />
            </button>
            <div className="flex items-center border border-gray-200 rounded-lg px-2 py-1.5 bg-white shadow-sm">
              <button onClick={handlePrevMonth} className="p-1 hover:bg-gray-100 rounded text-gray-500 transition-colors"><ChevronLeft className="w-4 h-4" /></button>
              <span className="px-2 sm:px-4 font-bold text-xs sm:text-sm whitespace-nowrap">{year}년 {month + 1}월</span>
              <button onClick={handleNextMonth} className="p-1 hover:bg-gray-100 rounded text-gray-500 transition-colors"><ChevronRight className="w-4 h-4" /></button>
            </div>
            <div className="relative hidden md:block">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input 
                type="text" 
                placeholder="지점 또는 이름 검색..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 w-48 lg:w-72 text-sm transition-all"
              />
            </div>
          </div>
          <div className="flex items-center space-x-2 md:hidden">
            <AnimatePresence>
              {isSearchOpen && (
                <motion.div 
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: '160px', opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  className="relative overflow-hidden"
                >
                  <input 
                    type="text" 
                    placeholder="검색..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    autoFocus
                    className="w-full pl-3 pr-3 py-1.5 border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                  />
                </motion.div>
              )}
            </AnimatePresence>
            <button 
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className={`p-2 hover:bg-gray-100 rounded-lg transition-colors ${isSearchOpen ? 'bg-gray-100 text-blue-600' : 'text-gray-500'}`}
            >
              <Search className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Content Body */}
        <div className="flex-1 overflow-auto p-4 sm:p-8">
          <div className="max-w-[1400px] mx-auto h-full">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="h-full"
              >
                {activeTab === 'schedule' ? (
              <>
                <div className="flex justify-between items-end mb-6">
                  <div>
                    <h2 className="text-2xl font-bold mb-1 tracking-tight">점장 근무 스케줄</h2>
                    <p className="text-gray-500 text-sm">최강 지역4팀 점장님들의 주간 근무 현황입니다.</p>
                  </div>
                </div>

                {/* Table Container */}
                <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                  <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-220px)]">
                    <table className="w-full min-w-[1000px] border-collapse">
                      <thead>
                        <tr>
                          <th className="sticky top-0 left-0 z-30 w-24 py-2 px-2 border-b-2 border-r border-gray-400/40 bg-gray-50 text-xs font-medium text-gray-500 align-middle shadow-[1px_1px_0_0_rgba(0,0,0,0.1)]">
                            지점 / 이름
                          </th>
                          {currentMonthDates.map((date, idx) => (
                            <th key={idx} className={`sticky top-0 z-20 min-w-[80px] py-1.5 px-1 border-b-2 border-gray-400/40 text-center align-middle last:border-r-0 ${date.isToday ? 'border-t-2 border-x-2 border-red-500 border-b-gray-400/40' : `border-r ${date.weekday === '수' ? 'border-r-2 border-r-gray-400/30' : 'border-r-gray-200/50'}`} ${date.isRed ? 'bg-red-50' : date.isBlue ? 'bg-blue-50' : 'bg-white'} shadow-[0_1px_0_0_rgba(0,0,0,0.1)]`}>
                              <div className="flex flex-col items-center justify-center h-full">
                                <div className={`text-[13px] font-bold ${date.isRed ? 'text-red-600' : date.isBlue ? 'text-blue-600' : 'text-gray-800'}`}>
                                  {date.day}일({date.weekday})
                                </div>
                                {date.holiday && (
                                  <div className="text-[10px] text-red-600 mt-0.5 font-bold leading-none">{date.holiday}</div>
                                )}
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredPersonnelList.map((person, personIdx) => {
                          const personSchedule = schedules[person.id] || {};
                          const isLastRow = personIdx === filteredPersonnelList.length - 1;
                          return (
                          <tr key={person.id} className="border-b border-gray-200/50 last:border-b-0 hover:bg-gray-50/50 transition-colors">
                            <td className="sticky left-0 z-10 py-1.5 px-2 border-r border-gray-200/50 text-center align-middle bg-white whitespace-nowrap shadow-[1px_0_0_0_rgba(0,0,0,0.1)]">
                              <div className="font-bold text-gray-800 text-[13px] leading-tight">{person.branch}</div>
                              <div className="text-[12px] text-gray-500 leading-tight">{person.name}</div>
                            </td>
                            {currentMonthDates.map((date, dayIdx) => {
                              const dayData = personSchedule[date.dateString] || { work: '', status: '', time: '' };
                              const isFullCoverStatus = dayData.status && dayData.status !== '상태' && dayData.status !== '겸직' && dayData.status !== '반차' && dayData.status !== '반반차';
                              
                              const getStatusColor = (status: string) => {
                                switch (status) {
                                  case '주휴': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
                                  case '휴무': return 'bg-red-100 text-red-800 border-red-200';
                                  case '대휴': return 'bg-purple-100 text-purple-800 border-purple-200';
                                  case '연차': return 'bg-orange-100 text-orange-800 border-orange-200';
                                  case '휴가': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
                                  case '경조': return 'bg-pink-100 text-pink-800 border-pink-200';
                                  case '겸직':
                                  case '반차':
                                  case '반반차': return 'bg-blue-50 text-blue-700 border-blue-100';
                                  default: return 'bg-transparent border-gray-200/60';
                                }
                              };

                              const statusColorClass = getStatusColor(dayData.status);
                              
                              return (
                              <td key={dayIdx} className={`p-1 last:border-r-0 align-top ${date.isToday ? `border-x-2 border-red-500 ${isLastRow ? 'border-b-2' : ''}` : `border-r ${date.weekday === '수' ? 'border-r-2 border-r-gray-400/30' : 'border-r-gray-200/50'}`} ${date.isRed ? 'bg-red-50' : date.isBlue ? 'bg-blue-50' : 'bg-white'}`}>
                                {isFullCoverStatus ? (
                                  <div className={`h-[56px] border rounded text-center font-bold overflow-hidden flex items-center justify-center ${statusColorClass} ${dayData.status.length > 4 ? 'text-[11px]' : 'text-[13px]'}`}>
                                    <select 
                                      value={dayData.status} 
                                      onChange={(e) => handleStatusChange(person.id, date.dateString, e.target.value)}
                                      className="w-full h-full bg-transparent text-center font-bold outline-none cursor-pointer appearance-none px-0"
                                      style={{ textAlignLast: 'center' }}
                                    >
                                      {statusOptions.map(opt => (
                                        <option key={opt} value={opt} className="text-gray-800 font-bold">{opt}</option>
                                      ))}
                                    </select>
                                  </div>
                                ) : (
                                  <div className="flex flex-col gap-1">
                                    <div className={`h-[26px] border rounded text-center font-bold text-[13px] overflow-hidden ${dayData.time ? 'bg-white/80 border-gray-300 text-gray-800' : 'bg-white/40 border-gray-200 text-gray-300'}`}>
                                      <input
                                        type="text"
                                        value={dayData.time}
                                        placeholder="00:00"
                                        onChange={(e) => handleTimeChange(person.id, date.dateString, e.target.value)}
                                        className="w-full h-full text-center bg-transparent outline-none focus:bg-blue-50/50 focus:text-blue-700 transition-colors placeholder:text-gray-300"
                                      />
                                    </div>
                                    <div className="h-[26px] flex text-center items-center bg-white/60 rounded border border-gray-200/60 overflow-hidden">
                                      <div className={`w-1/2 h-full border-r border-gray-200/60 transition-colors ${dayData.work === '오픈' ? 'bg-green-100/70' : dayData.work === '마감' ? 'bg-red-100/70' : ''}`}>
                                        <select 
                                          value={dayData.work || '근무'} 
                                          onChange={(e) => handleWorkChange(person.id, date.dateString, e.target.value)}
                                          className={`w-full h-full bg-transparent text-center font-bold outline-none cursor-pointer hover:bg-black/5 appearance-none px-0 transition-colors ${dayData.work === '오픈' ? 'text-green-700' : dayData.work === '마감' ? 'text-red-700' : (!dayData.work || dayData.work === '근무') ? 'text-gray-300' : 'text-gray-800'} ${(dayData.work?.length || 0) > 3 ? 'text-[10px]' : 'text-[12px]'}`}
                                          style={{ textAlignLast: 'center' }}
                                        >
                                          {workOptions.map(opt => (
                                            <option key={opt} value={opt} className="text-gray-800 font-bold bg-white text-[12px]">{opt}</option>
                                          ))}
                                        </select>
                                      </div>
                                      <div className={`w-1/2 h-full transition-colors ${statusColorClass} border-l border-gray-200/60`}>
                                        <select 
                                          value={dayData.status || '상태'} 
                                          onChange={(e) => handleStatusChange(person.id, date.dateString, e.target.value)}
                                          className={`w-full h-full bg-transparent text-center font-bold outline-none cursor-pointer hover:bg-black/5 appearance-none px-0 transition-colors ${(!dayData.status || dayData.status === '상태') ? 'text-gray-300' : ''} ${(dayData.status?.length || 0) > 3 ? 'text-[10px]' : 'text-[12px]'}`}
                                          style={{ textAlignLast: 'center' }}
                                        >
                                          {statusOptions.map(opt => (
                                            <option key={opt} value={opt} className="text-gray-800 font-bold bg-white text-[12px]">{opt}</option>
                                          ))}
                                        </select>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </td>
                            )})}
                          </tr>
                        )})}
                        {filteredPersonnelList.length === 0 && (
                          <tr>
                            <td colSpan={currentMonthDates.length + 1} className="py-20 text-center text-gray-400 bg-white">
                              <Search className="w-12 h-12 mx-auto mb-3 opacity-20" />
                              <p>{searchTerm ? '검색 결과가 없습니다.' : '등록된 인원이 없습니다.'}</p>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
                ) : activeTab === 'personnel' ? (
                  <div className="h-full flex flex-col">
                    <div className="mb-6">
                      <h2 className="text-2xl font-bold mb-1 tracking-tight">인원 관리</h2>
                      <p className="text-gray-500 text-sm">지점 및 점장 정보를 추가, 수정, 삭제할 수 있습니다.</p>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col flex-1">
                      {/* Add Form */}
                      <div className="p-4 border-b border-gray-200 bg-gray-50/30 flex flex-col sm:flex-row items-center gap-4">
                        <div className="w-full sm:flex-1 relative">
                          <Plus className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                          <input 
                            type="text" 
                            value={newBranch}
                            onChange={(e) => setNewBranch(e.target.value)}
                            placeholder="새 지점명 (예: 강남점)" 
                            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm transition-all"
                          />
                        </div>
                        <div className="w-full sm:flex-1 relative">
                          <User className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                          <input 
                            type="text" 
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            placeholder="새 이름 (예: 홍길동)" 
                            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm transition-all"
                          />
                        </div>
                        <motion.button 
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={handleAddPersonnel}
                          className="w-full sm:w-auto px-6 py-2.5 bg-black text-white rounded-lg font-bold text-sm hover:bg-gray-800 transition-colors shadow-sm flex items-center justify-center"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          추가하기
                        </motion.button>
                      </div>

                      <div className="overflow-x-auto flex-1">
                        <table className="w-full min-w-[600px] border-collapse">
                          <thead>
                            <tr className="bg-gray-50/50">
                              <th className="py-4 px-6 border-b border-gray-200 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">지점명</th>
                              <th className="py-4 px-6 border-b border-gray-200 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">점장명</th>
                              <th className="py-4 px-6 border-b border-gray-200 text-center text-xs font-bold text-gray-500 uppercase tracking-wider w-48">관리</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredPersonnelList.map((person) => (
                              <tr key={person.id} className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50/30 transition-colors">
                                <td className="py-4 px-6 font-bold text-gray-800">{person.branch}</td>
                                <td className="py-4 px-6 text-gray-600">{person.name}</td>
                                <td className="py-4 px-6 text-center">
                                  <div className="flex items-center justify-center space-x-2">
                                    <motion.button 
                                      whileHover={{ scale: 1.05 }}
                                      whileTap={{ scale: 0.95 }}
                                      onClick={() => openEditModal(person)}
                                      className="flex items-center px-3 py-1.5 border border-gray-200 rounded-md text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                                    >
                                      <Pencil className="w-3.5 h-3.5 mr-1.5" />
                                      수정
                                    </motion.button>
                                    <motion.button 
                                      whileHover={{ scale: 1.05, backgroundColor: '#fee2e2' }}
                                      whileTap={{ scale: 0.95 }}
                                      onClick={() => openDeleteModal(person.id)}
                                      className="flex items-center px-3 py-1.5 bg-red-50 text-red-600 rounded-md text-xs font-medium hover:bg-red-100 transition-colors"
                                    >
                                      <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                                      삭제
                                    </motion.button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                            {filteredPersonnelList.length === 0 && (
                              <tr>
                                <td colSpan={3} className="py-20 text-center text-gray-400">
                                  <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                  <p>{searchTerm ? '검색 결과가 없습니다.' : '등록된 인원이 없습니다.'}</p>
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
            ) : activeTab === 'statistics' ? (
              <div className="h-full flex flex-col">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold mb-1 tracking-tight">통계 분석</h2>
                  <p className="text-gray-500 text-sm">점장별 근무 패턴 및 오픈/마감 비율을 분석합니다.</p>
                </div>

                <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col flex-1">
                  <div className="p-6 border-b border-gray-200">
                    <h2 className="text-xl font-bold tracking-tight">점장별 근무 통계 ({year.toString().slice(2)}년 {month + 1}월)</h2>
                  </div>
                  <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-280px)] flex-1">
                    <table className="w-full min-w-[1000px] border-collapse">
                      <thead>
                        <tr>
                          <th className="sticky top-0 left-0 z-30 py-4 px-6 border-b border-r border-gray-200 bg-gray-50 text-xs font-medium text-gray-500 text-left shadow-[1px_1px_0_0_rgba(0,0,0,0.1)]">점장명</th>
                          <th className="sticky top-0 z-20 py-4 px-6 border-b border-gray-200 bg-gray-50 text-xs font-medium text-gray-500 text-center shadow-[0_1px_0_0_rgba(0,0,0,0.1)]">마감횟수</th>
                          <th className="sticky top-0 z-20 py-4 px-6 border-b border-gray-200 bg-gray-50 text-xs font-medium text-gray-500 text-left shadow-[0_1px_0_0_rgba(0,0,0,0.1)]">마감비율</th>
                          <th className="sticky top-0 z-20 py-4 px-6 border-b border-gray-200 bg-gray-50 text-xs font-medium text-gray-500 text-center shadow-[0_1px_0_0_rgba(0,0,0,0.1)]">오픈횟수</th>
                          <th className="sticky top-0 z-20 py-4 px-6 border-b border-gray-200 bg-gray-50 text-xs font-medium text-gray-500 text-left shadow-[0_1px_0_0_rgba(0,0,0,0.1)]">오픈비율</th>
                          <th className="sticky top-0 z-20 py-4 px-6 border-b border-gray-200 bg-gray-50 text-xs font-medium text-gray-500 text-center shadow-[0_1px_0_0_rgba(0,0,0,0.1)]">오픈+마감</th>
                          <th className="sticky top-0 z-20 py-4 px-6 border-b border-gray-200 bg-gray-50 text-xs font-medium text-gray-500 text-center shadow-[0_1px_0_0_rgba(0,0,0,0.1)]">겸직일수</th>
                          <th className="sticky top-0 z-20 py-4 px-6 border-b border-gray-200 bg-gray-50 text-xs font-medium text-gray-500 text-center shadow-[0_1px_0_0_rgba(0,0,0,0.1)]">근무일수</th>
                        </tr>
                      </thead>
                      <tbody>
                        {statsData.map((stat, idx) => (
                          <tr key={idx} className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50/50 transition-colors">
                            <td className="sticky left-0 z-10 py-4 px-6 bg-white border-r border-gray-100 shadow-[1px_0_0_0_rgba(0,0,0,0.1)]">
                              <div className="flex items-center">
                                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-bold text-sm mr-4">
                                  {stat.name.charAt(0)}
                                </div>
                                <div>
                                  <div className="font-bold text-gray-800 text-sm">{stat.name}</div>
                                  <div className="text-xs text-gray-500 mt-0.5">{stat.branch}</div>
                                </div>
                              </div>
                            </td>
                            <td className="py-4 px-6 text-center font-bold text-gray-800">{stat.closeCount}</td>
                            <td className="py-4 px-6">
                              <div className="flex items-center">
                                <div className="w-24 h-2 bg-gray-100 rounded-full mr-3 overflow-hidden">
                                  <div className="h-full bg-orange-400 rounded-full" style={{ width: `${stat.closeRatio}%` }}></div>
                                </div>
                                <span className="text-sm font-bold text-gray-800 w-8">{stat.closeRatio}%</span>
                              </div>
                            </td>
                            <td className="py-4 px-6 text-center font-bold text-gray-800">{stat.openCount}</td>
                            <td className="py-4 px-6">
                              <div className="flex items-center">
                                <div className="w-24 h-2 bg-gray-100 rounded-full mr-3 overflow-hidden">
                                  <div className="h-full bg-green-400 rounded-full" style={{ width: `${stat.openRatio}%` }}></div>
                                </div>
                                <span className="text-sm font-bold text-gray-800 w-8">{stat.openRatio}%</span>
                              </div>
                            </td>
                            <td className="py-4 px-6 text-center font-bold text-gray-800">{stat.openCloseTotal}</td>
                            <td className="py-4 px-6 text-center font-bold text-blue-500">{stat.concurrentCount}</td>
                            <td className="py-4 px-6 text-center font-bold text-gray-800">{stat.workDays}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : activeTab === 'board' ? (
              <div className="h-full flex flex-col">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-6 gap-4">
                  <div>
                    <h2 className="text-2xl font-bold mb-1 tracking-tight">근무지원</h2>
                    <p className="text-gray-500 text-sm">지원 근무 및 기타 변경 사항을 공유하는 공간입니다.</p>
                  </div>
                  <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setIsWriteModalOpen(true)}
                    className="flex items-center px-4 py-2 bg-black text-white rounded-lg font-medium text-sm hover:bg-gray-800 transition-colors shadow-sm"
                  >
                    <Pencil className="w-4 h-4 mr-2" />
                    작성하기
                  </motion.button>
                </div>

                <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex-1">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[1000px] border-collapse">
                      <thead>
                        <tr>
                          <th className="py-4 px-4 border-b border-gray-200 bg-gray-50/50 text-xs font-medium text-gray-500 text-center w-24">작성일</th>
                          <th className="py-4 px-4 border-b border-gray-200 bg-gray-50/50 text-xs font-medium text-gray-500 text-center w-24">점장명</th>
                          <th className="py-4 px-4 border-b border-gray-200 bg-gray-50/50 text-xs font-medium text-gray-500 text-center w-24">일자</th>
                          <th className="py-4 px-4 border-b border-gray-200 bg-gray-50/50 text-xs font-medium text-gray-500 text-center w-32">스케줄상 근무지</th>
                          <th className="py-4 px-4 border-b border-gray-200 bg-gray-50/50 text-xs font-medium text-gray-500 text-center w-40">변경 근무지</th>
                          <th className="py-4 px-4 border-b border-gray-200 bg-gray-50/50 text-xs font-medium text-gray-500 text-center w-24">지원 시간</th>
                          <th className="py-4 px-4 border-b border-gray-200 bg-gray-50/50 text-xs font-medium text-gray-500 text-left">기타</th>
                          <th className="py-4 px-4 border-b border-gray-200 bg-gray-50/50 text-xs font-medium text-gray-500 text-center w-16">관리</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredPosts.map((post) => (
                          <tr key={post.id} className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50/30 transition-colors">
                            <td className="py-4 px-4 text-center text-xs text-gray-500">{new Date(post.createdAt).toLocaleDateString()}</td>
                            <td className="py-4 px-4 text-center font-bold text-gray-800 text-sm">{post.managerName}</td>
                            <td className="py-4 px-4 text-center text-sm font-medium">{post.date}</td>
                            <td className="py-4 px-4 text-center text-sm">{post.scheduledWorkplace}</td>
                            <td className="py-4 px-4 text-center">
                              <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-bold">{post.changedWorkplace}</span>
                            </td>
                            <td className="py-4 px-4 text-center text-sm font-bold text-gray-700">{post.supportTime}</td>
                            <td className="py-4 px-4 text-sm text-gray-600">{post.notes}</td>
                            <td className="py-4 px-4 text-center">
                              <motion.button 
                                whileHover={{ scale: 1.1, color: '#ef4444' }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => deletePost(post.id)}
                                className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </motion.button>
                            </td>
                          </tr>
                        ))}
                        {filteredPosts.length === 0 && (
                          <tr>
                            <td colSpan={8} className="py-20 text-center text-gray-400">
                              <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
                              <p>{searchTerm ? '검색 결과가 없습니다.' : '작성된 게시글이 없습니다.'}</p>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : null}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  </main>

      {/* Edit Modal */}
      <AnimatePresence>
        {isEditModalOpen && editingPerson && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeEditModal}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative z-10"
            >
              <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <h3 className="text-xl font-bold text-gray-900 tracking-tight">인원 정보 수정</h3>
                <button onClick={closeEditModal} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="p-6 space-y-5">
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-gray-700">지점명</label>
                  <div className="relative">
                    <Plus className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input 
                      type="text" 
                      value={editingPerson.branch}
                      onChange={(e) => setEditingPerson({ ...editingPerson, branch: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
                      placeholder="지점명을 입력하세요"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-gray-700">점장명</label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input 
                      type="text" 
                      value={editingPerson.name}
                      onChange={(e) => setEditingPerson({ ...editingPerson, name: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
                      placeholder="이름을 입력하세요"
                    />
                  </div>
                </div>
              </div>
              <div className="px-6 py-5 bg-gray-50 border-t border-gray-100 flex justify-end space-x-3">
                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={closeEditModal}
                  className="px-5 py-2.5 text-sm font-bold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors shadow-sm"
                >
                  취소
                </motion.button>
                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={confirmEditPersonnel}
                  className="px-5 py-2.5 text-sm font-bold text-white bg-black rounded-xl hover:bg-gray-800 transition-colors shadow-md"
                >
                  변경사항 저장
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Modal */}
      <AnimatePresence>
        {isDeleteModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeDeleteModal}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden relative z-10"
            >
              <div className="p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-6">
                  <Trash2 className="w-8 h-8 text-red-500" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2 tracking-tight">정말 삭제하시겠습니까?</h3>
                <p className="text-gray-500 text-sm leading-relaxed">삭제된 데이터는 복구할 수 없으며,<br />해당 지점의 모든 스케줄 정보가 제거됩니다.</p>
              </div>
              <div className="px-6 py-5 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row justify-center gap-3">
                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={closeDeleteModal}
                  className="w-full px-5 py-2.5 text-sm font-bold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors shadow-sm"
                >
                  아니오, 취소합니다
                </motion.button>
                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={confirmDeletePersonnel}
                  className="w-full px-5 py-2.5 text-sm font-bold text-white bg-red-500 rounded-xl hover:bg-red-600 transition-colors shadow-md"
                >
                  네, 삭제합니다
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Write Post Modal */}
      <AnimatePresence>
        {isWriteModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsWriteModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden relative z-10 flex flex-col max-h-[90vh]"
            >
              <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <h3 className="text-xl font-bold text-gray-900 tracking-tight">근무지원 작성</h3>
                <button onClick={() => setIsWriteModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="p-6 space-y-5 overflow-y-auto">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-gray-700">점장명 <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <User className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input 
                        type="text" 
                        value={newPost.managerName}
                        onChange={(e) => setNewPost({ ...newPost, managerName: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
                        placeholder="예: 홍길동"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-gray-700">일자 <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <Calendar className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input 
                        type="date" 
                        value={newPost.date}
                        onChange={(e) => setNewPost({ ...newPost, date: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-gray-700">스케줄상 근무지</label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input 
                      type="text" 
                      value={newPost.scheduledWorkplace}
                      onChange={(e) => setNewPost({ ...newPost, scheduledWorkplace: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
                      placeholder="예: 강남점"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-gray-700">변경 근무지 (대관/단체 지원)</label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-400" />
                    <input 
                      type="text" 
                      value={newPost.changedWorkplace}
                      onChange={(e) => setNewPost({ ...newPost, changedWorkplace: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 border border-blue-100 bg-blue-50/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
                      placeholder="예: 서초점"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-gray-700">지원 시간</label>
                  <div className="relative">
                    <Clock className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input 
                      type="text" 
                      value={newPost.supportTime}
                      onChange={(e) => setNewPost({ ...newPost, supportTime: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
                      placeholder="예: 14:00 - 18:00"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-gray-700">기타 전달사항</label>
                  <textarea 
                    value={newPost.notes}
                    onChange={(e) => setNewPost({ ...newPost, notes: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm min-h-[120px] resize-none"
                    placeholder="추가 전달사항을 상세히 입력하세요"
                  />
                </div>
            </div>
              <div className="px-6 py-5 bg-gray-50 border-t border-gray-100 flex justify-end space-x-3 mt-auto">
                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setIsWriteModalOpen(false)}
                  className="px-5 py-2.5 text-sm font-bold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors shadow-sm"
                >
                  취소
                </motion.button>
                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleAddPost}
                  disabled={!newPost.managerName.trim() || !newPost.date.trim()}
                  className="px-5 py-2.5 text-sm font-bold text-white bg-black rounded-xl hover:bg-gray-800 transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  게시글 등록
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

