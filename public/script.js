// --- PENTING: Atur URL Backend Anda di sini ---
// Jika frontend dan backend di-deploy bersamaan di Vercel, ini bisa dikosongkan.
// Jika di-deploy terpisah (misalnya, backend di Render), isi dengan URL backend Anda.
const backendBaseUrl = ''; // Contoh untuk Vercel. Ganti jika perlu.

// Variabel Global & Elemen DOM
let products = [];
let cart = JSON.parse(localStorage.getItem('epennzyCart')) || [];
let orderHistory = JSON.parse(localStorage.getItem('epennzyOrderHistory')) || [];
let adminToken = localStorage.getItem('epennzyAdminToken');
let currentFilterCategory = 'Semua';
let previousPage = 'discoverPage';

const productGrid = document.getElementById('productGrid');
const categoryContainer = document.getElementById('categoryContainer');
const cartItemsContainer = document.getElementById('cartItemsContainer');
const cartSubtotalEl = document.getElementById('cartSubtotal');
const cartTotalEl = document.getElementById('cartTotal');
const cartItemCountEl = document.getElementById('cartItemCount');
const searchInput = document.getElementById('searchInput');
const searchContainerEl = document.getElementById('searchContainer');
const goToCheckoutButton = document.getElementById('goToCheckoutButton');
const customModalEl = document.getElementById('customModal');
const modalTitleEl = document.getElementById('modalTitle');
const modalMessageTextEl = document.getElementById('modalMessageText');
const modalCloseButton = document.getElementById('modalClose');
const notificationButtonEl = document.getElementById('notificationButton');
const checkoutTotalAmountDisplayEl = document.getElementById('checkoutTotalAmountDisplay');
const confirmViaWhatsAppButton = document.getElementById('confirmViaWhatsAppButton');

// Elemen Admin
const adminUsernameEl = document.getElementById('adminUsername');
const adminPasswordEl = document.getElementById('adminPassword');
const adminLoginButtonEl = document.getElementById('adminLoginButton');
const adminOrdersContainerEl = document.getElementById('adminOrdersContainer');
const adminLogoutButtonEl = document.getElementById('adminLogoutButton');
const addProductFormEl = document.getElementById('addProductForm');


// --- Fungsi Utilitas ---
function showCustomAlert(message, title = "Informasi") {
    if (!customModalEl) return;
    modalTitleEl.textContent = title;
    modalMessageTextEl.innerHTML = message;
    customModalEl.classList.add('active');
}
function closeModal() {
    if (!customModalEl) return;
    customModalEl.classList.remove('active');
}
function formatPrice(price) { return `Rp${Number(price).toLocaleString('id-ID')}`; }


// --- Logika Navigasi & Tampilan ---
function navigateTo(pageId) {
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    setTimeout(() => {
        document.querySelectorAll('.page').forEach(p => { if(p.id !== pageId) p.style.display = 'none'; });
        const targetPage = document.getElementById(pageId);
        if (targetPage) { 
            targetPage.style.display = 'block';
            setTimeout(() => targetPage.classList.add('active'), 10);
        } else {
            document.getElementById('discoverPage').style.display = 'block';
            setTimeout(() => document.getElementById('discoverPage').classList.add('active'), 10);
            pageId = 'discoverPage';
        }
        window.scrollTo(0, 0); 
        updateNavIcons(pageId);
        if (pageId === 'cartPage' || pageId === 'checkoutPage') updateCart();
        else if (pageId === 'adminPanelPage') { if (adminToken) loadAdminOrders(); else navigateTo('adminLoginPage');}
    }, 50);
}
function goBack() { navigateTo(previousPage || 'discoverPage'); }
function handleSearchIconClick() {
    searchContainerEl.classList.toggle('hidden');
    if (!searchContainerEl.classList.contains('hidden')) {
        searchInput.focus();
    }
}
function updateNavIcons(pageId) {
    document.querySelectorAll('.bottom-nav-item svg.bottom-nav-icon-dark').forEach(icon => icon.classList.remove('active'));
    let activeNav = pageId;
    if (pageId === 'adminPanelPage') activeNav = 'adminLoginPage';
    const activeNavItem = document.querySelector(`.bottom-nav-item[data-page='${activeNav}'] svg.bottom-nav-icon-dark`);
    if (activeNavItem) activeNavItem.classList.add('active');
    else document.querySelector(".bottom-nav-item[data-page='discoverPage'] svg.bottom-nav-icon-dark")?.classList.add('active');
}


