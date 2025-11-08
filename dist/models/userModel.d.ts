import { Document, Model } from "mongoose";
export interface IUser extends Document {
    email: string;
    password: string;
    name: string;
    role: "admin" | "user";
    refreshToken?: string | undefined;
    createdAt: Date;
    updatedAt: Date;
    comparePassword(candidatePassword: string): Promise<boolean>;
}
export declare const User: Model<IUser>;
//# sourceMappingURL=userModel.d.ts.map