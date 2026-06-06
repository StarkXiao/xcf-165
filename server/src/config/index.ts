import path from 'path'

export const config = {
  port: Number(process.env.PORT) || 3001,
  dbPath: process.env.DB_PATH || path.join(__dirname, '../../data/auction.db'),
  uploadDir: process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads'),
  allowedOrigins: (process.env.ALLOWED_ORIGINS || 'http://localhost:5173').split(','),
  maxUploadSize: 5 * 1024 * 1024,
  allowedImageTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
}
