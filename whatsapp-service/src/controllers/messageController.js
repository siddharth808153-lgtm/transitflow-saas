import { sendMessage } from '../services/BaileysService.js'
import { isValidPhone } from '../utils/phoneFormatter.js'
import { logger } from '../utils/logger.js'

/**
 * POST /api/message/send
 * Body: {
 *   admin_id: number,
 *   phone: string,
 *   message: string,
 *   whatsapp_log_id: number (optional, for status callback)
 * }
 */
export async function send(req, res) {
  try {
    const { admin_id, phone, message, whatsapp_log_id } = req.body

    // Validate required fields
    if (!admin_id || !phone || !message) {
      return res.status(400).json({
        success: false,
        message: 'admin_id, phone, and message are required'
      })
    }

    // Validate phone number
    if (!isValidPhone(phone)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid phone number format'
      })
    }

    // Validate message length
    if (message.length > 4096) {
      return res.status(400).json({
        success: false,
        message: 'Message too long. Maximum 4096 characters.'
      })
    }

    // Send the message
    const result = await sendMessage(admin_id, phone, message)

    // If whatsapp_log_id provided, send status callback to Laravel
    if (whatsapp_log_id) {
      sendStatusCallback(whatsapp_log_id, 'sent', null)
    }

    logger.info(`Message sent successfully`, { 
      admin_id, phone, whatsapp_log_id 
    })

    return res.json({
      success: true,
      message: 'Message sent successfully',
      data: result
    })

  } catch (error) {
    logger.error('Send message error:', error)

    // Send failed status callback to Laravel
    if (req.body.whatsapp_log_id) {
      sendStatusCallback(
        req.body.whatsapp_log_id, 
        'failed', 
        error.message
      )
    }

    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to send message'
    })
  }
}

/**
 * POST /api/message/send-bulk
 * Body: {
 *   admin_id: number,
 *   messages: [{ phone, message, whatsapp_log_id }]
 * }
 * Sends multiple messages with 2 second delay between each
 */
export async function sendBulk(req, res) {
  try {
    const { admin_id, messages } = req.body

    if (!admin_id || !messages || !Array.isArray(messages)) {
      return res.status(400).json({
        success: false,
        message: 'admin_id and messages array are required'
      })
    }

    if (messages.length > 50) {
      return res.status(400).json({
        success: false,
        message: 'Maximum 50 messages per bulk request'
      })
    }

    // Respond immediately — process in background
    res.json({
      success: true,
      message: `Processing ${messages.length} messages in background`,
      data: { total: messages.length }
    })

    // Process messages with delay to avoid WhatsApp ban
    for (let i = 0; i < messages.length; i++) {
      const { phone, message, whatsapp_log_id } = messages[i]
      
      try {
        await sendMessage(admin_id, phone, message)
        if (whatsapp_log_id) {
          sendStatusCallback(whatsapp_log_id, 'sent', null)
        }
        logger.info(`Bulk message ${i+1}/${messages.length} sent to ${phone}`)
      } catch (err) {
        logger.error(`Bulk message ${i+1} failed for ${phone}:`, err)
        if (whatsapp_log_id) {
          sendStatusCallback(whatsapp_log_id, 'failed', err.message)
        }
      }

      // 2 second delay between messages (avoid WhatsApp rate limiting)
      if (i < messages.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    }

  } catch (error) {
    logger.error('Bulk send error:', error)
    // Response already sent, just log
  }
}

/**
 * Send status update back to Laravel
 */
async function sendStatusCallback(logId, status, errorMessage) {
  try {
    const axios = (await import('axios')).default
    await axios.post(
      process.env.LARAVEL_CALLBACK_URL,
      { 
        whatsapp_log_id: logId, 
        status, 
        error_message: errorMessage 
      },
      { 
        headers: { 
          'X-Service-Secret': process.env.SERVICE_SECRET 
        },
        timeout: 5000
      }
    )
  } catch (err) {
    logger.error('Failed to send status callback to Laravel:', err.message)
  }
}
