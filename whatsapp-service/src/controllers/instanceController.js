import { 
  createInstance, 
  getInstanceStatus, 
  disconnectInstance,
  getAllInstancesStatus,
  INSTANCE_STATUS 
} from '../services/BaileysService.js'
import QRCode from 'qrcode'
import { logger } from '../utils/logger.js'

/**
 * POST /api/instance/connect
 * Body: { admin_id: number }
 * Starts a new WhatsApp instance for this admin
 */
export async function connect(req, res) {
  try {
    const { admin_id } = req.body
    
    if (!admin_id) {
      return res.status(400).json({ 
        success: false, 
        message: 'admin_id is required' 
      })
    }

    const result = await createInstance(admin_id)
    return res.json({ success: true, data: result })

  } catch (error) {
    logger.error('Connect error:', error)
    return res.status(500).json({ 
      success: false, 
      message: error.message 
    })
  }
}

/**
 * GET /api/instance/status/:admin_id
 * Returns current connection status + QR code as base64 image if available
 */
export async function status(req, res) {
  try {
    const { admin_id } = req.params
    const instanceStatus = getInstanceStatus(admin_id)

    // If QR is available, convert to base64 PNG for frontend display
    if (instanceStatus.qr) {
      try {
        const qrImageBase64 = await QRCode.toDataURL(instanceStatus.qr)
        instanceStatus.qr_image = qrImageBase64
      } catch (qrError) {
        logger.error('QR generation error:', qrError)
      }
    }

    return res.json({ success: true, data: instanceStatus })

  } catch (error) {
    logger.error('Status error:', error)
    return res.status(500).json({ 
      success: false, 
      message: error.message 
    })
  }
}

/**
 * POST /api/instance/disconnect
 * Body: { admin_id: number }
 * Logs out and clears session
 */
export async function disconnect(req, res) {
  try {
    const { admin_id } = req.body
    
    if (!admin_id) {
      return res.status(400).json({ 
        success: false, 
        message: 'admin_id is required' 
      })
    }

    const result = await disconnectInstance(admin_id)
    return res.json({ success: true, data: result })

  } catch (error) {
    logger.error('Disconnect error:', error)
    return res.status(500).json({ 
      success: false, 
      message: error.message 
    })
  }
}

/**
 * GET /api/instance/all
 * Returns status of all active instances (super admin use)
 */
export async function allInstances(req, res) {
  try {
    const instances = getAllInstancesStatus()
    return res.json({ success: true, data: instances })
  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      message: error.message 
    })
  }
}
