import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, CheckCircle, AlertTriangle, Info } from 'lucide-react';

interface Notification {
  id: number;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

const NotificationBell: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
      const [notifRes, countRes] = await Promise.all([
        axios.get('/api/notifications'),
        axios.get('/api/notifications/unread-count')
      ]);
      setNotifications(notifRes.data);
      setUnreadCount(countRes.data.count);
    } catch (error) {
      // Silently fail - notifications are not critical
    }
  };

  const markAsRead = async (id: number) => {
    try {
      await axios.put(`/api/notifications/${id}/read`);
      fetchNotifications();
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await axios.put('/api/notifications/read-all');
      fetchNotifications();
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'alert': return <AlertTriangle className="h-5 w-5 text-coral-500" />;
      case 'success': return <CheckCircle className="h-5 w-5 text-leaf-500" />;
      default: return <Info className="h-5 w-5 text-skyglow-500" />;
    }
  };

  const getAccent = (type: string) => {
    switch (type) {
      case 'alert': return 'border-l-coral-400';
      case 'success': return 'border-l-leaf-400';
      default: return 'border-l-skyglow-400';
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="icon-btn"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex items-center justify-center">
            <span className="absolute h-5 w-5 rounded-full bg-coral-400 animate-pulse-glow" />
            <span className="relative h-5 w-5 bg-gray-900 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.97 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="absolute right-0 mt-3 w-80 bg-white rounded-2xl shadow-depth-4 border border-gray-100 z-50 overflow-hidden origin-top-right"
            >
              <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                <h3 className="font-display font-semibold text-gray-900">Notifications</h3>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs font-semibold text-skyglow-600 hover:text-skyglow-700 px-2 py-1 rounded-xl hover:bg-skyglow-50 transition-colors"
                  >
                    Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-96 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-10 text-center text-gray-400">
                    <Bell className="h-8 w-8 mx-auto text-gray-200 mb-2" />
                    <p className="text-sm">No notifications</p>
                  </div>
                ) : (
                  notifications.map((notif, i) => (
                    <motion.div
                      key={notif.id}
                      initial={{ opacity: 0, x: 8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: Math.min(i, 6) * 0.04, duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                      className={`p-4 border-b border-gray-50 border-l-2 hover:bg-gray-50 transition-colors duration-150 cursor-pointer ${getAccent(notif.type)} ${
                        !notif.is_read ? 'bg-skyglow-50/40' : ''
                      }`}
                      onClick={() => markAsRead(notif.id)}
                    >
                      <div className="flex items-start space-x-3">
                        {getIcon(notif.type)}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900">{notif.title}</p>
                          <p className="text-sm text-gray-500">{notif.message}</p>
                          <p className="text-xs text-gray-400 mt-1 font-mono">
                            {new Date(notif.created_at).toLocaleString()}
                          </p>
                        </div>
                        {!notif.is_read && (
                          <div className="h-2 w-2 bg-gray-900 rounded-full mt-2 shrink-0" />
                        )}
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationBell;
