import fs from 'fs'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import { config } from '../config'

export const uploadService = {
  async saveFile(file: { name: string; type: string; path: string; size: number }): Promise<{ url: string; filename: string }> {
    if (!config.allowedImageTypes.includes(file.type)) {
      throw new Error('不支持的图片格式')
    }

    if (file.size > config.maxUploadSize) {
      throw new Error('图片大小不能超过 5MB')
    }

    if (!fs.existsSync(config.uploadDir)) {
      fs.mkdirSync(config.uploadDir, { recursive: true })
    }

    const ext = path.extname(file.name)
    const filename = `${uuidv4()}${ext}`
    const targetPath = path.join(config.uploadDir, filename)

    fs.copyFileSync(file.path, targetPath)
    fs.unlinkSync(file.path)

    const url = `/uploads/${filename}`

    return { url, filename }
  },

  async deleteFile(filename: string): Promise<void> {
    const filePath = path.join(config.uploadDir, filename)
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
    }
  }
}
