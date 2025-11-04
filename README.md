# Cova Studio

Ứng dụng web tô màu ảnh đen trắng sử dụng Deep Learning (ECCV16 Colorization Model).

## Tính năng

- Tự động tô màu ảnh đen trắng
- Giao diện web hiện đại, dễ sử dụng
- API RESTful backend với FastAPI
- Frontend responsive với Next.js + React + TailwindCSS

## Yêu cầu hệ thống

- **Python**: 3.10 trở lên (đề xuất 3.11 hoặc 3.13)
- **Node.js**: 18.x trở lên
- **npm** hoặc **yarn**
- **Git**

## Cài đặt và chạy dự án

### 1️Backend (FastAPI + PyTorch)

#### Bước 1: Clone repository
```bash
git clone <repository-url>
cd bw-colorize-app
```

#### Bước 2: Tạo môi trường ảo Python
```powershell
# Windows PowerShell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
```

```bash
# Linux/Mac
cd backend
python3 -m venv .venv
source .venv/bin/activate
```

#### Bước 3: Cài đặt dependencies
```bash
pip install -r requirements.txt
```

**Lưu ý**: Quá trình cài đặt PyTorch có thể mất 5-10 phút tùy theo tốc độ mạng.

#### Bước 4: Khởi động server backend
```bash
# Từ thư mục backend/
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Backend sẽ chạy tại: `http://localhost:8000`
- Health check: `http://localhost:8000/health`
- API docs: `http://localhost:8000/docs`

**Lưu ý quan trọng**: 
- Lần đầu chạy, model sẽ tự động tải từ internet (~130MB)
- Model được lưu cache tại: `C:\Users\<username>\.cache\torch\hub\checkpoints\`

---

### Frontend (Next.js + React)

#### Bước 1: Mở terminal mới và chuyển đến thư mục frontend
```powershell
# Mở terminal mới (giữ terminal backend đang chạy)
cd bw-colorize-app/frontend
```

#### Bước 2: Cài đặt dependencies
```bash
npm install
```

#### Bước 3: Cấu hình môi trường (optional)
Tạo file `.env.local` nếu backend không chạy ở localhost:8000:
```env
NEXT_PUBLIC_MODEL_URL=http://localhost:8000
```

#### Bước 4: Khởi động server frontend
```bash
# Development mode
npm run dev

# Hoặc build và chạy production
npm run build
npm start
```

Frontend sẽ chạy tại: `http://localhost:3000`

---

## Hướng dẫn sử dụng

1. Mở trình duyệt và truy cập: `http://localhost:3000`
2. Click vào nút **"Choose File"** để chọn ảnh đen trắng
3. Hệ thống sẽ tự động xử lý và hiển thị kết quả
4. Click **"Tải ảnh"** để download ảnh đã tô màu

## Xử lý lỗi thường gặp

### Backend không khởi động được

**Lỗi: `uvicorn: The term 'uvicorn' is not recognized`**
```bash
# Giải pháp: Kích hoạt virtual environment
.venv\Scripts\Activate.ps1  # Windows
source .venv/bin/activate   # Linux/Mac

# Sau đó chạy lại uvicorn
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

**Lỗi: `No module named 'app'`**
```bash
# Giải pháp: Đảm bảo đang ở thư mục backend/
cd backend
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

**Lỗi: `ModuleNotFoundError: No module named 'colorizers.eccv16'`**
```bash
# Giải pháp: Cài lại dependencies
pip install -r requirements.txt
```

### Frontend không kết nối được backend

**Lỗi: `Failed to fetch` hoặc `Network Error`**
- Kiểm tra backend đã chạy chưa: `http://localhost:8000/health`
- Kiểm tra biến môi trường `NEXT_PUBLIC_MODEL_URL` trong `.env.local`
- Tắt firewall/antivirus tạm thời

### Model tải về bị lỗi

**Lỗi: `RuntimeError: Error(s) in loading state_dict`**
- Model được tải tự động lần đầu chạy
- Nếu lỗi, xóa cache và chạy lại:
```powershell
# Windows
Remove-Item -Path "$env:USERPROFILE\.cache\torch\hub\checkpoints\*" -Force
```

## Cấu trúc dự án

```
bw-colorize-app/
├── backend/
│   ├── app/
│   │   └── main.py          # FastAPI application
│   ├── colorizers/          # PyTorch colorization models
│   │   ├── __init__.py
│   │   ├── base_color.py
│   │   ├── eccv16.py
│   │   └── util.py
│   ├── requirements.txt     # Python dependencies
│   └── Dockerfile
├── frontend/
│   ├── app/
│   │   ├── page.tsx         # Main page component
│   │   ├── layout.tsx
│   │   └── globals.css
│   ├── package.json         # Node dependencies
│   └── next.config.mjs
└── README.md
```

## Công nghệ sử dụng

### Backend
- **FastAPI**: Web framework hiện đại, hiệu suất cao
- **PyTorch**: Deep learning framework
- **OpenCV**: Xử lý ảnh
- **Uvicorn**: ASGI server

### Frontend
- **Next.js 14**: React framework với App Router
- **React 18**: UI library
- **TailwindCSS**: Utility-first CSS framework
- **TypeScript**: Type-safe JavaScript

### Model
- **ECCV16 Colorization**: Model từ paper "Colorful Image Colorization" (Zhang et al., ECCV 2016)
- Pretrained weights: ~130MB

## API Endpoints

### `GET /health`
Kiểm tra trạng thái server

**Response:**
```json
{"ok": true}
```

### `POST /colorize`
Tô màu ảnh đen trắng

**Request:**
- Content-Type: `multipart/form-data`
- Body: `file` (image file)

**Response:**
- Content-Type: `image/jpeg`
- Body: Ảnh đã tô màu

## Đóng góp

Mọi đóng góp đều được chào đón! Vui lòng:
1. Fork repository
2. Tạo branch mới (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Mở Pull Request

## License

Dự án này sử dụng các model từ [richzhang/colorization](https://github.com/richzhang/colorization) (BSD-2-Clause License)

## Tác giả

Junn4423

## Credit

- Colorization Model: [Richard Zhang et al.](https://github.com/richzhang/colorization)
- Paper: "Colorful Image Colorization" (ECCV 2016)
