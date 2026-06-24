import express from 'express'
import cors from 'cors'
import rateLimit from 'express-rate-limit'
import dotenv from 'dotenv'
import { requireServiceSecret } from './middleware/authMiddleware.js'
import instanceRoutes from './routes/instanceRoutes.js'
import messageRoutes from './routes/messageRoutes.js'
import { logger } from './utils/logger.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

// Middleware
app.use(cors({ origin: 'http://localhost:8000' }))
app.use(express.json())

// Rate limiting — 100 requests per minute per IP
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { success: false, message: 'Too many requests' }
})
app.use(limiter)

// Health check (no auth required)
app.get('/health', (req, res) => {
  res.json({ 
    success: true, 
    service: 'Transport WhatsApp Service',
    status: 'running',
    timestamp: new Date().toISOString()
  })
})

// All other routes require service secret
app.use('/api', requireServiceSecret)
app.use('/api/instance', instanceRoutes)
app.use('/api/message', messageRoutes)

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' })
})

// Error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err)
  res.status(500).json({ success: false, message: 'Internal server error' })
})

app.listen(PORT, () => {
  logger.info(`WhatsApp microservice running on port ${PORT}`)
  logger.info(`Health check: http://localhost:${PORT}/health`)
})
