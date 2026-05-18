# Cài đặt EmailJS để gửi email thật

## Bước 1 — Tạo tài khoản EmailJS
Truy cập https://www.emailjs.com và đăng ký (miễn phí 200 email/tháng).

## Bước 2 — Kết nối Gmail (hoặc Outlook)
1. Vào **Email Services** → **Add New Service**
2. Chọn **Gmail** → đăng nhập tài khoản Gmail của bạn
3. Lưu lại **Service ID** (dạng: `service_xxxxxxx`)

## Bước 3 — Tạo Email Template
1. Vào **Email Templates** → **Create New Template**
2. Dán nội dung template sau:

**Subject:** `{{subject}}`

**Body (HTML):**
```html
<p>{{message}}</p>
<hr/>
<p style="color:#666;font-size:12px;">
  <strong>Thông tin hóa đơn:</strong><br/>
  Số hóa đơn: {{invoice_number}}<br/>
  Ngày phát hành: {{invoice_date}}<br/>
  Tổng tiền: {{invoice_total}}<br/>
  Mã CQT: {{tax_code}}
</p>
<p style="color:#666;font-size:12px;">
  Liên hệ: {{from_name}} · {{from_phone}} · {{from_email}}
</p>
```

3. Trong phần **To Email** nhập: `{{to_email}}`
4. Lưu lại **Template ID** (dạng: `template_xxxxxxx`)

## Bước 4 — Lấy Public Key
1. Vào **Account** → **General**
2. Copy **Public Key** (dạng: `xxxxxxxxxxxxxxx`)

## Bước 5 — Điền vào file .env
```
VITE_EMAILJS_SERVICE_ID=service_xxxxxxx
VITE_EMAILJS_TEMPLATE_ID=template_xxxxxxx
VITE_EMAILJS_PUBLIC_KEY=xxxxxxxxxxxxxxx
```

Sau đó **restart dev server** (`npm run dev`).
