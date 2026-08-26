<?php

namespace Database\Seeders;

use App\Models\News;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use RuntimeException;

/**
 * Berita contoh berisi tulisan panjang — untuk merancang dan menguji tampilan.
 *
 * PROVENANS. SELURUH ISINYA KARANGAN. Tidak satu pun kalimat di berkas ini
 * berasal dari siaran pers, dokumen, atau pernyataan resmi Bandara APT Pranoto.
 * Tujuannya tunggal: menyediakan artikel yang cukup panjang dan berstruktur
 * (sub judul, daftar, sorotan) untuk menguji halaman baca berita — daftar isi
 * "Rute Baca", penomoran titik lintasan, kemajuan baca, dan waktu baca. Tanpa
 * artikel semacam ini, seluruh berita di basis data pengembangan hanya satu
 * kalimat dan sebagian besar tampilannya tidak pernah muncul.
 *
 * Karena itu isinya sengaja dijaga TIDAK menyerupai pengumuman resmi:
 *
 *   - tidak ada kutipan yang diatasnamakan pejabat mana pun, bernama maupun
 *     berjabatan — sekali kutipan karangan beredar, tidak ada yang bisa
 *     membedakannya dari pernyataan sungguhan;
 *   - tidak ada nomor surat, nomor keputusan, atau rujukan regulasi;
 *   - tidak ada angka statistik yang berlagak resmi (jumlah penumpang,
 *     anggaran, target capaian);
 *   - `blockquote` dipakai untuk menyorot poin bacaan, BUKAN sebagai kutipan
 *     ucapan seseorang.
 *
 * DUA PENGAMAN.
 *
 *   1. Seeder ini TIDAK didaftarkan di `DatabaseSeeder`. Ia hanya berjalan bila
 *      dipanggil dengan namanya sendiri.
 *   2. Ia menolak basis data pada `config('legacy.protected_databases')` —
 *      penjaga yang sama dengan `DatabaseSeeder`, diulang di sini karena
 *      pemanggilan `--class=` melewati penjaga itu.
 *
 * MENJALANKAN. Pada basis data pengembangan mana pun yang namanya bukan basis
 * data terlindungi:
 *
 *     php artisan db:seed --class=NewsDemoSeeder
 *
 * Bila basis data pengembangan Anda kebetulan bernama sama dengan yang asli
 * (`db_apt`), penjaganya menolak. Itu disengaja. Lewatinya HANYA bila Anda
 * yakin basis data itu salinan pengembangan, dengan menyetel di `.env`:
 *
 *     SEED_DEMO_NEWS=true
 *
 * MEMBERSIHKAN. Seluruh barisnya berawalan slug `demo-`, jadi dapat dicabut
 * kembali tanpa menyentuh berita lain:
 *
 *     php artisan tinker --execute="App\Models\News::where('slug','like','demo-%')->delete();"
 */
class NewsDemoSeeder extends Seeder
{
    /** Awalan slug; menjadi penanda sekaligus jalan untuk membersihkannya. */
    private const AWALAN = 'demo-';

    public function run(): void
    {
        $this->tolakBasisDataSungguhan();

        foreach ($this->artikel() as $i => $a) {
            News::updateOrCreate(
                ['slug' => self::AWALAN.$a['slug']],
                [
                    'title' => $a['title'],
                    'category' => $a['category'],
                    'excerpt' => $a['excerpt'],
                    'content' => $a['content'],
                    'thumbnail' => $a['thumbnail'],
                    'author' => 'Humas UPBU APT Pranoto',
                    'is_featured' => $a['featured'] ?? false,
                    'status' => 'published',
                    'views_count' => $a['views'],
                    'published_at' => now()->subDays($i * 3 + 1),
                ],
            );
        }

        $this->command?->info('Berita contoh dimuat. Slugnya berawalan "'.self::AWALAN.'".');
    }

    /**
     * Tolak menyemai basis data yang berisi data sungguhan.
     *
     * Penjaga ini menyalin yang ada di `DatabaseSeeder` dengan sengaja:
     * memanggil seeder lewat `--class=` tidak pernah melewati `run()` di sana,
     * sehingga tanpa salinan ini berita karangan bisa mendarat di portal resmi.
     */
    private function tolakBasisDataSungguhan(): void
    {
        $basisData = DB::connection()->getDatabaseName();

        if (! in_array($basisData, config('legacy.protected_databases', []), true)) {
            return;
        }

        if (env('SEED_DEMO_NEWS') === true || env('SEED_DEMO_NEWS') === 'true') {
            $this->command?->warn(
                "Penjaga dilewati lewat SEED_DEMO_NEWS pada basis data '{$basisData}'. ".
                'Pastikan ini salinan pengembangan, bukan portal yang dibaca publik.'
            );

            return;
        }

        throw new RuntimeException(
            "Penyemaian dibatalkan: '{$basisData}' terdaftar sebagai basis data berisi data sungguhan. ".
            'Berita di seeder ini karangan seluruhnya dan tidak boleh terbit di portal resmi. '.
            'Tunjuk DB_DATABASE ke basis data pengembangan, atau setel SEED_DEMO_NEWS=true '.
            'bila Anda yakin basis data ini memang salinan pengembangan.'
        );
    }

