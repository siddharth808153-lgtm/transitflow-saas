export function requireServiceSecret(req, res, next) {
  const secret = req.headers['x-service-secret']
  
  if (!secret || secret !== process.env.SERVICE_SECRET) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized. Invalid or missing service secret.'
    })
  }
  
  next()
}
