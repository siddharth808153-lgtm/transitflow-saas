/**
 * Formats a phone number to WhatsApp JID format
 * Input: "9876543210" or "+919876543210" or "919876543210"
 * Output: "919876543210@s.whatsapp.net"
 */
export function formatToWhatsAppJID(phone) {
  // Remove all non-numeric characters
  let cleaned = phone.replace(/\D/g, '')
  
  // If 10 digits (Indian number without country code): add 91
  if (cleaned.length === 10) {
    cleaned = '91' + cleaned
  }
  
  // If starts with 0: remove leading 0 and add 91
  if (cleaned.startsWith('0') && cleaned.length === 11) {
    cleaned = '91' + cleaned.slice(1)
  }

  return cleaned + '@s.whatsapp.net'
}

/**
 * Validates if a string looks like a valid phone number
 */
export function isValidPhone(phone) {
  const cleaned = phone.replace(/\D/g, '')
  return cleaned.length >= 10 && cleaned.length <= 13
}