    /** @return array<int, array<string, mixed>> */
    private function artikel(): array
    {
        return [
            [
                'slug' => 'gerbang-udara-kalimantan-timur',
                'title' => 'Menyiapkan Gerbang Udara Kalimantan Timur untuk Satu Dekade ke Depan',
                'category' => 'Berita Utama',
                'featured' => true,
                'views' => 2843,
                'thumbnail' => 'https://images.unsplash.com/photo-1542296332-2e4473faf563?auto=format&fit=crop&w=1600&q=80',
                'excerpt' => 'Peran Bandara APT Pranoto berubah lebih cepat daripada yang diperkirakan siapa pun sepuluh tahun lalu. Tulisan ini menelusuri apa yang sedang disiapkan terminal, sisi udara, dan layanan darat untuk menghadapinya.',
                'content' => $this->artikelSatu(),
            ],
            [
                'slug' => 'ruang-tunggu-baru-jalur-ramah-disabilitas',
                'title' => 'Ruang Tunggu Baru dan Jalur Ramah Disabilitas Mulai Dipakai Penumpang',
                'category' => 'Fasilitas',
                'views' => 1976,
                'thumbnail' => 'https://images.unsplash.com/photo-1587560699334-cc4ff634909a?auto=format&fit=crop&w=1600&q=80',
                'excerpt' => 'Perluasan ruang tunggu keberangkatan membawa lebih dari sekadar tambahan kursi: jalur pemandu, ruang laktasi, dan titik pengisian daya kini tersebar merata di seluruh sisi terminal.',
                'content' => $this->artikelDua(),
            ],
            [
                'slug' => 'panduan-bagasi-kabin',
                'title' => 'Panduan Lengkap Bagasi Kabin: Apa yang Boleh Dibawa dan Apa yang Harus Ditinggal',
                'category' => 'Layanan',
                'views' => 3412,
                'thumbnail' => 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=1600&q=80',
                'excerpt' => 'Sebagian besar antrean panjang di titik pemeriksaan berawal dari satu hal sederhana: barang yang seharusnya masuk bagasi tercatat, tetapi terlanjur dimasukkan ke tas kabin.',
                'content' => $this->artikelTiga(),
            ],
            [
                'slug' => 'menghadapi-musim-hujan',
                'title' => 'Bagaimana Bandara Menyiapkan Diri Menghadapi Musim Hujan',
                'category' => 'Operasional',
                'views' => 1288,
                'thumbnail' => 'https://images.unsplash.com/photo-1474302770737-173ee21bab63?auto=format&fit=crop&w=1600&q=80',
                'excerpt' => 'Hujan deras jarang membatalkan penerbangan seorang diri. Yang menentukan justru jarak pandang, kondisi permukaan landasan, dan rantai keputusan yang berjalan jauh sebelum pesawat mendekat.',
                'content' => $this->artikelEmpat(),
            ],
            [
                'slug' => 'penyesuaian-jam-layanan-loket',
                'title' => 'Penyesuaian Jam Layanan Loket Selama Periode Perawatan Terminal',
                'category' => 'Pengumuman',
                'views' => 864,
                'thumbnail' => 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1600&q=80',
                'excerpt' => 'Beberapa titik layanan di area keberangkatan akan berpindah sementara selama pekerjaan perawatan berlangsung. Berikut yang perlu diketahui pengguna jasa sebelum berangkat ke bandara.',
                'content' => $this->artikelLima(),
            ],
            [
                'slug' => 'sepekan-aktivitas-terminal',
                'title' => 'Sepekan Aktivitas Terminal: Dari Pameran UMKM sampai Simulasi Evakuasi',
                'category' => 'Kegiatan',
                'views' => 1105,
                'thumbnail' => 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1600&q=80',
                'excerpt' => 'Terminal bandara bukan hanya ruang transit. Sepanjang pekan lalu, ruang publiknya dipakai untuk pameran produk lokal, pelatihan petugas, hingga latihan penanganan keadaan darurat.',
                'content' => $this->artikelEnam(),
            ],
        ];
    }

    /* ================================================================== */

