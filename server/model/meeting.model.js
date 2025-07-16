import { Schema } from "mongoose";


const meetingSchema = new Schema({
    user_id: {
        type: Schema.Types.ObjectId,
        ref: 'User',
    },
    meeting_code: {
        type: String,
        required: true,
        unique: true
    },
    date: {
        type: Date,
        default: Date.now,
        required: true
    }
}, {
    timestamps: true
});


const Meeting = mongoose.model('Meeting', meetingSchema);

export { Meeting };