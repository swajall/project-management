import Mailgen from "mailgen"
import nodemailer from "nodemailer"


const sendEmail =async(options) =>{
    const mailgenerator = new Mailgen({
        product:{
            name:"Task Manager",
            link:"https://taskmanagelink.com"
        }
    });
    const emailTextual = mailgenerator.generatePlaintext(options.mailgenContent)
    
    const emailHTML = mailgenerator.generate(options.mailgenContent)

    const transporter = nodemailer.createTransport({
        host: process.env.MAILTRAP_SMTP_HOST,
        port: process.env.MAILTRP_SMTP_PORT,
        auth:{
            user:process.env.MAILTRAP_SMTP_USER,
            pass:process.env.MAILTRAP_SMTP_PASS
        }
    })

    const mail = {
        from:"mail.taskmanger@example.com",
        to:options.email,
        subject:options.subject,
        text:emailTextual,
        html:emailHTML
    }

    try{
        await transporter.sendMail(mail)
    }catch(error){
        console.error("email service failed",error);
    }

}



const emailVerificationMailContent = (username,verificationURL) =>{
    return {
        body : {
            name:username,
            into:"welcome to Our App we are Excited to have you on Board",
            action:{
                instructions : "To verify your email please click on the button below",
                button:{
                    color:"22BC66",
                    text:"Verify your email",
                    link:verificationURL
                }
            },
            outro: "For help Reply to this email we would love to offer any kind of assistance❤️"
        }
    }
}

const forgotPasswordMailContent = (username,passwordResetURL) =>{
    return {
        body : {
            name:username,
            into:"We got a request to reset the password of your account",
            action:{
                instructions : "To Reset your password please click on the button below",
                button:{
                    color:"22BC66",
                    text:"Reset your email",
                    link:passwordResetURL
                }
            },
            outro: "For help Reply to this email we would love to offer any kind of assistance❤️"
        }
    }
}

export{
    emailVerificationMailContent,
    forgotPasswordMailContent,
    sendEmail
}