    private function artikelSatu(): string
    {
        return <<<'HTML'
<p>Sepuluh tahun lalu, sebagian besar percakapan tentang penerbangan di Kalimantan Timur berhenti pada satu pertanyaan: berapa banyak penerbangan yang tersedia hari itu. Hari ini pertanyaannya bergeser. Bukan lagi soal ada atau tidak, melainkan soal seberapa siap sebuah gerbang udara menampung pergerakan yang tumbuh lebih cepat daripada bangunan yang menaunginya.</p>

<p>Bandar Udara APT Pranoto Samarinda berada tepat di tengah pergeseran itu. Letaknya menjadikannya pintu masuk bagi wilayah yang sedang berubah dengan kecepatan tidak biasa, dan setiap perubahan di daratan cepat atau lambat terbaca di terminal — pada antrean pemeriksaan, pada jam sibuk yang bergeser, pada jenis barang yang dibawa penumpang.</p>

<h2>Terminal yang Membaca Kebiasaan Penumpangnya</h2>

<p>Perencanaan terminal modern jarang dimulai dari gambar arsitektur. Ia dimulai dari pengamatan: di titik mana orang menumpuk, berapa lama mereka berdiri, ke arah mana mereka menoleh saat kebingungan. Data semacam itu tidak selalu berbentuk angka; sebagian besar berupa catatan petugas lapangan yang setiap hari melihat pola yang sama berulang.</p>

<p>Dari pengamatan itulah lahir keputusan-keputusan yang tampak kecil tetapi terasa besar: memindahkan meja informasi beberapa meter, melebarkan mulut antrean, menambah tempat duduk di sisi yang selama ini terlewat karena letaknya agak tersembunyi.</p>

<blockquote>Perbaikan yang paling terasa bagi penumpang hampir selalu perbaikan yang paling tidak terlihat di foto: jarak berjalan yang berkurang, papan penunjuk yang terbaca dari jauh, antrean yang mengalir tanpa perlu ditegur.</blockquote>

<h3>Titik-titik yang paling sering menjadi hambatan</h3>

<ul>
  <li>Peralihan dari area penurunan penumpang ke pintu masuk terminal, terutama saat hujan</li>
  <li>Antrean pemeriksaan pertama, yang panjangnya sangat dipengaruhi kesiapan penumpang</li>
  <li>Perpindahan dari ruang tunggu ke ruang tunggu gate, yang kerap menumpuk di menit-menit akhir</li>
  <li>Area pengambilan bagasi, tempat kepadatan datang bergelombang mengikuti jadwal kedatangan</li>
</ul>

<h2>Sisi Udara: Pekerjaan yang Jarang Terlihat</h2>

<p>Sebagian besar pekerjaan yang menentukan kelancaran penerbangan justru berlangsung di area yang tidak pernah dilalui penumpang. Perawatan permukaan landasan, pemeriksaan marka, pemangkasan vegetasi di sekitar area pendekatan, hingga pengendalian satwa liar — semuanya berjalan menurut jadwal yang disusun jauh sebelum musim tertentu tiba.</p>

<p>Pekerjaan semacam ini punya sifat khas: bila berhasil, tidak ada yang menyadarinya. Keberhasilannya diukur dari ketiadaan peristiwa, bukan dari peristiwa yang terjadi. Itulah sebabnya laporan kegiatan sisi udara nyaris tidak pernah menjadi berita, padahal di situlah sebagian besar keselamatan penerbangan ditentukan.</p>

<h3>Tiga lapis pemeriksaan yang berjalan setiap hari</h3>

<ol>
  <li><strong>Pemeriksaan rutin harian</strong> — menyisir permukaan landasan dan taxiway untuk memastikan tidak ada benda asing yang tertinggal.</li>
  <li><strong>Pemeriksaan berkala</strong> — menilai kondisi marka, lampu, dan drainase pada rentang waktu yang lebih panjang.</li>
  <li><strong>Pemeriksaan menjelang perubahan musim</strong> — menyiapkan sistem yang paling terbebani saat curah hujan meningkat.</li>
</ol>

<h2>Layanan Darat dan Rantai yang Saling Terkait</h2>

<p>Satu penerbangan yang tertunda jarang tertunda karena satu sebab tunggal. Umumnya ia hasil rantai: pesawat datang terlambat, waktu bongkar muat memanjang, jadwal pembersihan bergeser, penumpang berikutnya terlambat naik, dan slot keberangkatan terlewat. Setiap mata rantai punya penanggung jawab berbeda, dan itulah yang membuat penanganannya menuntut koordinasi, bukan sekadar kecepatan.</p>

<p>Karena itu pembenahan yang berarti biasanya menyentuh titik temu antarpihak — bukan menambah kecepatan satu pihak saja. Menyederhanakan serah terima informasi antara maskapai, petugas darat, dan pengelola terminal kerap memberi hasil lebih besar daripada menambah peralatan.</p>

<h2>Digitalisasi yang Menjawab Pertanyaan Sebenarnya</h2>

<p>Layar informasi penerbangan, kanal daring, dan aplikasi mobile semuanya menjawab satu pertanyaan yang sama: <em>apa yang terjadi dengan penerbangan saya sekarang?</em> Semakin cepat pertanyaan itu terjawab, semakin sedikit orang yang perlu bertanya ke meja informasi, dan semakin lengang antrean di sana.</p>

<p>Itu sebabnya perbaikan kanal informasi bukan proyek kosmetik. Ia memindahkan beban dari petugas ke sistem, dan mengembalikan waktu petugas untuk hal yang memang menuntut manusia: menolong penumpang lanjut usia, mendampingi penumpang berkebutuhan khusus, menangani keadaan yang tidak masuk kategori mana pun.</p>

<h2>Yang Diukur, Bukan yang Diperkirakan</h2>

<p>Setiap rencana pengembangan menghadapi godaan yang sama: mengejar apa yang mudah ditunjukkan, bukan apa yang benar-benar dirasakan. Ruang tunggu yang megah mudah difoto; jalur pemandu untuk penumpang tunanetra tidak. Padahal keduanya bagian dari pelayanan yang sama.</p>

<p>Ukuran yang jujur biasanya sederhana: berapa lama seseorang berdiri dalam antrean, berapa jauh ia berjalan dari pintu masuk sampai ruang tunggu, berapa kali ia harus bertanya arah. Angka-angka itu tidak mengesankan di atas kertas, tetapi merekalah yang menentukan apakah seseorang pulang dengan kesan baik.</p>

<p>Informasi jadwal penerbangan terbaru dapat dilihat melalui <a href="/flights">halaman jadwal penerbangan</a>, sementara layanan dan fasilitas terminal tersedia pada <a href="/layanan">halaman layanan</a>.</p>
HTML;
    }

