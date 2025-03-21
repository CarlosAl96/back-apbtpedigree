const nodemailer = require("nodemailer");
require("dotenv").config();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendResetEmail = async (email, token) => {
  const resetLink = `${process.env.FRONTEND_URL}auth/new-password/${token}`;

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Restablecer contraseña",
    html: `<p>Haz clic en el siguiente enlace para restablecer tu contraseña: <a href="${resetLink}">Restablecer contraseña</a></p><p>Si no solicitaste esto, ignora este mensaje.</p>`,
  };

  await transporter.sendMail(mailOptions);
};

module.exports = sendResetEmail;
