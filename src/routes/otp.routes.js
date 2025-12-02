import { Router } from 'express';
import otpService from '../services/otp.service.js';

const router = Router();

router.post('/send', async (req, res) => {
  try {
    const { phoneNumber, channel, provider, useTemplate } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({ success: false, error: 'Phone number is required' });
    }

    const result = await otpService.sendOTP(phoneNumber, { channel, provider, useTemplate });

    if (!result.success) {
      return res.status(502).json({ success: false, error: result.error });
    }

    return res.json({
      success: true,
      sid: result.sid,
      status: result.status,
      provider: result.provider,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
});

router.post('/verify', async (req, res) => {
  try {
    const { phoneNumber, otp, channel, provider } = req.body;

    if (!phoneNumber || !otp) {
      return res.status(400).json({ success: false, error: 'Phone number and OTP are required' });
    }

    const result = await otpService.verifyOTP(phoneNumber, otp, { channel, provider });

    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }

    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
});

export default router;