    private function artikelDua(): string
    {
        return <<<'HTML'
<p>Perluasan ruang tunggu keberangkatan biasanya diberitakan dengan satu angka: berapa kursi yang bertambah. Angka itu benar, tetapi ia melewatkan bagian yang paling terasa bagi orang yang benar-benar menunggu di sana — bagaimana ruang itu bekerja ketika penuh.</p>

<p>Ruang tunggu yang baik bukan ruang tunggu yang luas. Ia ruang yang memungkinkan seseorang duduk, meletakkan tas, mengisi daya ponsel, mendengar pengumuman dengan jelas, dan berdiri menuju gate tanpa harus melangkahi orang lain. Empat hal itu jarang tercapai bersamaan bila penataannya hanya mengejar jumlah kursi.</p>

<h2>Kursi yang Menyisakan Ruang untuk Barang</h2>

<p>Sebagian besar penumpang datang membawa setidaknya satu tas kabin. Bila jarak antarbaris kursi terlalu rapat, tas itu akan berakhir di lantai jalur lalu lintas, dan ruang yang tampak lapang di gambar rancangan berubah menjadi jalur rintangan pada kenyataannya.</p>

<p>Penataan yang lebih longgar dengan jumlah kursi sedikit lebih rendah pada akhirnya menampung lebih banyak orang secara nyaman, karena setiap kursi benar-benar terpakai dan jalur di antaranya tetap dapat dilalui.</p>

<blockquote>Kapasitas sebuah ruang tunggu bukan berapa banyak kursi yang ada, melainkan berapa banyak kursi yang masih nyaman diduduki ketika ruangan sedang penuh-penuhnya.</blockquote>

<h2>Titik Pengisian Daya yang Tersebar, Bukan Terpusat</h2>

<p>Satu meja pengisian daya di tengah ruangan akan selalu menarik kerumunan, dan kerumunan itu menghalangi jalur. Menyebarkan titik daya ke banyak lokasi kecil di dekat kursi menghilangkan masalah tersebut sekaligus membuat penumpang tidak perlu meninggalkan barangnya untuk mengisi daya.</p>

<h3>Yang berubah bagi penumpang</h3>

<ul>
  <li>Titik pengisian daya berada dalam jangkauan tangan dari sebagian besar kursi</li>
  <li>Tidak perlu berdiri atau berpindah tempat hanya untuk mengisi baterai</li>
  <li>Barang bawaan tetap berada di dekat pemiliknya</li>
  <li>Jalur lalu lintas ruang tunggu tidak lagi terpotong kerumunan</li>
</ul>

<h2>Jalur Pemandu dan Aksesibilitas</h2>

<p>Jalur pemandu — ubin bertekstur yang dapat dirasakan melalui alas kaki atau tongkat — adalah salah satu fasilitas yang paling sering dipasang setengah jalan. Ia terpasang di lobi, lalu terputus di tempat yang justru paling membingungkan: persimpangan, pintu, dan area peralihan antarruang.</p>

<p>Jalur yang benar-benar berguna harus menyambung dari titik turun penumpang sampai ke ruang tunggu tanpa terputus, dengan penanda yang berbeda pada titik keputusan. Tanpa kesinambungan itu, jalur pemandu berubah menjadi hiasan lantai.</p>

<h3>Fasilitas pendukung yang menyertainya</h3>

<ol>
  <li>Layanan kursi roda yang dapat diminta sebelum tiba di bandara</li>
  <li>Toilet dengan pegangan dan ruang gerak untuk pengguna kursi roda</li>
  <li>Ruang laktasi tertutup dengan tempat duduk dan sumber daya listrik</li>
  <li>Area menunggu prioritas yang dekat dengan pintu masuk gate</li>
</ol>

<h2>Ruang Bermain Anak yang Bukan Sekadar Sudut Kosong</h2>

<p>Anak-anak yang menunggu terlalu lama akan bergerak, dan bila tidak ada tempat khusus untuk itu, mereka bergerak di jalur lalu lintas. Menyediakan area bermain berarti memberi ruang bagi perilaku yang memang akan terjadi, alih-alih melarangnya.</p>

<p>Yang membedakan area bermain yang berfungsi dari yang sekadar ada adalah letaknya: cukup terbuka agar orang tua dapat mengawasi sambil duduk, tetapi cukup terpisah agar suaranya tidak memenuhi seluruh ruang tunggu.</p>

<h2>Papan Penunjuk dan Bahasa yang Dipakai</h2>

<p>Penunjuk arah paling sering gagal bukan karena salah, melainkan karena terlalu banyak. Papan yang memuat delapan tujuan sekaligus menuntut pembacanya berhenti dan mencari, dan orang yang berhenti di tengah jalur akan menghambat yang di belakangnya.</p>

<p>Penyederhanaan penunjuk arah berarti memutuskan apa yang <em>tidak</em> perlu ditampilkan di setiap titik. Di dekat pintu masuk, penumpang hanya perlu tahu satu hal: ke mana arah pemeriksaan. Sisanya bisa menunggu.</p>

<p>Rincian fasilitas terminal selengkapnya tersedia di <a href="/fasilitas">halaman fasilitas</a>.</p>
HTML;
    }

