// Import modul yang diperlukan
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');

// Inisialisasi aplikasi
const app = express();
const PORT = process.env.PORT || 3001;

// Path ke file data
const ORDERS_FILE_PATH = path.join(__dirname, 'server-orders.json');
const PRODUCTS_FILE_PATH = path.join(__dirname, 'public', 'products.json');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- Fungsi Helper untuk Baca/Tulis File ---
function readJsonFile(filePath, defaultData = []) {
    try {
        if (!fs.existsSync(filePath)) {
            fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2));
            return defaultData;
        }
        const data = fs.readFileSync(filePath, 'utf8');
        return data ? JSON.parse(data) : defaultData;
    } catch (error) {
        console.error(`Error reading file from path: ${filePath}`, error);
        return defaultData;
    }
}

function writeJsonFile(filePath, data) {
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error(`Error writing file to path: ${filePath}`, error);
    }
}

// --- Middleware untuk Autentikasi Admin ---
function authenticateAdminToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.status(401).json({ message: "Akses ditolak. Token tidak ditemukan." });

    jwt.verify(token, process.env.JWT_SECRET, (err, admin) => {
        if (err) return res.status(403).json({ message: "Token tidak valid atau kadaluarsa." });
        req.admin = admin;
        next();
    });
}

// --- API Endpoints Publik ---
app.get('/api/products', (req, res) => {
    const products = readJsonFile(PRODUCTS_FILE_PATH);
    res.json(products);
});

app.post('/api/orders/submit', (req, res) => {
    const { items, totalAmount, buyerName, buyerWhatsApp, paymentMethod } = req.body;
    if (!items || items.length === 0 || !totalAmount) {
        return res.status(400).json({ message: "Data pesanan tidak lengkap." });
    }
    const orders = readJsonFile(ORDERS_FILE_PATH);
    const newOrder = { id: Date.now().toString(), date: new Date().toISOString(), items, totalAmount, buyerName, buyerWhatsApp, paymentMethod, status: "Menunggu Konfirmasi Penjual" };
    orders.push(newOrder);
    writeJsonFile(ORDERS_FILE_PATH, orders);
    res.status(201).json({ message: "Pesanan berhasil disimpan di server.", order: newOrder });
});

// --- API Endpoints Admin ---
app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;
    if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
        const adminData = { username };
        const accessToken = jwt.sign(adminData, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.json({ accessToken });
    } else {
        res.status(401).json({ message: "Username atau password admin salah." });
    }
});

app.get('/api/admin/orders', authenticateAdminToken, (req, res) => {
    const orders = readJsonFile(ORDERS_FILE_PATH);
    res.json(orders.sort((a, b) => new Date(b.date) - new Date(a.date)));
});

app.put('/api/admin/orders/:orderId/status', authenticateAdminToken, (req, res) => {
    const { orderId } = req.params;
    const { status } = req.body;
    let orders = readJsonFile(ORDERS_FILE_PATH);
    const orderIndex = orders.findIndex(o => o.id === orderId);
    if (orderIndex === -1) return res.status(404).json({ message: "Pesanan tidak ditemukan." });
    orders[orderIndex].status = status;
    writeJsonFile(ORDERS_FILE_PATH, orders);
    res.json(orders[orderIndex]);
});

// --- Endpoint BARU untuk Menambah Produk ---
app.post('/api/admin/products', authenticateAdminToken, (req, res) => {
    const { id, name, category, price, duration, imageUrl, description } = req.body;
    if (!id || !name || !price || !category) {
        return res.status(400).json({ message: "ID, Nama, Harga, dan Kategori produk wajib diisi." });
    }
    let products = readJsonFile(PRODUCTS_FILE_PATH);
    const existingProduct = products.find(p => p.id === id);
    if(existingProduct) {
        return res.status(409).json({ message: `Produk dengan ID '${id}' sudah ada.`});
    }
    const newProduct = { id, name, category, price, duration, imageUrl, description };
    products.push(newProduct);
    writeJsonFile(PRODUCTS_FILE_PATH, products);
    res.status(201).json({ message: "Produk baru berhasil ditambahkan.", product: newProduct });
});

// Rute fallback untuk menyajikan frontend
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Menjalankan server
app.listen(PORT, () => {
    console.log(`Server Epennzy Market berjalan di http://localhost:${PORT}`);
});