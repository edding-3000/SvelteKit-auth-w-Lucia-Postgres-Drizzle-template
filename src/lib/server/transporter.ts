import nodemailer from "nodemailer";
import { GMAIL_EMAIL, GMAIL_PASSWORD } from '$env/static/private'

export const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: GMAIL_EMAIL,
    pass: GMAIL_PASSWORD,
  },
});