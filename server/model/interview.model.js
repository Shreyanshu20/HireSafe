import mongoose from "mongoose";
const { Schema } = mongoose;

const interviewSchema = new Schema(
  {
    session_id: {
      type: String,
      required: true,
      unique: true,
    },
    interviewer_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    interviewee_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: false, // Interviewee joins later
    },
    start_time: {
      type: Date,
      default: Date.now,
    },
    end_time: {
      type: Date,
      required: false,
    },
    status: {
      type: String,
      enum: ["waiting", "active", "completed", "cancelled"],
      default: "waiting",
    },
    // Interview-specific fields (different from meetings)
    anomalies: [
      {
        type: {
          type: String,
          enum: ["multiple_faces", "no_face", "looking_away", "eyes_closed"],
          required: true,
        },
        confidence: {
          type: Number,
          min: 0,
          max: 1,
          required: true,
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
        description: String,
      },
    ],
    interview_config: {
      duration_minutes: { type: Number, default: 60 },
      recording_enabled: { type: Boolean, default: false },
      face_detection_enabled: { type: Boolean, default: true },
      code_editor_enabled: { type: Boolean, default: true },
    },
    // Metadata for tracking
    metadata: {
      total_anomalies: { type: Number, default: 0 },
      interviewee_joined_at: Date,
      code_submissions: [
        {
          timestamp: Date,
          code: String,
          language: String,
        },
      ],
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
interviewSchema.index({ session_id: 1 });
interviewSchema.index({ interviewer_id: 1 });
interviewSchema.index({ interviewee_id: 1 });
interviewSchema.index({ status: 1 });

const Interview = mongoose.model("Interview", interviewSchema);
export { Interview };
