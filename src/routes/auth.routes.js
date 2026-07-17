import { Router } from "express";
import { registerUser,login,logoutUser, verifyEmail, refreshAccesstoken, forgotPasswordRequest, resetForgotPassword, getCurrentUser, resendEmailVerification } from "../controllers/auth.controller.js"
import { validate } from "../middlewares/validator.middleware.js";
import { userRegisterValidator,userLoginValidator,userForgotPasswordValidator, userResetForgotPasswordValidator ,userChangeCurrentPasswordValidator} from "../validators/index.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

//unsecured routes
router.route("/register").post(userRegisterValidator(),validate,registerUser);

router.route("/login").post(userLoginValidator(), validate, login);

router.route("/verify-email/:verificationToken").get(verifyEmail);

router.route("/refresh-token").post(refreshAccesstoken);

router.route("/forgot-password").post(userForgotPasswordValidator(),validate,forgotPasswordRequest);

router.route("/reset-password/:resetToken").post(userResetForgotPasswordValidator(),validate,resetForgotPassword);



//secured routes
router.route("/logout").post(verifyJWT,logoutUser);

router.route("/current-user").post(verifyJWT,getCurrentUser);

router.route("/change-password").post(verifyJWT,userChangeCurrentPasswordValidator(),getCurrentUser);

router.route("/resend-email-verification").post(verifyJWT,resendEmailVerification);

export default router;
//testing
