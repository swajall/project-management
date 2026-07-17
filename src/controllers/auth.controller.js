import { User } from "../models/user.model.js"
import { ApiResponse } from "../utils/api-response.js"
import { ApiError } from "../utils/api-error.js"
import { asyncHandler } from "../utils/async-handler.js";
import { emailVerificationMailContent, forgotPasswordMailContent, sendEmail } from"../utils/mail.js"
import { application } from "express";
import jwt from "jsonwebtoken";

const generateAccessAndRefreshTokens= async (userId) => {
    try {
        const user  = await User.findById(userId)
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();
        
        user.refreshToken = refreshToken
        await user.save({validateBeforeSave:false})
        return {accessToken,refreshToken}
    } catch (error){
        throw new ApiError(
            500,
            "SomeThing went wrong while generating access token"
        )
    }
}

const registerUser = asyncHandler(async (req,res) => {
    const {email,username,password,role} = req.body
    
    const existedUser = await User.findOne({
        $or: [{username},{email}],
    })

    if(existedUser){
        throw new ApiError(409,"User with email or username already exists",[])
    }

    const user = await User.create({
        email,
        password,
        username,
        isEmailVerified:false
    })

    const { unHashedToken,hashedToken,tokenExpiry } = user.generateTemporaryToken();


    user.emailVerificationToken = hashedToken
    user.emailVerificationExpiry = tokenExpiry

    await user.save({validateBeforeSave:false})

    await sendEmail(
        {
            email:user?.email,
            subject:"Please verify your email",
            mailgenContent:emailVerificationMailContent(
                user.username,
                `${req.protocol}://${req.get("host")}/api/v1/users/verify-email/${unHashedToken}`
            )
        }
    )
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken -emailVerificationToken -emailVerificationExpiry",
    )

    if(!createdUser){
        throw new ApiError(500,"Something went wrong while registering the user")
    }

    return res
        .status(201)
        .json(
            new ApiResponse(
                200,
                {user: createdUser},
                "user registered Successfully"
            )
        )
})

const login = asyncHandler(async(req,res) => {
    const {email,password,username} = req.body
    if(!email){
        throw new ApiError(400,"Username or email is Required")
    }

    const user = await User.findOne({ email });

    if(!user){
        throw new ApiError(400,"User Does Not Exists")
    }

    const isPasswordValid = await user.isPasswordCorrect(password);

    if(!isPasswordValid){
        throw new ApiError(400,"Invalid Credentials");
    }

    const {accessToken,refreshToken} = await generateAccessAndRefreshTokens(user._id)

    const loggedInUser = await User.findById(user._id).select(
        "-password -refreshToken -emailVerificationToken -emailVerificationExpiry",
    )

    const options={
        httpOnly:true,
        secure:true
    }

    return res
      .status(200)
      .cookie("accessToken",accessToken,options)
      .cookie("refreshToken",refreshToken,options)
      .json(
        new ApiResponse(
            200,
            {
                user: loggedInUser,
                accessToken,
                refreshToken
            },
            "User Logged in Successfully"
            
        )
      )

})

const logoutUser = asyncHandler(async(req,res)=>{
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                refreshToken :""
            }
        },
        {
            new:true,
        }
    );
    const options ={
        httpOnly:true,
        secure:true
    }
    return res
        .status(200)
        .clearCookie("accessToken",options)
        .clearCookie("refreshToken",options)
        .json(new ApiResponse(200,{},"User Logged Out"))

})

const getCurrentUser = asyncHandler(async(req,res) => {
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                req.user,
                "Current user fetched successfully"
            )
        )
})

const verifyEmail = asyncHandler(async(req,res) =>{
    const {verificationToken} = req.params;

    if(!verificationToken){
        throw new ApiError(400,"Email verification")
    }

    let hashedToken = crypto
        .createHash("sha256")
        .update(verificationToken)
        .digest("hex")
    
    const user = await User.findOne({
        emailVerificationToken:hashedToken,
        emailVerificationExpiry: {$gt : Date.now()}
    })

    if(!user){
        throw new ApiError(400,"Token is invalid or expired")
    }
    
    user.isEmailVerified = undefined;
    user.emailVerificationExpiry = undefined;

    user.isEmailVerified=true;
    await user.save({validateBeforeSave:false});
    return res  
        .status()
        .json(
            200,
            {
                isEmailVerified:true
            },
            "Email is verified"
        )
})

