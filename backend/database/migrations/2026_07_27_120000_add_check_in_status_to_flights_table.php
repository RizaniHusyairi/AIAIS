<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Tambahkan status 'check_in' pada tabel flights.
 *
 * FIDS bandara membedakan "Check In Open" dari "Boarding"; sebelumnya keduanya
 * dipetakan ke 'boarding' sehingga penumpang yang check-in-nya baru dibuka
 * melihat label "Boarding". Enum lokal disamakan agar penerbangan yang
 * diinput lewat panel admin bisa memakai status yang sama.
 */
return new class extends Migration
{
    private const WITH_CHECK_IN =
        "ENUM('scheduled','check_in','boarding','departed','delayed','landed','cancelled')";

    private const WITHOUT_CHECK_IN =
        "ENUM('scheduled','boarding','departed','delayed','landed','cancelled')";

    public function up(): void
    {
        DB::statement(
            'ALTER TABLE flights MODIFY COLUMN status ' . self::WITH_CHECK_IN . " NOT NULL DEFAULT 'scheduled'"
        );
    }

    public function down(): void
    {
        // Kembalikan baris ber-status check_in ke nilai yang masih sah.
        DB::table('flights')->where('status', 'check_in')->update(['status' => 'boarding']);

        DB::statement(
            'ALTER TABLE flights MODIFY COLUMN status ' . self::WITHOUT_CHECK_IN . " NOT NULL DEFAULT 'scheduled'"
        );
    }
};
