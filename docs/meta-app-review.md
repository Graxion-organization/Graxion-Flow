# Meta App Review Compliance Checklist

Before your WhatsApp API application can be used by third-party businesses (your B2B clients) without restriction, you must pass the Meta App Review.

This document serves as the compliance and submission checklist.

## 1. Required Permissions
When submitting your app in the Meta App Dashboard, you must request the following permissions:
- `whatsapp_business_management`: Required to fetch WABA IDs, register phone numbers, and manage templates.
- `whatsapp_business_messaging`: Required to send and receive messages on behalf of the businesses.

## 2. Business Verification
- Your own Meta Business Manager must be fully **Verified**.
- You will need to upload your company's registration documents (Certificate of Incorporation, Utility Bill) to Meta.

## 3. Screencast Requirements
Meta reviewers will not test the integration themselves. You must provide a clear MP4 screencast demonstrating how a business user uses your software to connect their WhatsApp account.

**Screencast Outline:**
1. Show the user logging into your platform.
2. Show the user clicking "Connect WhatsApp" which triggers the Embedded Signup flow.
3. Show the permissions dialog where the user grants access.
4. Show your dashboard successfully receiving the WABA ID and Phone Number.
5. Show the user sending a test message from your dashboard to their phone.

## 4. Privacy Policy & Terms of Service
- Your website **MUST** have a publicly accessible Privacy Policy and Terms of Service.
- The Privacy Policy must explicitly state how you handle Meta user data and WhatsApp message contents.
- The URL to these documents must be added in the Meta App Dashboard > Basic Settings.

## 5. Webhook Security
- Meta requires your webhook endpoints to use HTTPS (which we have configured via Nginx/SSL).
- You must verify incoming payloads using the `X-Hub-Signature-256` header (implemented in our Webhook handler).

## 6. Rate Limits & Quality
- Be aware that initially, new phone numbers are restricted to **250 business-initiated conversations per 24 hours**.
- As the quality rating (`GREEN`/`YELLOW`/`RED`) remains high and message volume increases organically, Meta will automatically bump limits to 1K, 10K, and 100K.

---
*Follow these steps carefully to ensure a smooth transition from Development mode to Live mode.*