const resendEmailVerification = asyncHandler(async (req,res) => {
    const user = await User.findById(req.user?._id);

    if(!user){
        throw new ApiError(404,"User Does not exist")
    }

    if(user.isEmailVerified){
        throw new ApiError(409,"User Does Not Exist")
    }

    const { unHashedToken,hashedToken,tokenExpiry } = user.generateTemporaryToken();


    user.emailVerificationToken = hashedToken
    user.emailVerificationExpiry = tokenExpiry

    await user.save({validateBeforeSave:false})

    await sendEmail(
        {
            email:user?.email,
            subject:"Please verify your email",
            mailgenContent:emailVerificationMailContent(
                user.username,
                `${req.protocol}://${req.get("host")}/api/v1/users/verify-email/${unHashedToken}`
            )
        }
    )
})

const refreshAccesstoken = asyncHandler(async(req,res) =>{
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if(!incomingRefreshToken){
        throw new ApiError(401,"Unauthorised Access")
    }
    
    try{
        const decoded_token= jwt.verify(incomingRefreshToken,process.env.RFRESH_TOKEN_SECRET)
        
        const user = await User.findById(decodedToken?._id);
        if(!user){
            throw new ApiError(401,"invalid refresh token")
        }
        
        if(incomingRefreshToken !== user?.refreshToken){
            throw new ApiError(401,"invalid refresh token")
        }

        const options = {
            httpOnly:true,
            secure:true
        }

        const {accessToken,refreshToken:newRefreshToken} = await
        generateAccessAndRefreshTokens(user._id)


        user.refreshToken= newRefreshToken;

        await user.save()

        return res
            .status(200)
            .cookie("accessToken",accessToken,options)
            .cookie("refreshToken",newRefreshToken,options)
            .json(
                new ApiResponse(
                    200,
                    {
                        accessToken,
                        refreshToken:newRefreshToken
                    },
                    "Access Token refreshed"
                )
            )



    }catch(error){
        throw new ApiError(401,"Invalid refresh Token")
    }
})

const forgotPasswordRequest = asyncHandler(async(req,res) => {
    const {email} = req.body
    const user = await User.findOne({email})

    if(!user){
        throw new ApiError(404,"User does not exist",[])
    }

    const {unHashedToken,hashedToken,tokenExpiry} = user.generateTemporaryToken();
    user.forgotPasswordExpiry = tokenExpiry

    await user.save({validateBeforeSave:false});

    await sendEmail({
        email:user?.email,
            subject:"Password Reset Request",
            mailgenContent:forgotPasswordMailContent(
                user.username,
                `${process.env.FORGOT_PASSWORD_REDIRECT_URL}/${unHashedToken}`

            )
    });

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {},
                "",
                "password reset mail has been sent to your mail id"
            )
        )
})

const resetForgotPassword = asyncHandler(async(req,res) => {
    const{resetToken} = req.pasrams
    const{newPassword} = req.body

    let hashedToken =crypto
        .createHash("sha256")
        .update(resetToken)
        .digest("hex")

    await User.findOne({
        forgotPasswrodToken:hashedToken,
        forgotPasswordExpiry:{$gt:Date.now()}
    })

    if(!user){
        throw new ApiError(489,"Token is invalid or expired")
    }

    user.forgotPasswordExpiry=undefined
    user.forgotPasswrodToken=undefined

    user.password = newPassword
    await user.save({validateBeforeSave:false})

    return res
        .status(200)
        .json(new ApiResponse(200,{},"password reset successfully"));
})

const changeCurrentPassword = asyncHandler(async(req,res) => {
    const {oldPassWord,newPassword} = req.body
    const user = await User.findById(req.user?._id);

    const isPasswordValid = await user.isPasswordCorrect(oldPassWord);
    if(!isPasswordValid){
        throw new ApiError(400,"Invalid old PassWord")
    }

    user.password=newPassword
    await user.save({validateBeforeSave:false})

    return res
        .status(200)
        .json(new ApiResponse(
            200,
            {},
            "Password changed successfully"
        ))
})

export { registerUser,
         login, 
         logoutUser, 
         getCurrentUser, 
         verifyEmail,
         resendEmailVerification,
         refreshAccesstoken,
         forgotPasswordRequest,
         resetForgotPassword,
         changeCurrentPassword
        };

