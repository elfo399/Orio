import { Injectable, ServiceUnavailableException } from '@nestjs/common';

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character] ?? character);
}

@Injectable()
export class ResendEmailService {
  isConfigured(): boolean { return Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM); }

  async sendPasswordReset(input: { to: string; displayName: string; resetUrl: string }): Promise<void> {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.RESEND_FROM;
    if (!apiKey || !from) throw new ServiceUnavailableException('Password reset email is not configured.');
    const name = escapeHtml(input.displayName);
    const safeUrl = escapeHtml(input.resetUrl);
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from, to: [input.to], subject: 'Reset your ORIO password',
        html: `<main style="font-family:Arial,sans-serif;color:#294336;max-width:560px;margin:auto"><h1 style="margin-bottom:8px">A small reset for your world</h1><p>Hello ${name},</p><p>Use the button below to choose a new ORIO password. This link expires in 30 minutes and can only be used once.</p><p style="margin:28px 0"><a href="${safeUrl}" style="background:#4c765d;color:#fff;text-decoration:none;padding:13px 20px;border-radius:12px;font-weight:bold">Reset password</a></p><p>If you did not request this, you can safely ignore this email.</p></main>`,
        text: `Hello ${input.displayName},\n\nReset your ORIO password within 30 minutes: ${input.resetUrl}\n\nIf you did not request this, you can safely ignore this email.`,
        tags: [{ name: 'category', value: 'password_reset' }]
      }),
      signal: AbortSignal.timeout(10_000)
    });
    if (!response.ok) {
      console.error(`Resend rejected the password-reset email (HTTP ${response.status}).`);
      throw new ServiceUnavailableException('Password reset email could not be sent.');
    }
  }
}
