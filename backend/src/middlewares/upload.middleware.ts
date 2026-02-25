/**
 * ============================================
 * 文件上传中间件
 * ============================================
 *
 * 功能说明：
 * - 配置Multer用于文件上传
 * - 头像上传配置
 * - 文件大小限制
 * - 文件类型验证
 *
 * @author Emergency Dispatch Team
 */

import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { ValidationError } from './error.middleware';

// 获取当前文件的目录路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 上传目录的绝对路径
const UPLOAD_DIR = path.resolve(__dirname, '../../uploads');
const AVATAR_DIR = path.join(UPLOAD_DIR, 'avatars');

/**
 * 头像上传配置
 */
export const uploadAvatar = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, AVATAR_DIR);
    },
    filename: (req, file, cb) => {
      // 生成唯一文件名: timestamp-originalname
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const ext = path.extname(file.originalname);
      cb(null, `avatar-${uniqueSuffix}${ext}`);
    },
  }),
  limits: {
    fileSize: 2 * 1024 * 1024, // 限制2MB
  },
  fileFilter: (req, file, cb) => {
    // 只允许图片格式
    const allowedMimes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
    ];

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new ValidationError('只支持 JPG、PNG、GIF、WebP 格式的图片'));
    }
  },
}).single('avatar');

/**
 * 通用文件上传配置
 */
export const uploadSingle = (fieldName: string = 'file', maxSize: number = 5 * 1024 * 1024) => {
  return multer({
    storage: multer.diskStorage({
      destination: (req, file, cb) => {
        cb(null, UPLOAD_DIR);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname);
        cb(null, `file-${uniqueSuffix}${ext}`);
      },
    }),
    limits: {
      fileSize: maxSize,
    },
  }).single(fieldName);
};

/**
 * 多文件上传配置
 */
export const uploadMultiple = (fieldName: string = 'files', maxCount: number = 10) => {
  return multer({
    storage: multer.diskStorage({
      destination: (req, file, cb) => {
        cb(null, UPLOAD_DIR);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname);
        cb(null, `file-${uniqueSuffix}${ext}`);
      },
    }),
  }).array(fieldName, maxCount);
};
