import mongoose,{Schema} from "mongoose"
import bcrypt from "bcrypt"

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

export const User = mongoose.model("user, userSchema")