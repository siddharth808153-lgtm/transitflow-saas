<?php

namespace App\Jobs;

use App\Models\Transaction;
use App\Models\WhatsappLog;
use App\Models\AdminSetting;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class SendPaymentWhatsappJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public int $backoff = 30; // retry after 30 seconds

    public function __construct(
        public Transaction $transaction
    ) {}

    public function handle(): void
    {
        // Get the WhatsApp log for this transaction
        $whatsappLog = WhatsappLog::where('transaction_id', $this->transaction->id)
            ->where('status', 'pending')
            ->latest()
            ->first();

        if (!$whatsappLog) {
            Log::warning('No pending WhatsApp log found for transaction', [
                'transaction_id' => $this->transaction->id
            ]);
            return;
        }

        // Get admin's WhatsApp sender number
        $adminSetting = AdminSetting::where('admin_id', $this->transaction->admin_id)->first();

        if (!$adminSetting || !$adminSetting->whatsapp_sender_phone) {
            Log::warning('Admin has no WhatsApp sender configured', [
                'admin_id' => $this->transaction->admin_id
            ]);
            $whatsappLog->update([
                'status' => 'failed',
                'error_message' => 'Admin WhatsApp sender not configured'
            ]);
            return;
        }

        $serviceUrl = config('services.whatsapp.url', 'http://localhost:3001');
        $serviceSecret = config('services.whatsapp.secret', 'transport_whatsapp_secret_2024');

        try {
            $response = Http::withHeaders([
                'X-Service-Secret' => $serviceSecret,
                'Content-Type' => 'application/json'
            ])
            ->timeout(15)
            ->post("{$serviceUrl}/api/message/send", [
                'admin_id' => $this->transaction->admin_id,
                'phone' => $whatsappLog->recipient_phone,
                'message' => $whatsappLog->message_body,
                'whatsapp_log_id' => $whatsappLog->id
            ]);

            if ($response->successful()) {
                $whatsappLog->update([
                    'status' => 'sent',
                    'sent_at' => now()
                ]);
                Log::info('WhatsApp message sent successfully', [
                    'log_id' => $whatsappLog->id,
                    'phone' => $whatsappLog->recipient_phone
                ]);
            } else {
                throw new \Exception(
                    'WhatsApp service returned: ' . $response->status()
                );
            }

        } catch (\Exception $e) {
            Log::error('WhatsApp send failed', [
                'log_id' => $whatsappLog->id,
                'error' => $e->getMessage()
            ]);

            // If this is the last retry, mark as failed
            if ($this->attempts() >= $this->tries) {
                $whatsappLog->update([
                    'status' => 'failed',
                    'error_message' => $e->getMessage()
                ]);
            }

            throw $e; // Re-throw so Laravel retries the job
        }
    }
}