// --- Logika Produk ---
function renderProducts(filter = '', category = 'Semua') {
    if (!productGrid) return;
    productGrid.innerHTML = '';
    const filteredProducts = products.filter(p => {
        const nameMatch = p.name.toLowerCase().includes(filter.toLowerCase());
        const catMatch = p.category.toLowerCase().includes(filter.toLowerCase());
        const categoryFilterMatch = category === 'Semua' || p.category.startsWith(category);
        return (nameMatch || catMatch) && categoryFilterMatch;
    });
    if (filteredProducts.length === 0) { 
        productGrid.innerHTML = `<p class="col-span-full text-center text-secondary-dark">Tidak ada produk yang cocok.</p>`; 
    } else {
        filteredProducts.forEach(product => {
            productGrid.innerHTML += `
                <div class="product-card card-dark rounded-lg shadow-md overflow-hidden cursor-pointer" onclick="showProductDetail('${product.id}')">
                    <img src="${product.imageUrl}" alt="${product.name}" class="w-full h-32 object-cover" onerror="this.onerror=null;this.src='https://placehold.co/300x300/374151/9CA3AF?text=Error';">
                    <div class="p-3">
                        <h3 class="text-sm font-semibold text-main-dark truncate" title="${product.name}">${product.name}</h3>
                        <p class="text-xs text-secondary-dark mb-1">${product.duration}</p>
                        <p class="text-md font-bold text-accent-dark">${formatPrice(product.price)}</p>
                    </div></div>`;
        });
    }
}
function renderCategories() {
    if(!categoryContainer || products.length === 0) return;
    const mainCategories = products.map(p => p.category.split(" - ")[0].trim());
    const uniqueCategories = ['Semua', ...new Set(mainCategories)];
    categoryContainer.innerHTML = '';
    uniqueCategories.forEach(category => {
        const isActive = category === currentFilterCategory;
        categoryContainer.innerHTML += `
            <button class="px-4 py-2 text-sm font-medium rounded-full whitespace-nowrap ${isActive ? 'active-category-dark' : 'inactive-category-dark'} hover:opacity-80 transition" onclick="filterByCategory('${category}')">
                ${category}
            </button>`;
    });
}
function filterByCategory(category) { 
    currentFilterCategory = category; 
    renderCategories(); 
    renderProducts(searchInput ? searchInput.value : '', category);
}
function showProductDetail(productId) {
    const product = products.find(p => p.id === productId); if (!product) return;
    previousPage = getCurrentPageId();
    document.getElementById('productDetailName').textContent = product.name;
    document.getElementById('productDetailImage').src = product.imageUrl;
    document.getElementById('productDetailPrice').textContent = formatPrice(product.price);
    document.getElementById('productDetailDuration').textContent = `Durasi: ${product.duration}`;
    const descriptionEl = document.getElementById('productDetailDescription');
    descriptionEl.innerHTML = '';
    if (Array.isArray(product.description)) {
        product.description.forEach(point => { const li = document.createElement('li'); li.textContent = point; descriptionEl.appendChild(li); });
    }
    document.getElementById('productDetailAddToCartButton').onclick = () => { addToCart(product.id); };
    navigateTo('productDetailPage');
}
function getCurrentPageId() { 
    for (let page of document.querySelectorAll('.page')) { 
        if (page.style.display !== 'none' && page.classList.contains('active')) { return page.id; }
    }
    return 'discoverPage';
}

