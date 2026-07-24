/**
 * Pre-Designed High-Converting WhatsApp Marketing Templates
 * Formatted for 1-Click Submission to Meta Graph API
 * Note: Meta prohibits emojis, variables, and formatting characters in TEXT headers & BUTTON text.
 */

module.exports = [
  {
    id: 'sys_abandoned_cart',
    title: '🛒 Abandoned Cart Recovery',
    category: 'MARKETING',
    language: 'en_US',
    badge: 'Sales Booster',
    description: 'Recover lost sales by sending a gentle reminder with a limited-time discount code.',
    components: [
      {
        type: 'HEADER',
        format: 'TEXT',
        text: 'Dont miss out on your order'
      },
      {
        type: 'BODY',
        text: 'Hi {{1}},\n\nYou left some items in your cart. Complete your purchase now and enjoy {{2}}% OFF!\n\nUse Code: {{3}}\n\nOffer valid for the next 24 hours only.'
      },
      {
        type: 'FOOTER',
        text: 'Reply STOP to unsubscribe'
      },
      {
        type: 'BUTTONS',
        buttons: [
          {
            type: 'QUICK_REPLY',
            text: 'Checkout Now'
          },
          {
            type: 'QUICK_REPLY',
            text: 'Help Me Choose'
          }
        ]
      }
    ]
  },
  {
    id: 'sys_flash_sale',
    title: '⚡ 24-Hour Flash Sale Deal',
    category: 'MARKETING',
    language: 'en_US',
    badge: 'Popular',
    description: 'Drive urgency and instant conversions with a high-impact flash sale announcement.',
    components: [
      {
        type: 'HEADER',
        format: 'TEXT',
        text: 'FLASH SALE IS LIVE'
      },
      {
        type: 'BODY',
        text: 'Hey {{1}}!\n\nOur biggest 24-hour Flash Sale is officially live. Get up to {{2}}% OFF across all items.\n\nExclusive Voucher Code: {{3}}\n\nGrab your favorites before stocks run out!'
      },
      {
        type: 'FOOTER',
        text: 'Graxion Premium Offers'
      },
      {
        type: 'BUTTONS',
        buttons: [
          {
            type: 'QUICK_REPLY',
            text: 'Shop Sale Deals'
          }
        ]
      }
    ]
  },
  {
    id: 'sys_festival_promo',
    title: '🎉 Festival Special Offer',
    category: 'MARKETING',
    language: 'en_US',
    badge: 'High Conversion',
    description: 'Celebrate special occasions and festivals with tailored promotional discounts for your users.',
    components: [
      {
        type: 'HEADER',
        format: 'TEXT',
        text: 'Happy Celebrations'
      },
      {
        type: 'BODY',
        text: 'Dear {{1}},\n\nWarm festive wishes from our team! To make your celebration extra special, we are giving you a flat {{2}}% discount on your next purchase.\n\nUse Promo Code: {{3}}'
      },
      {
        type: 'FOOTER',
        text: 'Terms and conditions apply'
      },
      {
        type: 'BUTTONS',
        buttons: [
          {
            type: 'QUICK_REPLY',
            text: 'Claim Offer'
          }
        ]
      }
    ]
  },
  {
    id: 'sys_appointment_reminder',
    title: '📅 Appointment Booking Confirmation',
    category: 'UTILITY',
    language: 'en_US',
    badge: 'Essential',
    description: 'Confirm upcoming meetings, consultations, or bookings with interactive response buttons.',
    components: [
      {
        type: 'HEADER',
        format: 'TEXT',
        text: 'Appointment Confirmation'
      },
      {
        type: 'BODY',
        text: 'Hello {{1}},\n\nYour appointment for {{2}} is confirmed for {{3}} at {{4}}.\n\nPlease arrive 10 minutes early. Let us know if you need to reschedule.'
      },
      {
        type: 'FOOTER',
        text: 'Automated Booking System'
      },
      {
        type: 'BUTTONS',
        buttons: [
          {
            type: 'QUICK_REPLY',
            text: 'Confirm Attendance'
          },
          {
            type: 'QUICK_REPLY',
            text: 'Reschedule'
          }
        ]
      }
    ]
  },
  {
    id: 'sys_vip_pass',
    title: '🌟 VIP Exclusive Loyalty Reward',
    category: 'MARKETING',
    language: 'en_US',
    badge: 'Retention',
    description: 'Reward top-tier customers with early product access and VIP perk invitations.',
    components: [
      {
        type: 'HEADER',
        format: 'TEXT',
        text: 'Exclusive VIP Invitation'
      },
      {
        type: 'BODY',
        text: 'Hi {{1}},\n\nAs one of our valued VIP members, you get early 24-hour access to our new collection launch before anyone else!\n\nPlus, take an extra {{2}}% OFF with your secret VIP code: {{3}}'
      },
      {
        type: 'FOOTER',
        text: 'VIP Privilege Club'
      },
      {
        type: 'BUTTONS',
        buttons: [
          {
            type: 'QUICK_REPLY',
            text: 'Unlock VIP Access'
          }
        ]
      }
    ]
  },
  {
    id: 'sys_order_dispatch',
    title: '🚚 Order Dispatched and Tracking',
    category: 'UTILITY',
    language: 'en_US',
    badge: 'Customer Care',
    description: 'Keep customers updated with real-time shipment status and tracking details.',
    components: [
      {
        type: 'HEADER',
        format: 'TEXT',
        text: 'Your Order is on the Way'
      },
      {
        type: 'BODY',
        text: 'Hi {{1}},\n\nGreat news! Your order #{{2}} has been packed and dispatched via {{3}}.\n\nEstimated delivery date: {{4}}.'
      },
      {
        type: 'FOOTER',
        text: 'Track status anytime'
      },
      {
        type: 'BUTTONS',
        buttons: [
          {
            type: 'QUICK_REPLY',
            text: 'Track Order'
          }
        ]
      }
    ]
  },
  {
    id: 'sys_payment_reminder',
    title: '💳 Payment and Invoice Notice',
    category: 'UTILITY',
    language: 'en_US',
    badge: 'Finance',
    description: 'Send gentle invoice and payment link reminders to avoid service interruptions.',
    components: [
      {
        type: 'HEADER',
        format: 'TEXT',
        text: 'Payment Notice'
      },
      {
        type: 'BODY',
        text: 'Hello {{1}},\n\nThis is a friendly reminder that invoice #{{2}} for amount {{3}} is due on {{4}}.\n\nPlease settle your payment to keep your services active.'
      },
      {
        type: 'FOOTER',
        text: 'Accounts and Billing Team'
      },
      {
        type: 'BUTTONS',
        buttons: [
          {
            type: 'QUICK_REPLY',
            text: 'Pay Now'
          }
        ]
      }
    ]
  },
  {
    id: 'sys_customer_review',
    title: '💬 Customer Feedback and Rating',
    category: 'MARKETING',
    language: 'en_US',
    badge: 'Feedback',
    description: 'Gather genuine customer reviews and ratings after order fulfillment.',
    components: [
      {
        type: 'HEADER',
        format: 'TEXT',
        text: 'How was your experience'
      },
      {
        type: 'BODY',
        text: 'Hi {{1}},\n\nThank you for choosing us! We hope you loved your recent purchase {{2}}.\n\nCould you spare 30 seconds to share your experience with us?'
      },
      {
        type: 'FOOTER',
        text: 'Your feedback matters'
      },
      {
        type: 'BUTTONS',
        buttons: [
          {
            type: 'QUICK_REPLY',
            text: 'Loved It'
          },
          {
            type: 'QUICK_REPLY',
            text: 'Need Support'
          }
        ]
      }
    ]
  }
];
