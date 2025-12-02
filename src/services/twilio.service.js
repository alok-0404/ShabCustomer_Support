import twilio from 'twilio';

class TwilioService {
  constructor() {
    this.accountSid = process.env.TWILIO_ACCOUNT_SID;
    this.authToken = process.env.TWILIO_AUTH_TOKEN;
    this.phoneNumber = process.env.TWILIO_PHONE_NUMBER;

    // Check if credentials exist - but don't throw error
    if (!this.accountSid || !this.authToken) {
      console.warn('⚠️ Twilio credentials are not configured - SMS features disabled');
      this.isEnabled = false;
      return;
    }

    try {
      this.client = twilio(this.accountSid, this.authToken);
      this.isEnabled = true;
      console.log('✅ Twilio service initialized successfully');
    } catch (error) {
      console.warn('❌ Twilio initialization failed:', error.message);
      this.isEnabled = false;
    }
  }

  async sendSMS(to, message) {
    if (!this.isEnabled) {
      console.warn('📵 SMS not sent - Twilio not configured');
      return { success: false, message: 'SMS service not configured' };
    }

    try {
      const result = await this.client.messages.create({
        body: message,
        from: this.phoneNumber,
        to: to
      });
      console.log('✅ SMS sent successfully:', result.sid);
      return { success: true, sid: result.sid };
    } catch (error) {
      console.error('❌ SMS sending failed:', error.message);
      return { success: false, error: error.message };
    }
  }
}

// Create and export singleton instance
const twilioService = new TwilioService();
export default twilioService;