    private function artikelTiga(): string
    {
        return <<<'HTML'
<p>Antrean panjang di titik pemeriksaan keamanan hampir selalu punya sebab yang sama, dan sebab itu bukan jumlah petugas. Ia adalah tas yang harus dibuka ulang — karena isinya tidak seharusnya berada di kabin, atau karena letaknya membuat mesin pemindai tidak dapat membacanya dengan jelas.</p>

<p>Satu tas yang harus diperiksa ulang menahan seluruh antrean di belakangnya. Karena itu kesiapan penumpang, bukan kecepatan petugas, yang paling menentukan lancar tidaknya proses ini.</p>

<h2>Prinsip Dasar yang Menjelaskan Hampir Semuanya</h2>

<p>Aturan bagasi kabin terdengar rumit karena biasanya disampaikan sebagai daftar panjang. Padahal sebagian besar ketentuannya dapat diringkas menjadi tiga pertanyaan sederhana yang bisa diajukan sendiri saat berkemas.</p>

<ol>
  <li><strong>Apakah benda ini dapat melukai?</strong> Benda tajam, tumpul berat, dan segala yang berujung runcing hampir selalu harus masuk bagasi tercatat.</li>
  <li><strong>Apakah benda ini dapat terbakar atau meledak?</strong> Cairan mudah terbakar, gas bertekanan, korek api gas, dan sejenisnya punya ketentuan tersendiri yang ketat.</li>
  <li><strong>Apakah benda ini menyimpan energi?</strong> Baterai cadangan dan perangkat berdaya besar diperlakukan berbeda dari barang elektronik biasa.</li>
</ol>

<blockquote>Bila sebuah benda membuat Anda ragu saat berkemas, kemungkinan besar benda itu juga akan membuat petugas pemeriksaan berhenti. Rasa ragu itu sendiri sudah merupakan jawaban.</blockquote>

<h2>Cairan: Bagian yang Paling Sering Keliru</h2>

<p>Ketentuan cairan kerap disalahpahami sebagai larangan membawa cairan sama sekali. Yang sebenarnya diatur adalah ukuran wadah dan cara membawanya, bukan keberadaan cairannya.</p>

<h3>Yang termasuk kategori cairan</h3>

<ul>
  <li>Air minum, minuman kemasan, dan sirup</li>
  <li>Krim, losion, dan minyak</li>
  <li>Parfum dan penyegar bertekanan</li>
  <li>Pasta gigi, gel rambut, dan sejenisnya</li>
  <li>Makanan bertekstur lunak seperti selai dan saus</li>
</ul>

<p>Perhatikan bahwa beberapa di antaranya tidak terasa seperti cairan dalam percakapan sehari-hari. Pasta gigi dan selai adalah dua barang yang paling sering menahan antrean justru karena pemiliknya tidak menganggapnya cairan.</p>

<h2>Baterai dan Perangkat Elektronik</h2>

<p>Baterai cadangan — sering disebut <em>power bank</em> — punya kedudukan khusus. Ia tidak boleh masuk bagasi tercatat, dan justru harus dibawa di kabin, kebalikan dari kebanyakan barang lain. Alasannya sederhana: bila terjadi gangguan pada baterai, keadaan itu harus dapat segera diketahui dan ditangani, dan itu hanya mungkin di kabin.</p>

<h3>Langkah yang mempercepat pemeriksaan</h3>

<ul>
  <li>Letakkan laptop dan tablet di lapisan paling atas tas, atau di kantong terpisah</li>
  <li>Kumpulkan seluruh kabel dalam satu kantong kecil agar tidak tampak seperti gumpalan pada pemindai</li>
  <li>Simpan baterai cadangan di tempat yang mudah dikeluarkan bila diminta</li>
  <li>Hindari menumpuk barang logam padat di satu titik yang sama</li>
</ul>

<h2>Barang yang Sering Terlupakan</h2>

<p>Beberapa benda lolos dari perhatian karena terasa terlalu biasa: gunting kuku di kantong kecil tas, obeng lipat pada gantungan kunci, korek api di saku jaket yang dimasukkan ke tas kabin di menit terakhir. Semuanya sah dibawa dalam perjalanan, hanya tidak semuanya sah berada di kabin.</p>

<p>Memeriksa kantong-kantong kecil sebelum berangkat memakan waktu kurang dari satu menit, dan hampir selalu menghemat lebih banyak waktu daripada itu di titik pemeriksaan.</p>

<h2>Bila Ragu, Tanyakan Sebelum Berangkat</h2>

<p>Ketentuan dapat berbeda menurut maskapai, jenis penerbangan, dan tujuan. Menanyakannya sebelum tiba di bandara jauh lebih murah daripada menemukan jawabannya di depan mesin pemindai, ketika satu-satunya pilihan yang tersisa adalah meninggalkan barang tersebut.</p>

<p>Pertanyaan seputar layanan penumpang dapat disampaikan melalui <a href="/faq">halaman tanya jawab</a> atau kanal pengaduan pada <a href="/pengaduan">halaman pengaduan</a>.</p>
HTML;
    }

