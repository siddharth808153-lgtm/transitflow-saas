// src/pages/settings/WhatsAppSettingsPage.tsx
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  CheckCircle, 
  XCircle, 
  Loader2, 
  MessageSquare, 
  QrCode, 
  Save, 
  AlertCircle,
  HelpCircle,
  PhoneCall
} from 'lucide-react';
import api from '@/api/axios';
import { WHATSAPP, SETTINGS } from '@/api/endpoints';
import PageHeader from '@/components/shared/PageHeader';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Tag from '@/components/ui/Tag';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import toast from '@/components/ui/toast';
import Notification from '@/components/ui/Notification';

export const WhatsAppSettingsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [businessName, setBusinessName] = useState('');
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);

  // 1. Fetch Admin settings (Business Name and WhatsApp Sender Phone)
  const { data: settingsResponse, isLoading: isLoadingSettings } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: async () => {
      const res = await api.get(SETTINGS.GET);
      return res.data;
    },
  });

  // Sync state with settings response
  useEffect(() => {
    if (settingsResponse?.data?.business_name) {
      setBusinessName(settingsResponse.data.business_name);
    }
  }, [settingsResponse]);

  // 2. Fetch WhatsApp Connection status (poll if connecting or qr_ready)
  const { data: statusResponse, isLoading: isLoadingStatus } = useQuery({
    queryKey: ['whatsapp-status'],
    queryFn: async () => {
      const res = await api.get(WHATSAPP.STATUS);
      return res.data;
    },
    refetchInterval: (query) => {
      const status = query.state.data?.data?.status;
      if (status === 'connecting' || status === 'qr_ready') {
        return 3000;
      }
      return false;
    },
  });

  // 3. Fetch Recent WhatsApp Logs (Last 20)
  const { data: logsResponse, isLoading: isLoadingLogs } = useQuery({
    queryKey: ['whatsapp-logs'],
    queryFn: async () => {
      const res = await api.get(WHATSAPP.LOGS);
      return res.data;
    },
  });

  const connection = statusResponse?.data || { status: 'disconnected', qr_image: null };
  const settings = settingsResponse?.data || { business_name: '', whatsapp_sender_phone: '' };
  const logs = logsResponse?.data || [];

  // Connect WhatsApp Mutation
  const connectMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post(WHATSAPP.CONNECT);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-status'] });
      toast.push(
        <Notification type="success" title="Success">
          WhatsApp connection initiated. Please wait for the QR code.
        </Notification>
      );
    },
    onError: (err: any) => {
      toast.push(
        <Notification type="danger" title="Error">
          {err.response?.data?.message || 'Failed to connect WhatsApp.'}
        </Notification>
      );
    },
  });

  // Disconnect WhatsApp Mutation
  const disconnectMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post(WHATSAPP.DISCONNECT);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-status'] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-logs'] });
      setShowDisconnectConfirm(false);
      toast.push(
        <Notification type="success" title="Disconnected">
          WhatsApp session logged out and cleared successfully.
        </Notification>
      );
    },
    onError: (err: any) => {
      toast.push(
        <Notification type="danger" title="Error">
          {err.response?.data?.message || 'Failed to disconnect WhatsApp.'}
        </Notification>
      );
    },
  });

  // Save Settings Mutation
  const saveSettingsMutation = useMutation({
    mutationFn: async (data: { business_name: string }) => {
      const res = await api.patch(SETTINGS.UPDATE, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-settings'] });
      toast.push(
        <Notification type="success" title="Success">
          Business settings saved successfully.
        </Notification>
      );
    },
    onError: (err: any) => {
      toast.push(
        <Notification type="danger" title="Error">
          {err.response?.data?.message || 'Failed to save settings.'}
        </Notification>
      );
    },
  });

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    saveSettingsMutation.mutate({ business_name: businessName });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'connected':
        return (
          <Tag className="bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold px-3 py-1 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Connected
          </Tag>
        );
      case 'connecting':
        return (
          <Tag className="bg-yellow-50 text-yellow-700 border border-yellow-200 font-bold px-3 py-1 flex items-center gap-1">
            <Loader2 className="w-3 h-3 animate-spin text-yellow-500" />
            Connecting
          </Tag>
        );
      case 'qr_ready':
        return (
          <Tag className="bg-blue-50 text-blue-700 border border-blue-200 font-bold px-3 py-1 flex items-center gap-1">
            <QrCode className="w-3 h-3 text-blue-500" />
            Scan QR
          </Tag>
        );
      case 'disconnected':
      case 'logged_out':
      default:
        return (
          <Tag className="bg-rose-50 text-rose-700 border border-rose-200 font-bold px-3 py-1 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
            Disconnected
          </Tag>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      <PageHeader
        title="WhatsApp Settings"
        breadcrumbs={[
          { label: 'Settings', path: '#' },
          { label: 'WhatsApp Settings' }
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Connection Status Card */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-indigo-600" />
                    WhatsApp Connection Status
                  </h4>
                  <p className="text-slate-500 text-sm mt-1">
                    Connect your custom sender number using WhatsApp Web.
                  </p>
                </div>
                {getStatusBadge(connection.status)}
              </div>

              <hr className="border-slate-100 dark:border-slate-800" />

              {/* Status details view */}
              {connection.status === 'connected' && (
                <div className="bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl p-6 flex flex-col md:flex-row items-center gap-5 justify-between">
                  <div className="flex items-center gap-4">
                    <div className="bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 p-3.5 rounded-full">
                      <CheckCircle className="w-8 h-8" />
                    </div>
                    <div>
                      <h5 className="font-bold text-slate-800 dark:text-slate-200 text-base">WhatsApp Connected Successfully</h5>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5">
                        <PhoneCall className="w-3.5 h-3.5 text-slate-400" />
                        Sender Number: <strong className="text-slate-700 dark:text-slate-300 font-semibold">{settings.whatsapp_sender_phone || 'Connected Web Client'}</strong>
                      </p>
                    </div>
                  </div>
                  <Button 
                    className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-xl px-5 py-2"
                    onClick={() => setShowDisconnectConfirm(true)}
                  >
                    Disconnect Session
                  </Button>
                </div>
              )}

              {connection.status === 'qr_ready' && connection.qr_image && (
                <div className="flex flex-col md:flex-row items-center gap-8 bg-blue-50/30 dark:bg-blue-950/10 border border-blue-100 dark:border-blue-900/30 rounded-3xl p-6 md:p-8">
                  <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-md">
                    <img 
                      src={connection.qr_image} 
                      alt="WhatsApp Web QR Code" 
                      className="w-48 h-48 select-none"
                    />
                  </div>
                  <div className="flex-1 space-y-4">
                    <div className="bg-blue-100/60 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 p-3 rounded-xl w-fit flex items-center gap-2">
                      <QrCode className="w-4 h-4" />
                      <span className="text-xs font-bold uppercase tracking-wider">Scan Required</span>
                    </div>
                    <h5 className="text-lg font-bold text-slate-900 dark:text-slate-100">Scan this QR Code with WhatsApp</h5>
                    <ol className="list-decimal list-inside text-sm text-slate-600 dark:text-slate-400 space-y-2 pl-1 leading-relaxed">
                      <li>Open WhatsApp on your mobile phone.</li>
                      <li>Tap <strong className="font-semibold text-slate-800 dark:text-slate-200">Menu</strong> or <strong className="font-semibold text-slate-800 dark:text-slate-200">Settings</strong> and select <strong className="font-semibold text-slate-800 dark:text-slate-200">Linked Devices</strong>.</li>
                      <li>Point your phone camera to this screen to scan the QR code.</li>
                    </ol>
                  </div>
                </div>
              )}

              {connection.status === 'connecting' && (
                <div className="bg-yellow-50/40 dark:bg-yellow-950/10 border border-yellow-100 dark:border-yellow-900/20 rounded-2xl p-6 flex items-center gap-4">
                  <Loader2 className="w-8 h-8 text-yellow-600 animate-spin" />
                  <div>
                    <h5 className="font-bold text-slate-800 dark:text-slate-200">Initializing Connection...</h5>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Please wait, starting WhatsApp session socket.</p>
                  </div>
                </div>
              )}

              {(connection.status === 'disconnected' || connection.status === 'logged_out') && (
                <div className="bg-slate-50 dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row items-center gap-4 justify-between">
                  <div className="flex items-center gap-3.5">
                    <div className="bg-slate-100 dark:bg-slate-800 text-slate-500 p-3 rounded-full">
                      <AlertCircle className="w-6 h-6" />
                    </div>
                    <div>
                      <h5 className="font-bold text-slate-800 dark:text-slate-200">WhatsApp is currently inactive</h5>
                      <p className="text-sm text-slate-500 mt-0.5">No sender number configured. Connect now to send payment updates.</p>
                    </div>
                  </div>
                  <Button 
                    variant="solid" 
                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-5 py-2.5 shadow-md shadow-blue-500/10"
                    onClick={() => connectMutation.mutate()}
                    loading={connectMutation.isPending}
                  >
                    Connect WhatsApp
                  </Button>
                </div>
              )}

            </div>
          </Card>
        </div>

        {/* Business Settings Card */}
        <div className="lg:col-span-1">
          <Card className="rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 h-full">
            <form onSubmit={handleSaveSettings} className="p-6 flex flex-col h-full justify-between gap-6">
              <div className="space-y-5">
                <div>
                  <h4 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Save className="w-5 h-5 text-indigo-600" />
                    Business Profile
                  </h4>
                  <p className="text-slate-500 text-xs mt-1">
                    Manage sender parameters used in your notifications.
                  </p>
                </div>

                <hr className="border-slate-100 dark:border-slate-800" />

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Business Display Name
                    </label>
                    <Input 
                      placeholder="e.g. TransitFlow Transport"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      className="rounded-xl"
                      disabled={isLoadingSettings}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      Sender Phone Number
                      <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700 rounded px-1.5 font-normal uppercase tracking-normal">Read-Only</span>
                    </label>
                    <Input 
                      value={settings.whatsapp_sender_phone || 'None (Scan to link)'}
                      className="rounded-xl bg-slate-50 dark:bg-slate-800 border-dashed text-slate-500"
                      readOnly
                      disabled
                    />
                  </div>
                </div>
              </div>

              <Button 
                type="submit" 
                variant="solid" 
                className="bg-blue-600 hover:bg-blue-700 text-white w-full rounded-xl py-2.5 flex items-center justify-center gap-2 shadow-md shadow-blue-500/10 mt-4"
                loading={saveSettingsMutation.isPending}
                disabled={isLoadingSettings}
              >
                Save Profile
              </Button>
            </form>
          </Card>
        </div>

      </div>

      {/* Recent WhatsApp Logs Table */}
      <Card className="rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h4 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Recent WhatsApp Delivery Logs
              </h4>
              <p className="text-slate-500 text-sm mt-1">
                Real-time delivery status of the last 20 transaction updates sent.
              </p>
            </div>
            <Button 
              size="sm" 
              onClick={() => queryClient.invalidateQueries({ queryKey: ['whatsapp-logs'] })}
              variant="default"
              className="text-xs text-slate-600 rounded-xl px-4 py-2 border border-slate-250 hover:bg-slate-50"
            >
              Refresh Logs
            </Button>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-800">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
                  <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-500">Recipient Phone</th>
                  <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-500">Message Preview</th>
                  <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-500">Status</th>
                  <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-500">Sent At</th>
                  <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-500">Error Message</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {isLoadingLogs ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      <div className="flex justify-center items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                        Loading logs...
                      </div>
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400 italic">
                      No logs recorded yet. Send payment receipts to see WhatsApp updates here.
                    </td>
                  </tr>
                ) : (
                  logs.map((log: any) => (
                    <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 text-sm">
                      <td className="py-3.5 px-4 font-medium text-slate-800 dark:text-slate-200">
                        {log.recipient_phone}
                      </td>
                      <td className="py-3.5 px-4 max-w-xs truncate text-slate-500" title={log.message_body}>
                        {log.message_body}
                      </td>
                      <td className="py-3.5 px-4">
                        {log.status === 'sent' && (
                          <Tag className="bg-emerald-50 text-emerald-700 border-emerald-250 font-bold px-2 py-0.5 text-xs">
                            Sent
                          </Tag>
                        )}
                        {log.status === 'pending' && (
                          <Tag className="bg-yellow-50 text-yellow-700 border-yellow-250 font-bold px-2 py-0.5 text-xs">
                            Pending
                          </Tag>
                        )}
                        {log.status === 'failed' && (
                          <Tag className="bg-rose-50 text-rose-700 border-rose-250 font-bold px-2 py-0.5 text-xs">
                            Failed
                          </Tag>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-400 text-xs">
                        {log.sent_at ? new Date(log.sent_at).toLocaleString() : '-'}
                      </td>
                      <td className="py-3.5 px-4 text-rose-600 max-w-xs truncate text-xs" title={log.error_message}>
                        {log.error_message || <span className="text-slate-300 italic">-</span>}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Card>

      {/* Confirm Disconnect Dialog */}
      <ConfirmDialog
        open={showDisconnectConfirm}
        title="Disconnect WhatsApp?"
        description="Are you sure you want to disconnect? This will log out of the current WhatsApp session and delete credentials. You will need to scan the QR code to connect again."
        confirmLabel="Disconnect"
        dangerous={true}
        onConfirm={() => disconnectMutation.mutate()}
        onCancel={() => setShowDisconnectConfirm(false)}
      />
    </div>
  );
};

export default WhatsAppSettingsPage;
