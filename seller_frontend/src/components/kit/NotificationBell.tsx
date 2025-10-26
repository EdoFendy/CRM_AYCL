import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@lib/apiClient';
import { useAuth } from '@context/AuthContext';
import type { Notification } from '@types/invoices';

export function NotificationBell() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);

  const notificationsQuery = useQuery({
    queryKey: ['notifications'],
    queryFn: () => apiClient<{ data: Notification[] }>('notifications', { token }),
    enabled: Boolean(token),
    select: (res) => res.data ?? [],
    refetchInterval: 30000 // Poll every 30 seconds
  });

  const markAsReadMutation = useMutation({
    mutationFn: (id: string) =>
      apiClient(`notifications/${id}/read`, {
        token,
        method: 'PATCH'
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: () =>
      apiClient('notifications/read-all', {
        token,
        method: 'PATCH'
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  const notifications = notificationsQuery.data ?? [];
  const unreadCount = notifications.filter(n => !n.read).length;

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markAsReadMutation.mutate(notification.id);
    }
    setIsOpen(false);
  };

  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate();
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'invoice_approved':
        return '✅';
      case 'invoice_rejected':
        return '❌';
      case 'contract_signed':
        return '📝';
      case 'checkout_completed':
        return '💰';
      default:
        return '🔔';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'invoice_approved':
        return 'text-green-600';
      case 'invoice_rejected':
        return 'text-red-600';
      case 'contract_signed':
        return 'text-blue-600';
      case 'checkout_completed':
        return 'text-green-600';
      default:
        return 'text-slate-600';
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-600 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg"
      >
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM4.5 19.5a1.5 1.5 0 01-1.5-1.5V6a1.5 1.5 0 011.5-1.5h15A1.5 1.5 0 0121 6v12a1.5 1.5 0 01-1.5 1.5h-15z" />
        </svg>
        
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-slate-200 z-50">
          <div className="p-4 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Notifiche</h3>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Segna tutte come lette
                </button>
              )}
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notificationsQuery.isLoading ? (
              <div className="p-4 text-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p className="text-sm text-slate-600">Caricamento...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-4 text-center">
                <p className="text-sm text-slate-500">Nessuna notifica</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-200">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`p-4 hover:bg-slate-50 cursor-pointer ${
                      !notification.read ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="text-lg">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className={`text-sm font-medium ${getNotificationColor(notification.type)}`}>
                            {notification.title}
                          </h4>
                          {!notification.read && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          )}
                        </div>
                        <p className="text-sm text-slate-600 mt-1">
                          {notification.message}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          {new Date(notification.created_at).toLocaleString('it-IT')}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {notifications.length > 0 && (
            <div className="p-4 border-t border-slate-200">
              <button
                onClick={() => setIsOpen(false)}
                className="w-full text-sm text-slate-600 hover:text-slate-800"
              >
                Chiudi
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

