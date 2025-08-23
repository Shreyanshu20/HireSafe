import mongoose from 'mongoose';
const { Schema } = mongoose;

const activitySchema = new Schema({
  user_id: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  session_id: {
    type: String,
    required: false
  },
  activity_type: {
    type: String,
    required: true,
    enum: [
      'LOGIN',
      'MEETING',
      'INTERVIEW',
      'PROFILE_UPDATE',
      'MALPRACTICE_DETECTION' // ADD this line
    ]
  },
  description: {
    type: String,
    required: true
  },
  start_time: {
    type: Date,
    default: Date.now
  },
  end_time: {
    type: Date,
    required: false
  },
  duration_minutes: {
    type: Number,
    default: 0
  },
  metadata: {
    type: Schema.Types.Mixed,
    required: false
  }
});

activitySchema.index({ user_id: 1, start_time: -1 });
activitySchema.index({ session_id: 1 });
activitySchema.index({ activity_type: 1 });

const Activity = mongoose.model('Activity', activitySchema);
export default Activity;