import mongoose,{Schema} from "mongoose"
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"
import crypto from "crypto"

const userSchema = new Schema({
    avatar:{
        type:{
            url:String,
            localPath: String,
        },
        default:{
            url:`https://t3.ftcdn.net/jpg/19/65/91/66/240_F_1965916699_Ei8buTjkON3Qc3xHZmB0gAKGiVAL017L.jpg`,
            localpath :""
        }
    },
    username:{
        type:String,
        required:true,
        unique:true,
        lowercase:true,
        trim:true,
        index:true
    },
    email:{
        type:String,
        required:true,
        unique:true,
        lowercase:true,
        trim:true
    },
    fullname :{
        type:String,
        trim:true
    },
    password:{
        type:String,
        required:[true,"password is Required"],

    },
    isEmailVerified:{
        type:Boolean,
        default:false
    },
    refreshToken:{
        type:String,
    },
    forgotPasswordToken:{
        type:String,
    },
    forgotPasswordExpiry:{
        type: Date,
    },
    emailVerificationToken:{
        type:String
    },
    emailVerificationExpiry:{
        type:String
    }
},
{
    timestamps:true,
});

userSchema.pre("save",async function(next){
    if(!this.isModified("password")) return next();
    this.password = await bcrypt.hash(this.password,10);
    next();
})

userSchema.methods.isPasswordCorrect = async function(password) {
    return await bcrypt.compare(password,this.password);
}

userSchema.methods.generateAccessToken = function(){
    return jwt.sign(
        {
            _id:this._id,
            email:this.email,
            username:this.username
        },
        process.env.ACCESS_TOKEN_SECRET,
        {expiresIn:ProcessingInstruction.env.ACCESS_TOKEN_EXPIRY}
    )
}

userSchema.methods.generateRefreshToken = function(){
    return jwt.sign(
        {
            _id:this._id
        },
        process.env.REFRESH_TOKEN_SECRET,
        {expiresIn:ProcessingInstruction.env.REFRESH_TOKEN_EXPIRY}
    )
}

userSchema.methods.generateTemporaryToken = function(){
    const unHashedToken = crypto.randomBytes(20).toString("hex");
    const hashedToken =crypto
        .createHash("sha256") // method to create a hash
        .update(unHashedToken)// hashing token
        .digest("hex")
    const tokenExpiry = Date.now()+(20*60*1000);//20 mins
    return { unHashedToken,hashedToken,tokenExpiry };
}


export const User = mongoose.model("User, userSchema")