// --- Logika Keranjang & Pesanan ---
function addToCart(productId) { 
    const product = products.find(p => p.id === productId); if (!product) return; 
    if (cart.find(item => item.id === productId)) { showCustomAlert(`${product.name} sudah ada di keranjang.`, "Info"); } 
    else { cart.push({ ...product, quantity: 1 }); showCustomAlert(`${product.name} telah ditambahkan ke keranjang!`, "Sukses");} 
    updateCart(); 
}
function removeFromCart(productId) { cart = cart.filter(item => item.id !== productId); updateCart(); }
function updateCart() {
    if(!cartItemsContainer) return;
    cartItemsContainer.innerHTML = '';
    if (cart.length === 0) { cartItemsContainer.innerHTML = '<p class="text-secondary-dark text-center">Keranjang belanja Anda kosong.</p>'; goToCheckoutButton.disabled = true; } 
    else { goToCheckoutButton.disabled = false; cart.forEach(item => { cartItemsContainer.innerHTML += `<div class="flex items-center card-dark p-3 rounded-lg"><img src="${item.imageUrl}" alt="${item.name}" class="w-16 h-16 object-cover rounded-md mr-3"><div class="flex-grow"><h4 class="text-sm font-semibold text-main-dark">${item.name}</h4><p class="text-xs text-secondary-dark">${item.duration}</p><p class="text-sm font-semibold text-accent-dark">${formatPrice(item.price)}</p></div><button onclick="removeFromCart('${item.id}')" aria-label="Hapus" class="text-red-500 hover:text-red-700 ml-2"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button></div>`; });}
    const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    cartSubtotalEl.textContent = formatPrice(subtotal); cartTotalEl.textContent = formatPrice(subtotal); 
    if(checkoutTotalAmountDisplayEl) checkoutTotalAmountDisplayEl.textContent = formatPrice(subtotal);
    cartItemCountEl.textContent = cart.length; cartItemCountEl.classList.toggle('hidden', cart.length === 0);
    localStorage.setItem('epennzyCart', JSON.stringify(cart));
}
async function submitOrderToServerAndSaveLocal(paymentMethodDisplay) {
    const buyerName = document.getElementById('buyerName').value;
    const buyerWhatsApp = document.getElementById('buyerWhatsApp').value;
    if (!buyerName || !buyerWhatsApp) { showCustomAlert("Mohon isi Nama dan Nomor WhatsApp Anda.", "Info Penting"); return false; }
    if (cart.length === 0) { showCustomAlert("Keranjang Anda kosong.", "Peringatan"); return false; }

    const orderData = {
        items: cart,
        totalAmount: cart.reduce((sum, item) => sum + item.price, 0),
        buyerName, buyerWhatsApp, paymentMethod: paymentMethodDisplay
    };

    try {
        await fetch(`${backendBaseUrl}/api/orders/submit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderData)
        });
        localStorage.setItem('epennzyOrderHistory', JSON.stringify([...orderHistory, { ...orderData, id: Date.now(), date: new Date().toISOString(), status: "Menunggu Konfirmasi" }]));
        cart = []; updateCart();
        return true;
    } catch (error) {
        showCustomAlert("Gagal mengirim pesanan ke server. Silakan coba lagi.", "Kesalahan Jaringan");
        return false;
    }
}
function prepareWhatsAppMessage() { 
    if (cart.length === 0) return null;
    let message = `Halo Epennzy Market,\n\nSaya ingin konfirmasi pembayaran untuk pesanan:\n\n`;
    cart.forEach(item => { message += `- ${item.name}\n`; });
    message += `\nTotal: ${cartTotalEl.textContent}\n\nTerima kasih.`;
    return encodeURIComponent(message);
}


// --- Logika Admin ---
async function handleAdminLogin(event) {
    event.preventDefault();
    const username = adminUsernameEl.value;
    const password = adminPasswordEl.value;
    try {
        const response = await fetch(`${backendBaseUrl}/api/admin/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await response.json();
        if (response.ok) {
            adminToken = data.accessToken;
            localStorage.setItem('epennzyAdminToken', adminToken);
            showCustomAlert("Login admin berhasil!", "Sukses");
            navigateToAdminPanel();
        } else {
            showCustomAlert(data.message || "Login admin gagal.", "Error Login");
        }
    } catch (error) {
        showCustomAlert("Terjadi kesalahan saat mencoba login.", "Error Sistem");
    }
}
function handleAdminLogout() {
    adminToken = null;
    localStorage.removeItem('epennzyAdminToken');
    showCustomAlert("Anda telah logout.", "Logout Berhasil");
    navigateTo('discoverPage');
}
async function loadAdminOrders() {
    if (!adminToken) { navigateTo('adminLoginPage'); return; }
    adminOrdersContainerEl.innerHTML = '<p class="text-secondary-dark text-center">Memuat pesanan...</p>';
    try {
        const response = await fetch(`${backendBaseUrl}/api/admin/orders`, {
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        if (response.status === 401 || response.status === 403) { handleAdminLogout(); return; }
        const orders = await response.json();
        renderAdminOrders(orders);
    } catch (error) {
        adminOrdersContainerEl.innerHTML = '<p class="text-red-400 text-center">Gagal memuat pesanan.</p>';
    }
}
function renderAdminOrders(orders) {
    adminOrdersContainerEl.innerHTML = '';
    if (orders.length === 0) { adminOrdersContainerEl.innerHTML = '<p class="text-secondary-dark text-center">Belum ada pesanan.</p>'; return; }
    orders.forEach(order => {
        const orderDate = new Date(order.date).toLocaleString('id-ID');
        let itemsDetails = order.items.map(item => `<li>${item.name} - ${formatPrice(item.price)}</li>`).join('');
        const orderCard = document.createElement('div');
        orderCard.className = 'order-history-item';
        orderCard.innerHTML = `
            <h4 class="text-md font-semibold">Pesanan ID: ${order.id}</h4>
            <p class="text-xs">Tanggal: ${orderDate}</p>
            <p class="text-xs">Pembeli: ${order.buyerName} (WA: ${order.buyerWhatsApp})</p>
            <p class="text-xs">Total: <strong class="text-accent-dark">${formatPrice(order.totalAmount)}</strong></p>
            <div class="mt-2">
                <label for="status-${order.id}" class="text-xs mr-2">Status:</label>
                <select id="status-${order.id}" class="input-dark p-1 text-xs rounded border border-gray-600">
                    <option value="Menunggu Konfirmasi Penjual" ${order.status === "Menunggu Konfirmasi Penjual" ? 'selected' : ''}>Menunggu Konfirmasi</option>
                    <option value="Selesai" ${order.status === "Selesai" ? 'selected' : ''}>Selesai</option>
                    <option value="Dibatalkan" ${order.status === "Dibatalkan" ? 'selected' : ''}>Dibatalkan</option>
                </select>
                <button onclick="updateOrderStatus('${order.id}')" class="ml-2 button-accent-dark text-xs py-1 px-2 rounded">Update</button>
            </div>
            <p class="mt-1 text-xs">Item:</p>
            <ul class="list-disc list-inside pl-4 text-xs text-gray-400">${itemsDetails}</ul>`;
        adminOrdersContainerEl.appendChild(orderCard);
    });
}
async function updateOrderStatus(orderId) {
    const newStatus = document.getElementById(`status-${orderId}`).value;
    try {
        await fetch(`${backendBaseUrl}/api/admin/orders/${orderId}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
            body: JSON.stringify({ status: newStatus })
        });
        showCustomAlert(`Status pesanan berhasil diubah.`, "Sukses");
        loadAdminOrders();
    } catch (error) {
        showCustomAlert("Gagal mengubah status pesanan.", "Error");
    }
}
async function handleProductAdd(event) {
    event.preventDefault();
    const newProduct = {
        id: document.getElementById('newProductId').value,
        name: document.getElementById('newProductName').value,
        category: document.getElementById('newProductCategory').value,
        price: parseInt(document.getElementById('newProductPrice').value, 10),
        duration: document.getElementById('newProductDuration').value,
        imageUrl: document.getElementById('newProductImageUrl').value,
        description: document.getElementById('newProductDescription').value.split('\n').filter(line => line.trim() !== '')
    };
    if (!newProduct.id || !newProduct.name || !newProduct.price) {
        showCustomAlert("ID, Nama, dan Harga produk wajib diisi.", "Error"); return;
    }
    try {
        const response = await fetch(`${backendBaseUrl}/api/admin/products`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}`},
            body: JSON.stringify(newProduct)
        });
        const data = await response.json();
        if (response.ok) {
            showCustomAlert("Produk baru berhasil ditambahkan!", "Sukses");
            addProductFormEl.reset();
            loadProductsAndInitialize(); // Muat ulang semua produk
        } else {
            showCustomAlert(data.message || "Gagal menambah produk.", "Error");
        }
    } catch (error) {
        showCustomAlert("Terjadi kesalahan jaringan saat menambah produk.", "Error");
    }
}
function navigateToAdminPanel() {
    if (adminToken) { navigateTo('adminPanelPage'); } 
    else { navigateTo('adminLoginPage'); }
}


// --- Inisialisasi Aplikasi ---
async function loadProductsAndInitialize() {
    try {
        const response = await fetch(`${backendBaseUrl}/api/products`);
        if (!response.ok) throw new Error('Gagal memuat produk dari server.');
        products = await response.json();
        
        renderCategories();
        renderProducts();
        updateCart(); 
        navigateTo('discoverPage'); 
    } catch (error) {
        console.error("Gagal memuat aplikasi:", error);
        if(productGrid) productGrid.innerHTML = `<p class="col-span-full text-center text-red-400 p-4 rounded">Gagal memuat data produk. Pastikan URL backend benar dan server berjalan.</p>`;
    }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    loadProductsAndInitialize();
    if (modalCloseButton) modalCloseButton.onclick = closeModal;
    if (notificationButtonEl) notificationButtonEl.onclick = () => showCustomAlert('Belum ada notifikasi baru.', 'Notifikasi');
    if (searchInput) searchInput.addEventListener('input', (e) => renderProducts(e.target.value, currentFilterCategory));
    if (adminLoginButtonEl) adminLoginButtonEl.addEventListener('click', handleAdminLogin);
    if (adminLogoutButtonEl) adminLogoutButtonEl.addEventListener('click', handleAdminLogout);
    if (addProductFormEl) addProductFormEl.addEventListener('submit', handleProductAdd);
    if (confirmViaWhatsAppButton) {
        confirmViaWhatsAppButton.addEventListener('click', async function() { 
            const message = prepareWhatsAppMessage();
            if (message) {
                const success = await submitOrderToServerAndSaveLocal();
                if (success) window.open(`https://wa.me/6289654291565?text=${message}`, '_blank');
            }
        });
    }
});
