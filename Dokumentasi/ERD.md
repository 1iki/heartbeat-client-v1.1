# Entity Relationship Diagram (ERD)

Sumber skema utama: [lib/db/models/Node.ts](lib/db/models/Node.ts#L19-L193)

## Diagram (dbdiagram.io / DBML)

```dbml
Table nodes {
  _id ObjectId [pk]
  name string [unique, not null]
  url string [not null]
  group string [not null]
  status string [not null]
  latency int
  history json
  lastChecked datetime
  httpStatus int
  statusMessage string
  createdAt datetime
  updatedAt datetime
}

Table node_dependencies {
  node_id ObjectId [not null]
  depends_on_id ObjectId [not null]

  Indexes {
    (node_id, depends_on_id) [unique]
  }
}

Table auth_config {
  node_id ObjectId [pk]
  type string
  username string
  password string
  token string
  headerName string
  headerValue string
  loginUrl string
  loginType string
  modalTriggerSelector string
  usernameSelector string
  passwordSelector string
  submitSelector string
  loginSuccessSelector string
}

Ref: node_dependencies.node_id > nodes._id
Ref: node_dependencies.depends_on_id > nodes._id
Ref: auth_config.node_id > nodes._id
```

## Detail Entitas

### 1) NODE (collection: `nodes`)
- **Kunci utama**: `_id`.
- **Informasi inti**: `name`, `url`, `group`.
  - `group` enum: `iframe`, `video`, `game`, `webgl`, `website`, `backend`, `frontend`, `api`, `database`, `service`.
- **Status monitoring**: `status`, `latency`, `history`, `lastChecked`, `httpStatus`, `statusMessage`.
  - `status` enum: `STABLE`, `FRESH`, `WARNING`, `DOWN`.
  - `history` menyimpan maksimal 20 data latency terakhir.
- **Relasi**:
  - `dependencies`: array ObjectId yang merujuk ke dokumen `nodes` lain (self‑reference).
  - `authConfig`: objek tertanam untuk konfigurasi autentikasi.
- **Index**:
  - `status` + `lastChecked`.
  - `group`.

### 2) AUTH_CONFIG (embedded object)
- Disimpan langsung di dokumen `NODE` (bukan koleksi terpisah).
- Menyimpan konfigurasi autentikasi untuk health check, termasuk kredensial dan selector untuk login berbasis browser.

## Catatan
- DBML di atas memakai tabel bantu (`node_dependencies` dan `auth_config`) untuk memvisualisasikan relasi embedded/self‑reference, walau di MongoDB keduanya tersimpan di dokumen `nodes`.
- Tidak ada koleksi lain yang aktif di sisi aplikasi utama selain `nodes`.
- Folder contoh di [CONTOH/CONTOH2/schemas.js](CONTOH/CONTOH2/schemas.js) berisi skema demo yang **tidak dipakai** di runtime aplikasi.