    private function artikelEmpat(): string
    {
        return <<<'HTML'
<p>Ada anggapan yang bertahan lama bahwa hujan deras dengan sendirinya membatalkan penerbangan. Kenyataannya lebih rumit dan, dalam banyak hal, lebih menenangkan: hujan hanyalah satu dari beberapa faktor, dan jarang menjadi faktor penentu bila berdiri sendiri.</p>

<p>Yang benar-benar diperhitungkan adalah jarak pandang, arah dan kekuatan angin, kondisi permukaan landasan, serta keberadaan cuaca berbahaya seperti awan konvektif di jalur pendekatan. Hujan memengaruhi sebagian dari faktor-faktor itu, tetapi tidak semuanya, dan tidak selalu.</p>

<h2>Jarak Pandang: Angka yang Paling Menentukan</h2>

<p>Setiap prosedur pendaratan punya batas jarak pandang minimum. Selama jarak pandang berada di atas batas itu, penerbangan dapat berlanjut meski hujan turun cukup deras. Sebaliknya, kabut tipis tanpa setetes hujan pun dapat menahan pesawat di udara bila jarak pandangnya turun di bawah ambang.</p>

<p>Inilah sebabnya penumpang kadang melihat pemandangan yang terasa janggal: langit tampak cerah, tetapi penerbangan tertunda; atau hujan mengguyur deras, tetapi pesawat mendarat tepat waktu.</p>

<blockquote>Cuaca yang terlihat dari jendela ruang tunggu bukan cuaca yang dipakai mengambil keputusan. Yang dipakai adalah kondisi di jalur pendekatan dan di permukaan landasan, yang keduanya bisa sangat berbeda.</blockquote>

<h2>Permukaan Landasan dan Air yang Menggenang</h2>

<p>Landasan yang basah berbeda dari landasan yang tergenang. Perbedaannya bukan sekadar tingkatan, melainkan jenis persoalan. Permukaan basah mengurangi daya cengkeram roda; genangan menimbulkan risiko yang berbeda lagi, karena lapisan air dapat memisahkan roda dari permukaan.</p>

<p>Karena itu sistem drainase termasuk bagian infrastruktur yang paling diperhatikan menjelang musim hujan — bukan karena ia canggih, melainkan karena kegagalannya berdampak langsung pada keselamatan.</p>

<h3>Pekerjaan persiapan yang berjalan sebelum musim hujan</h3>

<ol>
  <li>Pembersihan saluran drainase di sepanjang sisi landasan dan taxiway</li>
  <li>Pemeriksaan kemiringan permukaan agar air mengalir ke arah yang benar</li>
  <li>Penilaian ulang kondisi marka, yang daya pantulnya menurun saat basah</li>
  <li>Pemeriksaan lampu penerangan sisi udara, yang paling dibutuhkan justru saat jarak pandang menurun</li>
</ol>

<h2>Rantai Keputusan yang Berjalan Jauh Sebelumnya</h2>

<p>Keputusan menunda atau mengalihkan penerbangan tidak diambil pada menit terakhir. Ia hasil rangkaian pertimbangan yang dimulai berjam-jam sebelumnya, ketika prakiraan cuaca menunjukkan kemungkinan gangguan pada rentang waktu tertentu.</p>

<p>Pada tahap itu, pilihan yang tersedia masih banyak: menggeser jadwal, mengatur ulang urutan keberangkatan, atau menyiapkan bandara alternatif. Semakin dekat ke waktu keberangkatan, semakin sedikit pilihan yang tersisa — dan itulah sebabnya keputusan awal yang tampak berlebihan sering kali justru yang paling menghemat waktu semua orang.</p>

<h2>Apa yang Sebaiknya Dilakukan Penumpang</h2>

<ul>
  <li>Pantau status penerbangan sejak sebelum berangkat ke bandara, bukan setelah tiba</li>
  <li>Beri jeda lebih longgar bila memiliki penerbangan lanjutan pada hari yang sama</li>
  <li>Simpan nomor layanan maskapai, karena perubahan jadwal ditangani oleh maskapai</li>
  <li>Hindari menyimpan obat-obatan penting di bagasi tercatat saat cuaca sedang tidak menentu</li>
</ul>

<h2>Ketika Penundaan Tetap Terjadi</h2>

<p>Penundaan yang disebabkan cuaca berada di luar kendali siapa pun di bandara maupun di maskapai. Yang berada dalam kendali adalah bagaimana informasinya disampaikan: seberapa cepat, seberapa jelas, dan seberapa sering diperbarui.</p>

<p>Informasi yang diperbarui setiap tiga puluh menit — meski isinya "belum ada perubahan" — jauh lebih menenangkan daripada satu pengumuman panjang yang datang setelah dua jam sunyi.</p>

<p>Status penerbangan terkini dapat dipantau pada <a href="/flights">halaman jadwal penerbangan</a>.</p>
HTML;
    }

