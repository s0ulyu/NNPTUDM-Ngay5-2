const API_URL = 'https://api.escuelajs.co/api/v1/products';
let allProducts = [];
let filteredProducts = [];
let currentViewData = [];
let currentPage = 1;
let pageSize = 10;
let sortConfig = { column: null, isAsc: true };

// Khởi chạy khi load trang
document.addEventListener("DOMContentLoaded", () => {
    fetchProducts();

    // Lắng nghe sự kiện tìm kiếm (thay đổi liên tục khi gõ)
    document.getElementById('searchInput').addEventListener('input', handleSearch);

    // Lắng nghe sự kiện đổi số lượng dòng/trang
    document.getElementById('pageSize').addEventListener('change', (e) => {
        pageSize = parseInt(e.target.value);
        currentPage = 1;
        renderTable();
    });

    // Lắng nghe submit form tạo mới
    document.getElementById('createForm').addEventListener('submit', createItem);
});

// Lấy dữ liệu từ API
async function fetchProducts() {
    try {
        const response = await fetch(API_URL);
        allProducts = await response.json();
        filteredProducts = [...allProducts];
        renderTable();
    } catch (error) {
        console.error("Lỗi khi tải dữ liệu: ", error);
    }
}

// Hiển thị bảng và xử lý phân trang
function renderTable() {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '';

    // Tính toán phân trang
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    currentViewData = filteredProducts.slice(startIndex, endIndex);

    // Render từng dòng
    currentViewData.forEach(product => {
        // Xử lý link ảnh (API thỉnh thoảng trả về dạng chuỗi dư dấu ngoặc)
        let imgUrl = product.images[0]?.replace(/[\[\]"]/g, '') || 'https://via.placeholder.com/50';
        
        const tr = document.createElement('tr');
        // Tính năng: Hover chuột để xem Description
        tr.title = `Mô tả: ${product.description}`; 
        tr.innerHTML = `
            <td>${product.id}</td>
            <td><img src="${imgUrl}" class="img-thumbnail-custom" onerror="this.src='https://via.placeholder.com/50'"></td>
            <td>${product.title}</td>
            <td>$${product.price}</td>
            <td>${product.category?.name || 'N/A'}</td>
            <td>
                <button class="btn btn-info btn-sm" onclick="viewDetail(${product.id})">Chi tiết</button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    // Cập nhật text phân trang
    const totalPages = Math.ceil(filteredProducts.length / pageSize) || 1;
    document.getElementById('pageInfo').innerText = `Trang ${currentPage} / ${totalPages} (Tổng: ${filteredProducts.length} sản phẩm)`;
}

// Chức năng: Tìm kiếm (Search)
function handleSearch(e) {
    const keyword = e.target.value.toLowerCase();
    filteredProducts = allProducts.filter(p => p.title.toLowerCase().includes(keyword));
    currentPage = 1;
    renderTable();
}

// Chức năng: Sắp xếp (Sort)
function sortData(column) {
    if (sortConfig.column === column) {
        sortConfig.isAsc = !sortConfig.isAsc; // Đảo chiều nếu click lại cột cũ
    } else {
        sortConfig.column = column;
        sortConfig.isAsc = true;
    }

    filteredProducts.sort((a, b) => {
        let valA = a[column];
        let valB = b[column];
        
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();

        if (valA < valB) return sortConfig.isAsc ? -1 : 1;
        if (valA > valB) return sortConfig.isAsc ? 1 : -1;
        return 0;
    });

    currentPage = 1;
    renderTable();
}

// Chuyển trang
function prevPage() {
    if (currentPage > 1) { currentPage--; renderTable(); }
}
function nextPage() {
    const totalPages = Math.ceil(filteredProducts.length / pageSize);
    if (currentPage < totalPages) { currentPage++; renderTable(); }
}

// Chức năng: Export CSV (Chỉ export dữ liệu của view hiện tại)
function exportCSV() {
    if (currentViewData.length === 0) return alert('Không có dữ liệu để xuất!');
    
    const headers = ['ID', 'Title', 'Price', 'Category', 'Mô tả'];
    const csvRows = [headers.join(',')];

    currentViewData.forEach(p => {
        const row = [
            p.id,
            `"${p.title.replace(/"/g, '""')}"`,
            p.price,
            `"${p.category?.name || ''}"`,
            `"${p.description.replace(/"/g, '""')}"`
        ];
        csvRows.push(row.join(','));
    });

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + csvRows.join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "current_view_products.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Mở Modal Xem chi tiết
function viewDetail(id) {
    const product = allProducts.find(p => p.id === id);
    if (!product) return;

    document.getElementById('editId').value = product.id;
    document.getElementById('editTitle').value = product.title;
    document.getElementById('editPrice').value = product.price;
    document.getElementById('editCategory').value = product.category?.name;
    document.getElementById('editDescription').value = product.description;

    // Reset trạng thái modal về View-only
    document.querySelectorAll('#detailModal input, #detailModal textarea').forEach(el => {
        if(el.id !== 'editId' && el.id !== 'editCategory') el.readOnly = true;
    });
    document.getElementById('saveEditBtn').classList.add('d-none');
    
    const modal = new bootstrap.Modal(document.getElementById('detailModal'));
    modal.show();
}

// Chuyển Modal sang chế độ Edit
function enableEditMode() {
    document.querySelectorAll('#detailModal input, #detailModal textarea').forEach(el => {
        if(el.id !== 'editId' && el.id !== 'editCategory') el.readOnly = false;
    });
    document.getElementById('saveEditBtn').classList.remove('d-none');
}

// Chức năng: Cập nhật (PUT)
async function updateItem() {
    const id = document.getElementById('editId').value;
    const updatedData = {
        title: document.getElementById('editTitle').value,
        price: parseInt(document.getElementById('editPrice').value),
        description: document.getElementById('editDescription').value
    };

    try {
        const res = await fetch(`${API_URL}/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedData)
        });
        const data = await res.json();
        
        alert(`Cập nhật thành công sản phẩm ID: ${data.id}`);
        // Tải lại bảng để thấy kết quả
        fetchProducts();
        
        // Đóng modal
        bootstrap.Modal.getInstance(document.getElementById('detailModal')).hide();
    } catch (err) { alert('Lỗi cập nhật!'); }
}

// Chức năng: Tạo mới (POST)
async function createItem(e) {
    e.preventDefault(); // Chặn tải lại trang
    
    const newData = {
        title: document.getElementById('createTitle').value,
        price: parseInt(document.getElementById('createPrice').value),
        description: document.getElementById('createDescription').value,
        categoryId: parseInt(document.getElementById('createCategoryId').value),
        images: [document.getElementById('createImage').value]
    };

    try {
        const res = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newData)
        });
        const data = await res.json();
        
        alert(`Tạo thành công! ID mới: ${data.id}`);
        fetchProducts(); // Tải lại bảng
        
        // Reset form và đóng modal
        document.getElementById('createForm').reset();
        bootstrap.Modal.getInstance(document.getElementById('createModal')).hide();
    } catch (err) { alert('Lỗi tạo mới!'); }
}