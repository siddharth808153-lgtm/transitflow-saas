<?php

namespace App\Jobs;

use App\Models\User;
use App\Models\WhatsappLog;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Http;

class SendWelcomeWhatsappJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * Create a new job instance.
     */
    public function __construct(
        public User $user,
    ) {}

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        $recipient = $this->user;
        
        // Find who created this user, or default to any Super Admin or another admin
        $senderId = $recipient->created_by;
        if (!$senderId) {
            $senderId = User::where('role', 'super_admin')->first()?->id;
        }

        if (!$senderId) {
            Log::warning('Cannot send welcome WhatsApp for user ' . $recipient->id . ': no sender admin found.');
            return;
        }

        $messageBody = "Welcome to TransitFlow, " . $recipient->name . "! Your admin account has been created successfully. Log in to start managing your fleet.";

        // Create WhatsappLog
        $whatsappLog = WhatsappLog::create([
            'admin_id' => $senderId,
            'transaction_id' => null,
            'recipient_phone' => $recipient->phone,
            'message_body' => $messageBody,
            'status' => 'pending',
        ]);

        Log::info('Dispatching Welcome WhatsApp message', [
            'recipient_id' => $recipient->id,
            'whatsapp_log_id' => $whatsappLog->id,
            'recipient_phone' => $recipient->phone,
        ]);

        try {
            $serviceUrl = config('services.whatsapp.url');
            $serviceSecret = config('services.whatsapp.secret');

            $response = Http::withHeaders([
                'X-Service-Secret' => $serviceSecret,
            ])->post($serviceUrl . '/messages/send', [
                'admin_id' => $senderId,
                'phone_number' => $recipient->phone,
                'message' => $messageBody,
                'whatsapp_log_id' => $whatsappLog->id,
            ]);

            if ($response->successful()) {
                Log::info('Welcome WhatsApp request successfully delivered to WhatsApp service.', [
                    'whatsapp_log_id' => $whatsappLog->id,
                ]);
            } else {
                $errorMsg = $response->body() ?: 'Unknown response error';
                $whatsappLog->update([
                    'status' => 'failed',
                    'error_message' => $errorMsg,
                ]);
                Log::error('Welcome WhatsApp service returned error status ' . $response->status() . ': ' . $errorMsg);
            }
        } catch (\Exception $e) {
            $whatsappLog->update([
                'status' => 'failed',
                'error_message' => $e->getMessage(),
            ]);
            Log::error('Welcome WhatsApp send exception: ' . $e->getMessage());
        }
    }
}
