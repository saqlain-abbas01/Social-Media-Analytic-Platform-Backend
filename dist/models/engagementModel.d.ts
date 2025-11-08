import mongoose from "mongoose";
declare const _default: mongoose.Model<{
    userId: mongoose.Types.ObjectId;
    createdAt: NativeDate;
    timestamp: NativeDate;
    postId: mongoose.Types.ObjectId;
    platform?: string | null;
    metrics?: {
        likes?: number | null;
        comments?: number | null;
        shares?: number | null;
        clicks?: number | null;
        impressions?: number | null;
    } | null;
    hourOfDay?: number | null;
    dayOfWeek?: number | null;
}, {}, {}, {}, mongoose.Document<unknown, {}, {
    userId: mongoose.Types.ObjectId;
    createdAt: NativeDate;
    timestamp: NativeDate;
    postId: mongoose.Types.ObjectId;
    platform?: string | null;
    metrics?: {
        likes?: number | null;
        comments?: number | null;
        shares?: number | null;
        clicks?: number | null;
        impressions?: number | null;
    } | null;
    hourOfDay?: number | null;
    dayOfWeek?: number | null;
}, {}, mongoose.DefaultSchemaOptions> & {
    userId: mongoose.Types.ObjectId;
    createdAt: NativeDate;
    timestamp: NativeDate;
    postId: mongoose.Types.ObjectId;
    platform?: string | null;
    metrics?: {
        likes?: number | null;
        comments?: number | null;
        shares?: number | null;
        clicks?: number | null;
        impressions?: number | null;
    } | null;
    hourOfDay?: number | null;
    dayOfWeek?: number | null;
} & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}, mongoose.Schema<any, mongoose.Model<any, any, any, any, any, any>, {}, {}, {}, {}, mongoose.DefaultSchemaOptions, {
    userId: mongoose.Types.ObjectId;
    createdAt: NativeDate;
    timestamp: NativeDate;
    postId: mongoose.Types.ObjectId;
    platform?: string | null;
    metrics?: {
        likes?: number | null;
        comments?: number | null;
        shares?: number | null;
        clicks?: number | null;
        impressions?: number | null;
    } | null;
    hourOfDay?: number | null;
    dayOfWeek?: number | null;
}, mongoose.Document<unknown, {}, mongoose.FlatRecord<{
    userId: mongoose.Types.ObjectId;
    createdAt: NativeDate;
    timestamp: NativeDate;
    postId: mongoose.Types.ObjectId;
    platform?: string | null;
    metrics?: {
        likes?: number | null;
        comments?: number | null;
        shares?: number | null;
        clicks?: number | null;
        impressions?: number | null;
    } | null;
    hourOfDay?: number | null;
    dayOfWeek?: number | null;
}>, {}, mongoose.ResolveSchemaOptions<mongoose.DefaultSchemaOptions>> & mongoose.FlatRecord<{
    userId: mongoose.Types.ObjectId;
    createdAt: NativeDate;
    timestamp: NativeDate;
    postId: mongoose.Types.ObjectId;
    platform?: string | null;
    metrics?: {
        likes?: number | null;
        comments?: number | null;
        shares?: number | null;
        clicks?: number | null;
        impressions?: number | null;
    } | null;
    hourOfDay?: number | null;
    dayOfWeek?: number | null;
}> & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}>>;
export default _default;
//# sourceMappingURL=engagementModel.d.ts.map