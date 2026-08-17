<?php

namespace App\Notifications\Channels;

use App\Models\PushSubscription;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\Log;
use Minishlink\WebPush\Subscription;
use Minishlink\WebPush\WebPush;

/**
 * Kanal notifikasi push peramban.
 *
 * Mengirim ke SELURUH perangkat milik penerima — petugas yang menyalakannya di
 * laptop dan di ponsel harus menerima di keduanya.
 *
 * ============================================================
 * LANGGANAN MATI DIBERSIHKAN SENDIRI
 * ============================================================
 *
 * Server push membalas 404 atau 410 untuk langganan yang sudah tidak berlaku —
 * peramban dipasang ulang, izin dicabut, atau perangkatnya diganti. Baris
 * seperti itu tidak akan pernah pulih.
 *
 * Tanpa pembersihan, daftarnya hanya bertambah: tiap notifikasi mencoba
 * mengirim ke perangkat yang sudah lama tidak ada, dan pengirimannya makin
 * lambat dari bulan ke bulan tanpa ada yang menyadari sebabnya.
 */
class WebPushChannel
{
    public function send(object $notifiable, Notification $notification): void
    {
        if (! method_exists($notification, 'toWebPush')) {
            return;
        }

        if (blank(config('webpush.public_key')) || blank(config('webpush.private_key'))) {
            Log::warning('Kunci VAPID belum dipasang; notifikasi push dilewati.');

            return;
        }

        $langganan = PushSubscription::where('user_id', $notifiable->getKey())->get();

        if ($langganan->isEmpty()) {
            return;
        }

        try {
            $webPush = new WebPush([
                'VAPID' => [
                    'subject' => config('webpush.subject'),
                    'publicKey' => config('webpush.public_key'),
                    'privateKey' => config('webpush.private_key'),
                ],
            ]);
            $webPush->setDefaultOptions(['TTL' => 3600]);
        } catch (\Throwable $e) {
            Log::warning('Kunci VAPID tidak sah: ' . $e->getMessage());

            return;
        }

        $muatan = json_encode($notification->toWebPush($notifiable), JSON_UNESCAPED_UNICODE);

        foreach ($langganan as $satu) {
            $webPush->queueNotification(
                Subscription::create([
                    'endpoint' => $satu->getAttributes()['endpoint'],
                    'keys' => [
                        'p256dh' => $satu->getAttributes()['p256dh'],
                        'auth' => $satu->getAttributes()['auth'],
                    ],
                ]),
                $muatan,
            );
        }

        foreach ($webPush->flush() as $hasil) {
            if ($hasil->isSuccess()) {
                continue;
            }

            // 404/410 = langganan memang sudah mati; sisanya gangguan sesaat
            // yang tidak boleh membuat kita membuang langganan yang masih sah.
            if (in_array($hasil->getResponse()?->getStatusCode(), [404, 410], true)) {
                PushSubscription::where('endpoint', $hasil->getEndpoint())->delete();

                continue;
            }

            Log::warning('Pengiriman push gagal: ' . $hasil->getReason());
        }
    }
}
