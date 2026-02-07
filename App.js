// src/App.js - نسخة الإطلاق السريع - BLEX - (محدث للأمان)
import React, { useState } from 'react';
import './App.css'; // تأكد أن Tailwind CSS مفعّل في ملف App.css

// --- المكون الرئيسي (بوابتك يا مدير) ---
function App() {
  // حالة المدير: true تظهر لوحة التحكم، false تظهر واجهة المتجر للزبائن
  const [isAdmin, setIsAdmin] = useState(false); // تم تغييرها لـ false للأمان
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState('logs');

  // كلمة مرور المدير (يجب تغييرها لاحقاً لشيء معقد)
  const ADMIN_PASSWORD = "BLEX_SECRET_2026"; 

  // دالة تسجيل الدخول
  const handleLogin = () => {
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      setIsAdmin(true);
    } else {
      alert("كلمة المرور خاطئة!");
    }
  };

  // بيانات تجريبية للسجل (Data Logs)
  const [logs, setLogs] = useState([
    { id: 1, user: 'AI (Gemini)', action: 'تحديث أسعار الشحن من الصين - BLEX', time: '2026-02-06 07:30' },
    { id: 2, user: 'Admin (أنت)', action: 'تفعيل خصم B2B للعميل X', time: '2026-02-06 07:35' },
  ]);

  // بيانات تجريبية للملفات (Codebase)
  const [files, setFiles] = useState([
    { name: 'server.js', type: 'Node.js' },
    { name: 'Dockerfile', type: 'Docker' },
    { name: 'tailwind.config.js', type: 'Tailwind' },
  ]);

  return (
    <div className="min-h-screen bg-slate-50">
      {!isAuthenticated ? (
        // --- شاشة تسجيل الدخول ---
        <div className="flex flex-col items-center justify-center min-h-screen p-4">
          <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md text-center">
            <h1 className="text-3xl font-black text-indigo-950 mb-6">👑 دخول مدير BLEX</h1>
            <input 
              type="password"
              placeholder="كلمة المرور"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 border rounded-lg mb-4"
            />
            <button onClick={handleLogin} className="w-full bg-indigo-600 text-white p-3 rounded-lg font-bold">
              دخول
            </button>
          </div>
        </div>
      ) : isAdmin ? (
        // --- شاشة لوحة تحكم المدير ---
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-4xl font-black text-indigo-950">👑 BLEX Command Center</h1>
            <button onClick={() => {setIsAdmin(false); setIsAuthenticated(false);}} className="bg-red-500 text-white px-4 py-2 rounded-lg font-bold">
              خروج / عرض المتجر
            </button>
          </div>
          
          {/* التبويبات (Tabs) */}
          <div className="flex gap-4 mb-6 border-b border-gray-300 pb-2">
            <button onClick={() => setActiveTab('logs')} className={`font-bold pb-2 ${activeTab === 'logs' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500'}`}>
              سجل المعاملات 📋
            </button>
            <button onClick={() => setActiveTab('code')} className={`font-bold pb-2 ${activeTab === 'code' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500'}`}>
              محرر الكود 💻
            </button>
          </div>

          {/* محتوى التبويبات */}
          {activeTab === 'logs' && (
            <div className="bg-white p-6 rounded-2xl shadow-lg">
              <h2 className="text-xl font-bold mb-4">سجل النشاطات الشامل - BLEX</h2>
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b">
                    <th className="p-2">المصدر</th>
                    <th className="p-2">الإجراء</th>
                    <th className="p-2">الوقت</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map(log => (
                    <tr key={log.id} className="border-b hover:bg-slate-50">
                      <td className={`p-2 font-bold ${log.user.includes('AI') ? 'text-purple-600' : 'text-blue-600'}`}>{log.user}</td>
                      <td className="p-2">{log.action}</td>
                      <td className="p-2 text-sm text-gray-500">{log.time}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'code' && (
            <div className="bg-white p-6 rounded-2xl shadow-lg">
              <h2 className="text-xl font-bold mb-4">مدير الملفات والكود - BLEX</h2>
              <div className="grid grid-cols-2 gap-4">
                {files.map(file => (
                  <div key={file.name} className="p-4 border rounded-lg flex justify-between items-center hover:bg-slate-50">
                    <div>
                      <p className="font-bold">{file.name}</p>
                      <p className="text-sm text-gray-500">{file.type}</p>
                    </div>
                    <button className="bg-slate-800 text-white px-4 py-2 rounded-lg text-sm">تعديل</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        // --- شاشة الزوار (واجهة المتجر) ---
        <div className="flex flex-col items-center justify-center min-h-screen text-center p-4">
          <h1 className="text-6xl font-black text-blue-600 mb-4">BLEX</h1>
          <p className="text-2xl text-gray-700 mb-6">من أوهايو للعالم.. شحن سريع وفخم</p>
          <button onClick={() => setIsAdmin(true)} className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-bold">
            دخول المدير 👑
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
