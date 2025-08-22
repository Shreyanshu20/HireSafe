import mongoose from 'mongoose';
const { Schema } = mongoose;

const meetingSchema = new Schema({
    user_id: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
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
    },
    // ✅ NEW: Interview Mode Extensions
    meeting_type: {
        type: String,
        enum: ['meeting', 'interview'],
        default: 'meeting'
    },
    interview_config: {
        interviewer_id: { type: Schema.Types.ObjectId, ref: 'User' },
        interviewee_id: { type: Schema.Types.ObjectId, ref: 'User' },
        recording_enabled: { type: Boolean, default: false },
        monitoring_enabled: { type: Boolean, default: true },
        interview_duration: { type: Number, default: 60 }, // minutes
        code_editor_enabled: { type: Boolean, default: true }
    }
}, {
    timestamps: true
});

const Meeting = mongoose.model('Meeting', meetingSchema);

export { Meeting };