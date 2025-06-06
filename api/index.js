// api/index.js

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');

const app = express();

// Di lingkungan serverless Vercel, direktori /tmp adalah satu-satunya tempat yang bisa ditulis
const ORDERS_FILE_PATH = path.join('/tmp', 'server-orders.json');
// Path untuk file produk yang di-bundle saat deployment
const PRODUCTS_FILE_PATH = path.join(process.cwd(), 'public', 'products.json');

app.use(cors());
app.use(express.json());

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
    if (token == null) return res.status(401).json({ message: "Akses ditolak." });

    jwt.verify(token, process.env.JWT_SECRET, (err, admin) => {
        if (err) return res.status(403).json({ message: "Token tidak valid." });
        req.admin = admin;
        next();
    });
}

// --- API Endpoints ---
app.get('/api/products', (req, res) => {
    const products = readJsonFile(PRODUCTS_FILE_PATH);
    res.json(products);
});

app.post('/api/orders/submit', (req, res) => {
    const { items, totalAmount, buyerName, buyerWhatsApp, paymentMethod } = req.body;
    if (!items || !totalAmount) {
        return res.status(400).json({ message: "Data pesanan tidak lengkap." });
    }
    const orders = readJsonFile(ORDERS_FILE_PATH);
    const newOrder = { 
        id: Date.now().toString(), 
        date: new Date().toISOString(), 
        items, totalAmount, buyerName, buyerWhatsApp, paymentMethod, 
        status: "Menunggu Konfirmasi Penjual" 
    };
    orders.push(newOrder);
    writeJsonFile(ORDERS_FILE_PATH, orders);
    res.status(201).json(newOrder);
});

app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;
    if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
        const accessToken = jwt.sign({ username }, process.env.JWT_SECRET, { expiresIn: '1h' });
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
    let orders = readJsonFile(ORDERS_FILE_PATH);
    const orderIndex = orders.findIndex(o => o.id === req.params.orderId);
    if (orderIndex === -1) return res.status(404).json({ message: "Pesanan tidak ditemukan." });
    orders[orderIndex].status = req.body.status;
    writeJsonFile(ORDERS_FILE_PATH, orders);
    res.json(orders[orderIndex]);
});

app.post('/api/admin/products', authenticateAdminToken, (req, res) => {
    let products = readJsonFile(PRODUCTS_FILE_PATH);
    const newProduct = req.body;
     if (!newProduct.id || !newProduct.name || !newProduct.price) {
        return res.status(400).json({ message: "ID, Nama, dan Harga produk wajib diisi." });
    }
    const existing = products.find(p => p.id === newProduct.id);
    if(existing) return res.status(409).json({message: `Produk dengan ID '${newProduct.id}' sudah ada.`});

    products.push(newProduct);
    writeJsonFile(PRODUCTS_FILE_PATH, products);
    res.status(201).json(newProduct);
});

// Ekspor aplikasi untuk digunakan oleh Vercel
module.exports = app;