    private function artikelLima(): string
    {
        return <<<'HTML'
<p>Pekerjaan perawatan pada bangunan yang tetap beroperasi selalu menuntut kompromi. Area yang dikerjakan harus ditutup, sementara layanan yang biasanya berada di sana tetap harus berjalan. Jalan tengahnya adalah pemindahan sementara — dan itulah yang akan terjadi pada beberapa titik layanan di area keberangkatan.</p>

<p>Pemberitahuan ini disusun untuk satu tujuan: agar tidak ada pengguna jasa yang tiba di bandara lalu menemukan meja layanan tidak berada di tempat yang biasa.</p>

<h2>Titik Layanan yang Berpindah Sementara</h2>

<p>Perpindahan hanya menyangkut lokasi fisik. Jenis layanan, persyaratan dokumen, maupun petugas yang menanganinya tidak berubah.</p>

<ul>
  <li>Meja informasi utama bergeser ke sisi yang berseberangan, tetap di area yang sama</li>
  <li>Layanan bantuan penumpang berkebutuhan khusus dipusatkan lebih dekat ke pintu masuk</li>
  <li>Titik penitipan barang sementara berpindah ke sisi luar area keberangkatan</li>
</ul>

<blockquote>Selama periode ini, papan penunjuk sementara dipasang pada setiap titik peralihan. Bila ragu, petugas berseragam di area keberangkatan dapat menunjukkan arah yang benar.</blockquote>

<h2>Penyesuaian Jam Layanan</h2>

<p>Sebagian pekerjaan hanya dapat dilakukan di luar jam operasional tersibuk. Karena itu beberapa titik layanan akan buka lebih siang atau tutup lebih awal daripada biasanya pada hari-hari tertentu.</p>

<h3>Yang perlu diperhatikan</h3>

<ol>
  <li>Datang lebih awal daripada kebiasaan Anda, terutama pada penerbangan pagi</li>
  <li>Selesaikan urusan yang memerlukan meja layanan sebelum menuju area pemeriksaan</li>
  <li>Bila memerlukan bantuan khusus, sampaikan permintaan sebelum hari keberangkatan</li>
</ol>

<h2>Area yang Tetap Berjalan Normal</h2>

<p>Perlu ditegaskan bahwa pekerjaan ini tidak menyentuh proses inti keberangkatan. Pelaporan penumpang, pemeriksaan keamanan, dan proses menuju ruang tunggu berjalan seperti biasa, pada lokasi yang sama, dengan jam yang sama.</p>

<p>Demikian pula area kedatangan dan pengambilan bagasi, yang berada di sisi bangunan yang berbeda dan tidak terpengaruh sama sekali.</p>

<h2>Mengapa Dikerjakan Sekarang</h2>

<p>Perawatan yang ditunda hampir selalu berubah menjadi perbaikan, dan perbaikan menuntut penutupan yang jauh lebih lama daripada perawatan. Mengerjakannya pada periode dengan kepadatan lebih rendah adalah pilihan yang paling sedikit mengganggu, meski tetap menimbulkan ketidaknyamanan.</p>

<h2>Menyampaikan Kendala</h2>

<p>Bila selama periode ini Anda menemui kesulitan — penunjuk arah yang membingungkan, layanan yang sulit ditemukan, atau kebutuhan bantuan yang tidak terlayani — sampaikan melalui kanal resmi agar dapat ditangani pada hari yang sama.</p>

<p>Saluran pengaduan tersedia pada <a href="/pengaduan">halaman pengaduan</a>, dan pertanyaan umum dapat dilihat lebih dahulu di <a href="/faq">halaman tanya jawab</a>.</p>
HTML;
    }

