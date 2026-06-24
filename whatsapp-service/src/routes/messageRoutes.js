import express from 'express'
import { send, sendBulk } from '../controllers/messageController.js'

const router = express.Router()

router.post('/send', send)
router.post('/send-bulk', sendBulk)

export default router
