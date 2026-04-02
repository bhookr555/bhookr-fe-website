/**
 * Subscription Status Change Email Templates
 */

export interface SubscriptionStatusData {
  customerName: string;
  planName: string;
  startDate?: Date;
  endDate?: Date;
  reason?: string;
}

export function generateSubscriptionPausedEmail(data: SubscriptionStatusData) {
  const subject = `Subscription Paused - ${data.planName}`;
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #f59e0b; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; }
    .info-box { background: #fef3c7; padding: 15px; border-left: 4px solid #f59e0b; margin: 20px 0; border-radius: 4px; }
    .cta-button { display: inline-block; background: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="header">
    <h1>⏸️ Subscription Paused</h1>
  </div>
  <div class="content">
    <p>Hi <strong>${data.customerName}</strong>,</p>
    <p>Your subscription <strong>${data.planName}</strong> has been paused as requested.</p>
    <div class="info-box">
      <p><strong>What this means:</strong></p>
      <ul>
        <li>Meal deliveries are temporarily stopped</li>
        <li>No charges will be made during pause period</li>
        <li>You can resume anytime from your dashboard</li>
      </ul>
    </div>
    <p>Ready to continue? You can resume your subscription anytime.</p>
    <center>
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/my-subscription" class="cta-button">Resume Subscription</a>
    </center>
  </div>
</body>
</html>
  `;
  
  const text = `
Subscription Paused

Hi ${data.customerName},

Your subscription "${data.planName}" has been paused as requested.

What this means:
- Meal deliveries are temporarily stopped
- No charges will be made during pause period
- You can resume anytime from your dashboard

Resume anytime at: ${process.env.NEXT_PUBLIC_APP_URL}/my-subscription
  `;
  
  return { subject, html, text };
}

export function generateSubscriptionResumedEmail(data: SubscriptionStatusData) {
  const subject = `Subscription Resumed - ${data.planName}`;
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #10b981; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; }
    .info-box { background: #d1fae5; padding: 15px; border-left: 4px solid #10b981; margin: 20px 0; border-radius: 4px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>▶️ Subscription Resumed</h1>
  </div>
  <div class="content">
    <p>Hi <strong>${data.customerName}</strong>,</p>
    <p>Great news! Your subscription <strong>${data.planName}</strong> has been resumed.</p>
    <div class="info-box">
      <p><strong>Your meals will start from:</strong> ${data.startDate?.toLocaleDateString('en-IN') || 'Tomorrow'}</p>
    </div>
    <p>We'll send you delivery notifications before each meal. Welcome back!</p>
  </div>
</body>
</html>
  `;
  
  const text = `
Subscription Resumed

Hi ${data.customerName},

Great news! Your subscription "${data.planName}" has been resumed.

Your meals will start from: ${data.startDate?.toLocaleDateString('en-IN') || 'Tomorrow'}

We'll send you delivery notifications before each meal. Welcome back!
  `;
  
  return { subject, html, text };
}

export function generateSubscriptionExpiredEmail(data: SubscriptionStatusData) {
  const subject = `Subscription Expired - ${data.planName}`;
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #6b7280; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; }
    .cta-button { display: inline-block; background: #ef4444; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Subscription Ended</h1>
  </div>
  <div class="content">
    <p>Hi <strong>${data.customerName}</strong>,</p>
    <p>Your subscription <strong>${data.planName}</strong> ended on ${data.endDate?.toLocaleDateString('en-IN')}.</p>
    <p>We hope you enjoyed our healthy meals! Ready to continue your wellness journey?</p>
    <center>
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/subscribe" class="cta-button">Renew Subscription</a>
    </center>
  </div>
</body>
</html>
  `;
  
  const text = `
Subscription Ended

Hi ${data.customerName},

Your subscription "${data.planName}" ended on ${data.endDate?.toLocaleDateString('en-IN')}.

We hope you enjoyed our healthy meals! Ready to continue your wellness journey?

Renew at: ${process.env.NEXT_PUBLIC_APP_URL}/subscribe
  `;
  
  return { subject, html, text };
}

export function generatePlanChangeEmail(data: SubscriptionStatusData & {
  oldPlan: string;
  newPlan: string;
  changeType: 'upgrade' | 'downgrade';
  proratedAmount?: number;
  effectiveDate: Date;
}) {
  const isUpgrade = data.changeType === 'upgrade';
  const subject = `Plan ${isUpgrade ? 'Upgraded' : 'Downgraded'} - ${data.newPlan}`;
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: ${isUpgrade ? '#10b981' : '#3b82f6'}; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; }
    .change-box { background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .plan-change { display: flex; align-items: center; justify-content: center; gap: 15px; font-size: 18px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${isUpgrade ? '⬆️ Plan Upgraded!' : '⬇️ Plan Changed'}</h1>
  </div>
  <div class="content">
    <p>Hi <strong>${data.customerName}</strong>,</p>
    <p>Your subscription plan has been ${isUpgrade ? 'upgraded' : 'changed'} successfully.</p>
    <div class="change-box">
      <div class="plan-change">
        <span><strong>${data.oldPlan}</strong></span>
        <span>→</span>
        <span><strong>${data.newPlan}</strong></span>
      </div>
      <p style="text-align: center; margin-top: 15px;">
        <strong>Effective from:</strong> ${data.effectiveDate.toLocaleDateString('en-IN')}
      </p>
      ${data.proratedAmount ? `
      <p style="text-align: center; margin-top: 10px;">
        <strong>Pro-rated ${isUpgrade ? 'charge' : 'credit'}:</strong> ₹${data.proratedAmount.toLocaleString()}
      </p>
      ` : ''}
    </div>
    <p>${isUpgrade ? 'Enjoy your enhanced meal plan!' : 'Your new plan will start from next delivery.'}</p>
  </div>
</body>
</html>
  `;
  
  const text = `
Plan ${isUpgrade ? 'Upgraded' : 'Changed'}

Hi ${data.customerName},

Your subscription plan has been ${isUpgrade ? 'upgraded' : 'changed'} successfully.

${data.oldPlan} → ${data.newPlan}

Effective from: ${data.effectiveDate.toLocaleDateString('en-IN')}
${data.proratedAmount ? `Pro-rated ${isUpgrade ? 'charge' : 'credit'}: ₹${data.proratedAmount.toLocaleString()}` : ''}

${isUpgrade ? 'Enjoy your enhanced meal plan!' : 'Your new plan will start from next delivery.'}
  `;
  
  return { subject, html, text };
}
