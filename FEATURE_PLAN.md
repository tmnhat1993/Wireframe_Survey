# Ke hoach tinh nang Survey App

## Muc tieu

Chuyen wireframe hien tai thanh ung dung survey co luu ket qua len Firebase, co luong nguoi dung hoan tat khao sat va trang Admin rieng de xem thong ke, danh sach tham gia, export du lieu.

## Pham vi man hinh

### 1. Man hinh nhap thong tin

- Truong bat buoc: Ho va ten.
- Truong tuy chon: So dien thoai.
- Checkbox: Dong y chia se thong tin ca nhan.
- Neu dong y:
  - Luu ho ten va so dien thoai len Firebase.
  - Luu co `consentGiven = true`.
- Neu khong dong y:
  - Van cho phep tiep tuc lam survey.
  - Luu record an danh voi `consentGiven = false`.
  - Khong luu ho ten va so dien thoai vao record ket qua cong khai.
- Popup quy dinh chia se thong tin:
  - Noi ro muc dich thu thap thong tin.
  - Noi ro pham vi su dung du lieu.
  - Noi ro thoi gian luu tru du lieu.
  - Noi ro quyen rut lai dong y, yeu cau cap nhat/xoa thong tin.
  - Noi ro ben tiep can du lieu va cam ket khong chia se cho ben thu ba neu khong co can cu hop phap.

### 2. Validation thong tin

- Ten:
  - Khong duoc rong.
  - Do dai de xuat: 2-80 ky tu.
  - Khong chua ky tu dac biet hoac so.
  - Cho phep chu cai tieng Viet, khoang trang, dau gach noi va dau nhay don trong ten.
- So dien thoai Viet Nam:
  - Chap nhan dang `0xxxxxxxxx` voi 10 chu so.
  - Chap nhan dang `+84xxxxxxxxx` va chuan hoa ve `0xxxxxxxxx`.
  - Tu choi chuoi co chu cai, ky tu dac biet khong hop le, hoac sai do dai.
- Neu khong dong y chia se thong tin:
  - Khong bat buoc nhap so dien thoai.
  - Van can co luong tiep tuc ro rang voi record an danh.

### 3. Man hinh cau hoi

- Hien thi 1 cau hoi moi man hinh.
- Bat buoc tra loi cau hien tai truoc khi bam `Tiep theo`.
- Luu tam cau tra loi tren client trong qua trinh lam survey.
- Cau cuoi doi nut thanh `Gui khao sat`.
- Can co state de tranh submit trung lap khi dang ghi Firebase.

### 4. Hoan tat survey

- Khi nguoi dung bam `Gui khao sat`:
  - Validate tat ca cau hoi da co cau tra loi.
  - Tao payload survey.
  - Ghi payload len Firebase.
  - Chi hien thi man hinh thanh cong sau khi Firebase tra ve ghi data thanh cong.
- Neu Firebase loi:
  - Hien thi trang thai loi ngan gon.
  - Cho phep thu lai.
  - Khong hien thi thanh cong gia.

### 5. Trang Admin rieng

- Tao route rieng, de xuat: `/admin.html` neu giu static app, hoac `#/admin` neu giu single page.
- Dang nhap bang Admin ID va password.
- Giai doan dau:
  - Co the dung Firebase Auth email/password hoac custom admin config trong Firebase.
  - Khong hard-code password trong frontend cho ban production.
- Sau khi dang nhap thanh cong:
  - Xem danh sach nguoi tham gia.
  - Loc record da dong y va record an danh.
  - Xem chi tiet cau tra loi tung nguoi.
  - Xem thong ke tong hop so luong cau tra loi theo tung dap an.
  - Export CSV.
  - Export Excel neu them thu vien xuat `.xlsx`.

## Cau truc du lieu Firebase de xuat

### Collection `surveyResponses`

```json
{
  "id": "auto-id",
  "createdAt": "serverTimestamp",
  "consentGiven": true,
  "participant": {
    "fullName": "Nguyen Van A",
    "gender": "female",
    "ageRange": "24-45"
  },
  "anonymous": false,
  "answers": {
    "q1": "A",
    "q2": "B",
    "q3": "C",
    "q4": {
      "type": "other",
      "text": "Cau tra loi khac"
    },
    "q5": "A",
    "q6": "C"
  },
  "metadata": {
    "source": "web",
    "version": "2.0.0"
  }
}
```

### Record an danh

```json
{
  "id": "auto-id",
  "createdAt": "serverTimestamp",
  "consentGiven": false,
  "participant": null,
  "anonymous": true,
  "answers": {
    "q1": "social",
    "q2": "satisfied"
  },
  "metadata": {
    "source": "web",
    "version": "1.0.0"
  }
}
```

## Bao mat va quyen rieng tu

- Khong luu mat khau admin trong JavaScript frontend.
- Dung Firebase Authentication cho Admin neu co the.
- Dung Firestore Security Rules:
  - Client survey chi duoc `create` response.
  - Khong duoc `read`, `update`, `delete` response.
  - Admin da xac thuc moi duoc doc thong ke va export.
- Neu luu so dien thoai, can han che quyen doc va export.
- Noi dung consent can duoc user doc truoc khi dong y.
- Can co truong `consentGiven`, `createdAt` va phien ban consent text de doi chieu sau nay.

## Ke hoach trien khai

### Phase 1: Chuan hoa frontend hien tai

- Tach cau hoi thanh cau truc data trong `app.js`.
- Render cau hoi tu data thay vi hard-code toan bo HTML.
- Tao state survey: thong tin nguoi dung, consent, cau tra loi, trang thai submit.
- Them validation ten va so dien thoai.
- Bat buoc tra loi tung cau truoc khi next.
- Cap nhat popup quy dinh chia se thong tin.

### Phase 2: Tich hop Firebase

- Them Firebase SDK.
- Tao file config rieng, de xuat `firebase-config.js`.
- Tao service ghi response, de xuat `survey-store.js`.
- Ghi data bang `addDoc` vao Firestore.
- Dung `serverTimestamp`.
- Xu ly loading, success, error khi submit.

### Phase 3: Trang Admin

- Tao `admin.html`, `admin.css`, `admin.js` hoac route admin rieng.
- Them form dang nhap Admin ID/password.
- Tich hop Firebase Auth.
- Doc danh sach survey responses.
- Render bang danh sach nguoi tham gia.
- Render thong ke theo cau hoi va dap an.
- Them export CSV.
- Them export Excel neu can file `.xlsx` dung dinh dang Excel that.

### Phase 4: Deploy GitHub Pages

- Giu app static de deploy bang GitHub Pages.
- Khong dua secret vao repo.
- Firebase config public web app co the nam trong frontend, bao mat bang Security Rules.
- Cap nhat workflow Pages hien co neu them nhieu file.
- Kiem tra URL GitHub Pages sau khi deploy.

### Phase 5: Kiem thu

- Test luong dong y chia se thong tin.
- Test luong khong dong y va record an danh.
- Test validation ten tieng Viet co dau.
- Test validation so dien thoai `0xxxxxxxxx` va `+84xxxxxxxxx`.
- Test khong cho next khi chua tra loi cau hoi.
- Test submit thanh cong va loi Firebase.
- Test Admin login sai/dung.
- Test thong ke va export CSV/Excel.

## Cau hoi can chot truoc khi implement Firebase

- Se dung Firebase project nao?
- Dung Firestore hay Realtime Database? De xuat Firestore.
- Admin ID/password se tao qua Firebase Auth hay co backend rieng?
- Co can export Excel `.xlsx` that hay CSV la du?
- Noi dung chinh xac cua cac cau hoi va dap an co thay doi khong?
