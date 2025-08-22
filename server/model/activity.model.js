import mongoose from 'mongoose';
const { Schema } = mongoose;

const activitySchema = new Schema({
    user_id: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    activity_type: {
        type: String,
        required: true,
        enum: [
            'LOGIN',
            'MEETING',
            'INTERVIEW', 
            'PROFILE_UPDATE'
        ]
    },
    description: {
        type: String,
        required: true
    },
    start_time: {
        type: Date,
        required: true
    },
    end_time: {
        type: Date
    },
    duration_minutes: {
        type: Number,
        default: 0
    },
    metadata: {
        meeting_code: String,
        ip_address: String,
        user_agent: String,
        device_type: String,
        interview_mode: Boolean,
        user_role: String,
        malpractice_detected: Boolean,
        malpractice_count: { type: Number, default: 0 }
    }
}, {
    timestamps: true
});

// Index for faster queries
activitySchema.index({ user_id: 1, start_time: -1 });
activitySchema.index({ activity_type: 1 });

const Activity = mongoose.model('Activity', activitySchema);

export { Activity };