    private function artikelEnam(): string
    {
        return <<<'HTML'
<p>Terminal bandara dirancang sebagai ruang transit, tetapi jarang berfungsi hanya sebagai itu. Sepanjang pekan lalu, ruang publiknya dipakai untuk berbagai kegiatan yang sebagian besar berlangsung di sela-sela arus penumpang, tanpa mengganggu proses keberangkatan maupun kedatangan.</p>

<p>Rangkaian kegiatan ini menunjukkan sesuatu yang sering luput: bandara adalah salah satu ruang publik yang paling padat dilalui orang dari berbagai latar, dan karena itu menjadi tempat yang efektif untuk memperkenalkan apa pun kepada khalayak luas.</p>

<h2>Pameran Produk Usaha Mikro dan Kecil</h2>

<p>Area dekat pintu masuk keberangkatan dipakai selama beberapa hari untuk memamerkan produk pelaku usaha lokal. Penempatannya dipilih dengan pertimbangan yang jelas: cukup terlihat bagi orang yang lewat, tetapi tidak berada di jalur utama yang harus tetap lengang.</p>

<p>Bagi pelaku usaha, ruang seperti ini punya nilai yang sulit ditandingi. Pengunjung yang lewat bukan pengunjung yang datang untuk berbelanja, sehingga perhatian yang berhasil diraih benar-benar berasal dari produknya sendiri.</p>

<h3>Yang paling menarik perhatian pengunjung</h3>

<ul>
  <li>Produk makanan kering yang mudah dibawa dalam perjalanan</li>
  <li>Kerajinan berukuran kecil yang aman masuk bagasi kabin</li>
  <li>Kemasan yang mencantumkan asal daerah dengan jelas</li>
</ul>

<h2>Pelatihan Pelayanan bagi Petugas Lini Depan</h2>

<p>Di ruang yang berbeda, pelatihan pelayanan berlangsung bagi petugas yang setiap hari berhadapan langsung dengan pengguna jasa. Materinya berfokus pada hal yang tidak dapat diselesaikan prosedur: menghadapi penumpang yang panik, menjelaskan penundaan tanpa menjanjikan apa yang belum pasti, dan mengenali penumpang yang membutuhkan bantuan tanpa harus diminta.</p>

<blockquote>Sebagian besar keluhan pelayanan tidak berakar pada apa yang dilakukan petugas, melainkan pada bagaimana keadaan dijelaskan kepada orang yang sedang cemas.</blockquote>

<h2>Simulasi Penanganan Keadaan Darurat</h2>

<p>Menjelang akhir pekan, latihan penanganan keadaan darurat digelar di area yang telah ditentukan. Latihan semacam ini dijalankan berkala dan melibatkan beberapa unit sekaligus, karena keadaan darurat sungguhan tidak pernah ditangani satu unit saja.</p>

<h3>Tahapan yang dilatih</h3>

<ol>
  <li>Pengenalan keadaan dan penyampaian informasi awal antarunit</li>
  <li>Pengarahan pengunjung menuju titik berkumpul</li>
  <li>Penanganan orang yang memerlukan bantuan bergerak</li>
  <li>Pemeriksaan ulang area untuk memastikan tidak ada yang tertinggal</li>
</ol>

<p>Bagian yang paling sering menjadi catatan bukan kecepatan, melainkan kejelasan arahan. Dalam keadaan sungguhan, sebagian orang tidak bergerak bukan karena tidak mau, melainkan karena tidak yakin ke arah mana harus melangkah.</p>

<h2>Kunjungan Rombongan Pelajar</h2>

<p>Pekan itu ditutup dengan kunjungan rombongan pelajar yang diajak menelusuri alur keberangkatan dari sisi yang biasanya tidak terlihat. Bagi sebagian dari mereka, ini kesempatan pertama memahami bahwa satu penerbangan melibatkan begitu banyak pekerjaan yang tidak pernah tampak dari kursi penumpang.</p>

<p>Pertanyaan yang paling sering muncul, seperti biasa, bukan tentang pesawat — melainkan tentang bagasi: ke mana ia pergi setelah diserahkan, dan bagaimana ia bisa kembali ke pemiliknya di kota yang berbeda.</p>

<h2>Ruang Publik yang Bekerja Dua Arah</h2>

<p>Semua kegiatan di atas punya satu kesamaan: tidak satu pun menambah hambatan bagi penumpang yang sedang terburu-buru. Itulah syarat yang menentukan apakah sebuah kegiatan layak digelar di terminal, dan syarat itu tidak bisa ditawar.</p>

<p>Agenda kegiatan berikutnya dapat dilihat pada <a href="/news">halaman berita</a>.</p>
HTML;
    }
}
