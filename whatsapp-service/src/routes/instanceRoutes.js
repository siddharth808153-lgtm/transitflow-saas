import express from 'express'
import { connect, status, disconnect, allInstances } from '../controllers/instanceController.js'

const router = express.Router()

router.post('/connect', connect)
router.get('/status/:admin_id', status)
router.post('/disconnect', disconnect)
router.get('/all', allInstances)

export default router
