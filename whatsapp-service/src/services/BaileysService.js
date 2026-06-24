import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  isJidBroadcast
} from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import path from 'path'
import fs from 'fs'
import { logger } from '../utils/logger.js'

// In-memory store of active WhatsApp instances
// Key: admin_id (string), Value: socket instance + status
const instances = new Map()

// Status constants
export const INSTANCE_STATUS = {
  DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting', 
  QR_READY: 'qr_ready',
  CONNECTED: 'connected',
  LOGGED_OUT: 'logged_out'
}

/**
 * Get session directory for an admin
 */
function getSessionDir(adminId) {
  const sessionDir = path.join(
    process.cwd(), 
    process.env.SESSION_DIR || './sessions',
    `admin_${adminId}`
  )
  if (!fs.existsSync(sessionDir)) {
    fs.mkdirSync(sessionDir, { recursive: true })
  }
  return sessionDir
}

/**
 * Create or reconnect a WhatsApp instance for an admin
 */
export async function createInstance(adminId) {
  const adminKey = String(adminId)
  
  // If already connected, return current status
  if (instances.has(adminKey)) {
    const existing = instances.get(adminKey)
    if (existing.status === INSTANCE_STATUS.CONNECTED) {
      return { status: INSTANCE_STATUS.CONNECTED, message: 'Already connected' }
    }
  }

  // Set status to connecting
  instances.set(adminKey, { 
    status: INSTANCE_STATUS.CONNECTING, 
    socket: null, 
    qr: null,
    adminId: adminKey
  })

  try {
    const sessionDir = getSessionDir(adminId)
    const { state, saveCreds } = await useMultiFileAuthState(sessionDir)
    const { version } = await fetchLatestBaileysVersion()

    const sock = makeWASocket({
      version,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, logger)
      },
      printQRInTerminal: false,
      logger: logger.child({ level: 'silent' }),
      getMessage: async () => undefined,
      shouldIgnoreJid: jid => isJidBroadcast(jid)
    })

    // Handle connection updates
    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update
      const instance = instances.get(adminKey)

      if (qr) {
        logger.info(`QR code generated for admin ${adminId}`)
        instances.set(adminKey, { 
          ...instance, 
          status: INSTANCE_STATUS.QR_READY, 
          qr 
        })
      }

      if (connection === 'close') {
        const statusCode = (lastDisconnect?.error instanceof Boom)
          ? lastDisconnect.error.output.statusCode
          : 500

        const shouldReconnect = statusCode !== DisconnectReason.loggedOut

        logger.warn(`Connection closed for admin ${adminId}. 
          Status: ${statusCode}. Reconnect: ${shouldReconnect}`)

        if (shouldReconnect) {
          // Wait 3 seconds then reconnect
          setTimeout(() => createInstance(adminId), 3000)
        } else {
          // Logged out — remove all event listeners first to prevent saveCreds race
          sock.ev.removeAllListeners('creds.update')
          sock.ev.removeAllListeners('connection.update')
          try { sock.end(undefined) } catch (_) { /* ignore */ }

          instances.set(adminKey, {
            status: INSTANCE_STATUS.LOGGED_OUT,
            socket: null,
            qr: null,
            adminId: adminKey
          })
          // Delete session files so fresh QR is shown next time
          const sessionDir = getSessionDir(adminId)
          if (fs.existsSync(sessionDir)) {
            fs.rmSync(sessionDir, { recursive: true, force: true })
          }
          logger.info(`Session cleared for admin ${adminId}`)
        }
      }

      if (connection === 'open') {
        logger.info(`WhatsApp connected for admin ${adminId}`)
        instances.set(adminKey, {
          ...instance,
          status: INSTANCE_STATUS.CONNECTED,
          socket: sock,
          qr: null
        })
      }
    })

    // Save credentials whenever they update
    sock.ev.on('creds.update', saveCreds)

    // Update instance with socket reference
    const current = instances.get(adminKey)
    instances.set(adminKey, { ...current, socket: sock })

    return { status: INSTANCE_STATUS.CONNECTING, message: 'Connecting...' }

  } catch (error) {
    logger.error(`Failed to create instance for admin ${adminId}:`, error)
    instances.set(adminKey, {
      status: INSTANCE_STATUS.DISCONNECTED,
      socket: null,
      qr: null,
      adminId: adminKey
    })
    throw error
  }
}

/**
 * Get current status of an admin's WhatsApp instance
 */
export function getInstanceStatus(adminId) {
  const adminKey = String(adminId)
  const instance = instances.get(adminKey)
  
  if (!instance) {
    return { 
      status: INSTANCE_STATUS.DISCONNECTED, 
      qr: null,
      message: 'No instance found. Call /connect first.' 
    }
  }
  
  let phone = null
  if (instance.status === INSTANCE_STATUS.CONNECTED && instance.socket?.user?.id) {
    phone = instance.socket.user.id.split('@')[0].split(':')[0]
  }

  return {
    status: instance.status,
    qr: instance.qr || null,
    phone: phone,
    message: getStatusMessage(instance.status)
  }
}

function getStatusMessage(status) {
  const messages = {
    [INSTANCE_STATUS.DISCONNECTED]: 'Not connected',
    [INSTANCE_STATUS.CONNECTING]: 'Connecting to WhatsApp...',
    [INSTANCE_STATUS.QR_READY]: 'QR code ready — please scan',
    [INSTANCE_STATUS.CONNECTED]: 'Connected and ready',
    [INSTANCE_STATUS.LOGGED_OUT]: 'Logged out — please reconnect'
  }
  return messages[status] || 'Unknown status'
}

/**
 * Send a WhatsApp message
 */
export async function sendMessage(adminId, phone, message) {
  const adminKey = String(adminId)
  const instance = instances.get(adminKey)

  if (!instance || instance.status !== INSTANCE_STATUS.CONNECTED) {
    throw new Error(
      `WhatsApp not connected for admin ${adminId}. 
      Status: ${instance?.status || 'no instance'}`
    )
  }

  const jid = formatToWhatsAppJID(phone)
  
  try {
    await instance.socket.sendMessage(jid, { text: message })
    logger.info(`Message sent to ${phone} by admin ${adminId}`)
    return { success: true, phone, jid }
  } catch (error) {
    logger.error(`Failed to send message to ${phone}:`, error)
    throw error
  }
}

/**
 * Disconnect and clean up an instance
 */
export async function disconnectInstance(adminId) {
  const adminKey = String(adminId)
  const instance = instances.get(adminKey)
  
  if (instance?.socket) {
    await instance.socket.logout()
  }
  
  instances.delete(adminKey)
  
  // Clear session files
  const sessionDir = getSessionDir(adminId)
  if (fs.existsSync(sessionDir)) {
    fs.rmSync(sessionDir, { recursive: true, force: true })
  }
  
  logger.info(`Instance disconnected and cleared for admin ${adminId}`)
  return { success: true, message: 'Disconnected and session cleared' }
}

/**
 * Get all active instances summary (for super admin)
 */
export function getAllInstancesStatus() {
  const result = []
  for (const [adminId, instance] of instances.entries()) {
    result.push({
      admin_id: adminId,
      status: instance.status,
      has_qr: !!instance.qr
    })
  }
  return result
}

// Import formatter (needed inside this file)
import { formatToWhatsAppJID } from '../utils/phoneFormatter.js'
