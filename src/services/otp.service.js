import '../config/env.js';
import twilioService from './twilio.service.js';

class OTPService {
  constructor() {
    this.cache = new Map();
    this.defaultChannel = process.env.OTP_CHANNEL || 'whatsapp';
    this.defaultProvider = (process.env.OTP_PROVIDER || 'verify').toLowerCase();
    this.defaultExpiryMinutes = Number(process.env.OTP_EXPIRY_MINUTES || 5);
  }

  resolveChannel(channel) {
    const resolved = (channel || this.defaultChannel || 'whatsapp').toLowerCase();

    if (!['whatsapp', 'sms'].includes(resolved)) {
      throw new Error('Unsupported OTP channel. Use "whatsapp" or "sms".');
    }

    return resolved;
  }

  resolveProvider(provider) {
    const resolved = (provider || this.defaultProvider || 'verify').toLowerCase();

    if (!['verify', 'messaging'].includes(resolved)) {
      throw new Error('Unsupported OTP provider. Use "verify" or "messaging".');
    }

    return resolved;
  }

  generateOTP() {
    return String(Math.floor(100000 + Math.random() * 900000));
  }

  async sendOTP(phoneNumber, { channel, provider, useTemplate } = {}) {
    const resolvedChannel = this.resolveChannel(channel);
    const resolvedProvider = this.resolveProvider(provider);

    if (resolvedProvider === 'verify') {
      return this.sendViaVerify(phoneNumber, resolvedChannel);
    }

    return this.sendViaMessaging(phoneNumber, resolvedChannel, { useTemplate });
  }

  async sendViaVerify(phoneNumber, channel) {
    try {
      const verification = await twilioService.sendVerifyOTP(phoneNumber, channel);
      return { success: true, sid: verification.sid, status: verification.status, provider: 'verify' };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Failed to send OTP via Verify',
      };
    }
  }

  async sendViaMessaging(phoneNumber, channel, { useTemplate } = {}) {
    const otp = this.generateOTP();
    const expiresAt = Date.now() + this.defaultExpiryMinutes * 60 * 1000;

    this.cache.set(phoneNumber, { otp, expiresAt });

    try {
      const response = useTemplate
        ? await twilioService.sendTemplateOTP(phoneNumber, otp, this.defaultExpiryMinutes, channel)
        : await twilioService.sendSimpleOTP(phoneNumber, otp, this.defaultExpiryMinutes, channel);

      return { success: true, sid: response.sid, provider: 'messaging' };
    } catch (error) {
      this.cache.delete(phoneNumber);
      return {
        success: false,
        error: error.message || 'Failed to send OTP via Messaging',
      };
    }
  }

  async verifyOTP(phoneNumber, code, { channel, provider } = {}) {
    const resolvedChannel = this.resolveChannel(channel);
    const resolvedProvider = this.resolveProvider(provider);

    if (resolvedProvider === 'verify') {
      return this.verifyViaVerify(phoneNumber, code, resolvedChannel);
    }

    return this.verifyViaMessaging(phoneNumber, code);
  }

  async verifyViaVerify(phoneNumber, code, channel) {
    try {
      const check = await twilioService.checkVerifyOTP(phoneNumber, code, channel);

      if (check.status === 'approved') {
        return { success: true };
      }

      return {
        success: false,
        error: check.status === 'pending' ? 'Incorrect OTP' : `Verification status: ${check.status}`,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Failed to verify OTP',
      };
    }
  }

  verifyViaMessaging(phoneNumber, code) {
    const record = this.cache.get(phoneNumber);

    if (!record) {
      return { success: false, error: 'OTP expired or not found' };
    }

    const { otp, expiresAt } = record;

    if (Date.now() > expiresAt) {
      this.cache.delete(phoneNumber);
      return { success: false, error: 'OTP expired or not found' };
    }

    if (otp !== code) {
      return { success: false, error: 'Invalid OTP' };
    }

    this.cache.delete(phoneNumber);
    return { success: true };
  }
}

const otpService = new OTPService();

export default otpService;

