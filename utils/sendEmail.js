const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT),
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Verify transporter on startup
transporter.verify((error) => {
  if (error) {
    console.error("❌ Email transporter error:", error.message);
  } else {
    console.log("✅ Email transporter ready");
  }
});

// Store owner will recieve the email when the customer submit form from the frontend contact form

const sendAdminEmail = async (data) => {
  const { firstName, lastName, email, message } = data;

  return transporter.sendMail({
    from: `"Contact Form" <${process.env.EMAIL_USER}>`,
    to: process.env.ADMIN_EMAIL,
    subject: "New Contact Request",
    html: `
      <h2>New Contact Request</h2>
      <p><strong>Name:</strong> ${firstName} ${lastName}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p>${message}</p>
    `,
  });
};

// Customer will recieve an confirmation email after submitting message in frontend contact form

const sendCustomerEmail = async (data) => {
  const { firstName, email } = data;

  return transporter.sendMail({
    from: `"Bengal Spicy Food" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "We received your message",
    html: `
      <p>Hi ${firstName},</p>
      <p>Thank you for contacting us. We have received your message and will get back to you shortly.</p>
      <p>— Team Bengal Spicy Food</p>
    `,
  });
};

// Send reply email from admin when he reply from the dashboard

const sendCustomerReplyEmail = async (data) => {
  const { firstName, email, message, subject } = data;

  return transporter.sendMail({
    from: `"Bengal Spicy Food" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Reply to your message",
    html: `
      <p>Hi ${firstName},</p>
      <p>${message}</p>
      <p>— Team Bengal Spicy Food</p>
    `,
  });
};

module.exports = {
  sendAdminEmail,
  sendCustomerEmail,
  sendCustomerReplyEmail
};
