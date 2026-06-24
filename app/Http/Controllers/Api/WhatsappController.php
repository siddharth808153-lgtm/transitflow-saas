<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AdminSetting;
use App\Models\WhatsappLog;
use Illuminate\Http\Request;

class WhatsappController extends Controller
{
    /**
     * Called by Node.js service to update WhatsApp message status
     */
    public function statusUpdate(Request $request)
    {
        // Verify the callback is from our Node service
        $secret = $request->header('X-Service-Secret');
        $expectedSecret = config(
          'services.whatsapp.secret', 
          'transport_whatsapp_secret_2024'
        );

        if ($secret !== $expectedSecret) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $log = WhatsappLog::find($request->whatsapp_log_id);

        if (!$log) {
            return response()->json(['message' => 'Log not found'], 404);
        }

        $log->update([
            'status' => $request->status,
            'sent_at' => $request->status === 'sent' ? now() : null,
            'error_message' => $request->error_message
        ]);

        return response()->json(['success' => true]);
    }

    /**
     * Connect/initiate WhatsApp for an admin
     * Called from frontend settings page
     */
    public function connect(Request $request)
    {
        $adminId = auth()->id();
        $serviceUrl = config('services.whatsapp.url', 'http://localhost:3001');
        $serviceSecret = config(
          'services.whatsapp.secret',
          'transport_whatsapp_secret_2024'
        );

        try {
            $response = \Illuminate\Support\Facades\Http::timeout(10)->withHeaders([
                'X-Service-Secret' => $serviceSecret
            ])->post("{$serviceUrl}/api/instance/connect", [
                'admin_id' => $adminId
            ]);

            return response()->json($response->json());
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'WhatsApp service is not reachable. Please ensure the service is running.',
            ], 503);
        }
    }

    /**
     * Disconnect/terminate WhatsApp for an admin
     * Called from frontend settings page
     */
    public function disconnect(Request $request)
    {
        $adminId = auth()->id();
        $serviceUrl = config('services.whatsapp.url', 'http://localhost:3001');
        $serviceSecret = config(
          'services.whatsapp.secret',
          'transport_whatsapp_secret_2024'
        );

        try {
            $response = \Illuminate\Support\Facades\Http::timeout(10)->withHeaders([
                'X-Service-Secret' => $serviceSecret
            ])->post("{$serviceUrl}/api/instance/disconnect", [
                'admin_id' => $adminId
            ]);

            return response()->json($response->json());
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'WhatsApp service is not reachable. Please ensure the service is running.',
            ], 503);
        }
    }

    /**
     * Get WhatsApp connection status + QR code for admin
     */
    public function connectionStatus(Request $request)
    {
        $adminId = auth()->id();
        $serviceUrl = config('services.whatsapp.url', 'http://localhost:3001');
        $serviceSecret = config(
          'services.whatsapp.secret',
          'transport_whatsapp_secret_2024'
        );

        try {
            $response = \Illuminate\Support\Facades\Http::timeout(5)->withHeaders([
                'X-Service-Secret' => $serviceSecret
            ])->get("{$serviceUrl}/api/instance/status/{$adminId}");

            if ($response->successful()) {
                $data = $response->json();
                if (isset($data['success']) && $data['success'] && isset($data['data']['status'])) {
                    $status = $data['data']['status'];
                    if ($status === 'connected' && !empty($data['data']['phone'])) {
                        $settings = AdminSetting::firstOrCreate(['admin_id' => $adminId]);
                        if ($settings->whatsapp_sender_phone !== $data['data']['phone']) {
                            $settings->update([
                                'whatsapp_sender_phone' => $data['data']['phone']
                            ]);
                        }
                    }
                }
                return response()->json($data);
            }

            return response()->json([
                'success' => false,
                'data' => ['status' => 'disconnected'],
                'message' => 'WhatsApp service returned an error.',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'data' => ['status' => 'disconnected'],
                'message' => 'WhatsApp service is not reachable. Please ensure the service is running.',
            ]);
        }
    }

    /**
     * Get admin settings
     */
    public function getSettings()
    {
        $adminId = auth()->id();
        $settings = AdminSetting::firstOrCreate(['admin_id' => $adminId]);
        return response()->json(['success' => true, 'data' => $settings]);
    }

    /**
     * Update admin settings
     */
    public function updateSettings(Request $request)
    {
        $adminId = auth()->id();
        $settings = AdminSetting::firstOrCreate(['admin_id' => $adminId]);

        $request->validate([
            'business_name' => 'nullable|string|max:255',
            'whatsapp_sender_phone' => 'nullable|string|max:20',
        ]);

        $settings->update([
            'business_name' => $request->business_name,
            'whatsapp_sender_phone' => $request->whatsapp_sender_phone,
        ]);

        return response()->json(['success' => true, 'data' => $settings]);
    }

    /**
     * Get recent WhatsApp logs
     */
    public function getLogs()
    {
        $adminId = auth()->id();
        $logs = WhatsappLog::where('admin_id', $adminId)
            ->latest()
            ->limit(20)
            ->get();
            
        return response()->json(['success' => true, 'data' => $logs]);
    }
}

