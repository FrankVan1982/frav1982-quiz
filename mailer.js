//=========================================
// File name: mailer.js
//-----------------------------------------
// Project : QuizFaber 
// Licence : MIT
// Author  : Luca Galli
// Email   : info@quizfaber.com
//=========================================

// Particularly 2 issues: 
// or you don't have enabled Less Secure Apps https://myaccount.google.com/lesssecureapps 
// or you don't have enabled Display Unlock Captcha https://accounts.google.com/DisplayUnlockCaptcha
// you need to turn on both of them.

var nodemailer = require('nodemailer');

const qfLogger = require('./logger');


var transporter = nodemailer.createTransport({
    service: process.env.MAIL_SENDER_SERVICE,
    //host: process.env.MAIL_SENDER_HOST,
    //port: process.env.MAIL_SENDER_PORT,
    auth: {
        user: process.env.MAIL_SENDER_LOGIN,
        pass: process.env.MAIL_SENDER_PASSWORD
    }
});


SendEmail = (mailTo, mailSubject, mailBody) =>
{
    qfLogger.Log("Sending email to " + mailTo + " with subject " + mailSubject + " , body length=" + mailBody.length);

    var mailOptions = {
        from: process.env.MAIL_SENDER_ADDRESS,
        to: mailTo,
        subject: mailSubject,
        html: mailBody
    };

    // remove for security
    return transporter.sendMail(mailOptions);  // returns a Promise object
}

SendAlertNotification = (errMsg, remoteAddress) =>
{
    qfLogger.Log("Alert notification to email : " + process.env.MAIL_ADMIN_ADDRESS);

    var mailOptions = {
        from: process.env.MAIL_SENDER_ADDRESS,
        to: process.env.MAIL_ADMIN_ADDRESS,
        subject: process.env.MAIL_ADMIN_SUBJECT_NOTIFY_ERR,
        html: "<ul><li>client address: " + remoteAddress + "</li><li>error message: " + errMsg + "</li></ul>"
    };

    // remove for security
    return transporter.sendMail(mailOptions);  // returns a Promise object
}


AlertNotification = (errMsg, remoteAddress) =>
{
    SendAlertNotification(errMsg, remoteAddress)
		.then((error) => {
            if (!CheckSendEmailToAdmin(error))
            {
                qfLogger.LogError("Send mail failed : " + error);
			}
		})
		.catch(err => {
            qfLogger.LogError("Exception in send mail : " + err);
		});	
}


//{
//    "accepted": ["galli.luca@gmail.com"],
//    "rejected": [],
//    "envelopeTime": 285,
//    "messageTime": 526,
//    "messageSize": 480,
//    "response": "250 2.0.0 OK 1636631617 ch13sm1391216edb.97 - gsmtp",
//    "envelope": {
//        "from": "galli.luca@gmail.com",
//        "to": ["galli.luca@gmail.com"]
//    },
//    "messageId": "<0f061100-5b56-4999-ef4f-43f15a24d690@gmail.com>"
//}

CheckSendEmailToAdmin = (error) =>
{   
    return CheckSendEmail(error, process.env.MAIL_ADMIN_ADDRESS);
}

CheckSendEmail = (error,mailTo) =>
{
    if (error) {
        if (error.hasOwnProperty('accepted')) {
            if ((error.accepted.length === 1) && (error.accepted[0] === mailTo))
            {
                if (error.hasOwnProperty('response'))
                {
                    if (error.response.includes(' OK ')) {
                        return true;
                    }
                }
            }
        }
    }
    return false;
}

module.exports = { SendEmail, CheckSendEmail, AlertNotification }