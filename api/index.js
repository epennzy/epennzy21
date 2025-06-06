// Import modul yang diperlukan
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');

// Inisialisasi aplikasi
const app = express();

// Path ke file data
// Karena file ini sekarang ada di dalam /api, kita perlu keluar satu level untuk mencari file lain
const ORDERS_FILE_PATH = path.join(process.cwd(), 'server-orders.json');
const PRODUCTS_FILE_PATH = path.join(process.cwd(), 'public', 'products.json');


// Middleware
app.use(cors()); // Sangat penting untuk mengizinkan Vercel frontend memanggil API ini
app.use(express.json());
// Kita tidak perlu menyajikan folder public secara manual lagi, Vercel akan menanganinya

// --- Fungsi Helper ---
function readJsonFile(filePath, defaultData = []) { /* ... (fungsi ini tetap sama) ... */ }
function writeJsonFile(filePath, data) { /* ... (fungsi ini tetap sama) ... */ }

// --- Middleware Admin ---
function authenticateAdminToken(req, res, next) { /* ... (fungsi ini tetap sama) ... */ }

// --- API Endpoints Publik ---
app.get('/api/products', (req, res) => {
    const products = readJsonFile(PRODUCTS_FILE_PATH);
    res.json(products);
});

app.post('/api/orders/submit', (req, res) => {
    // ... (Logika endpoint ini tetap sama) ...
});

// --- API Endpoints Admin ---
app.post('/api/admin/login', (req, res) => {
    // ... (Logika endpoint ini tetap sama) ...
});

app.get('/api/admin/orders', authenticateAdminToken, (req, res) => {
    // ... (Logika endpoint ini tetap sama) ...
});

app.put('/api/admin/orders/:orderId/status', authenticateAdminToken, (req, res) => {
    // ... (Logika endpoint ini tetap sama) ...
});

app.post('/api/admin/products', authenticateAdminToken, (req, res) => {
    const newProduct = req.body;
    let products = readJsonFile(PRODUCTS_FILE_PATH);
    products.push(newProduct);
    writeJsonFile(PRODUCTS_FILE_PATH, products);
    res.status(201).json({ message: "Produk baru berhasil ditambahkan.", product: newProduct });
});

// --- BAGIAN YANG DIUBAH ---
// HAPUS baris app.listen(...) dari sini
// app.listen(PORT, () => {
//     console.log(`Server berjalan di http://localhost:${PORT}`);
// });

// TAMBAHKAN baris ini di paling akhir
module.exports = app;
