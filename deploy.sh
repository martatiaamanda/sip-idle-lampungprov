#!/usr/bin/env bash
# ==============================================================================
# Script Otomatisasi Deployment SIP-IDLE PROV ke Vercel / GitHub
# ==============================================================================

set -e

echo ""
echo "======================================================================"
echo " 🏛️  SIP-IDLE PROV - Deployment Helper ke Vercel"
echo " Pemerintah Provinsi Sumatera Barat - BPKAD"
echo "======================================================================"
echo ""

# Periksa apakah di dalam direktori git
if [ ! -d ".git" ]; then
  echo "📦 Inisialisasi Git repository..."
  git init
  git add .
  git commit -m "feat: Inisialisasi SIP-IDLE PROV"
fi

echo "Pilih opsi deployment yang ingin dijalankan:"
echo "1) Hubungkan & Push ke GitHub (Lalu deploy via Vercel Dashboard - Rekomendasi)"
echo "2) Deploy langsung dengan Vercel CLI"
echo "3) Jalankan Local Web Server (http://localhost:8080)"
echo "4) Keluar"
echo ""

read -p "Masukkan pilihan (1-4): " OPTION

case $OPTION in
  1)
    echo ""
    echo "📋 Langkah 1: Buat repository baru di https://github.com/new"
    read -p "Masukkan URL Repository GitHub Anda (contoh: https://github.com/username/sip-idle-pemprov.git): " REPO_URL
    if [ -n "$REPO_URL" ]; then
      git remote remove origin 2>/dev/null || true
      git remote add origin "$REPO_URL"
      git branch -M main
      echo "🚀 Mengirim kode ke GitHub..."
      git push -u origin main
      echo ""
      echo "✅ Berhasil dikirim ke GitHub!"
      echo "👉 Sekarang buka https://vercel.com/new, pilih repository '$REPO_URL', dan klik 'Deploy'!"
    else
      echo "URL tidak boleh kosong."
    fi
    ;;
  2)
    echo ""
    echo "🚀 Memeriksa Vercel CLI..."
    if command -v vercel &> /dev/null; then
      vercel
    elif command -v npx &> /dev/null; then
      npx vercel
    else
      echo "⚠️ Vercel CLI belum terinstall. Install dengan: npm install -g vercel"
    fi
    ;;
  3)
    echo ""
    echo "🌐 Menjalankan Local Web Server di http://localhost:8080 ..."
    python3 -m http.server 8080
    ;;
  4)
    echo "Keluar."
    exit 0
    ;;
  *)
    echo "Pilihan tidak valid."
    ;;
esac
