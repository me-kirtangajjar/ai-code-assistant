import mongoose, { type InferSchemaType, type Model } from 'mongoose';

const { Schema, model, models } = mongoose;

const submissionStatuses = ['success', 'python_error', 'runner_error'] as const;

const submissionSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    code: {
      type: String,
      required: true,
      maxlength: 100_000,
    },
    language: {
      type: String,
      required: true,
      enum: ['python'],
      default: 'python',
    },
    status: {
      type: String,
      required: true,
      enum: submissionStatuses,
    },
    stdout: {
      type: String,
      default: '',
    },
    stderr: {
      type: String,
      default: '',
    },
    exitCode: {
      type: Number,
      default: null,
    },
    executionTime: {
      type: Number,
      min: 0,
      default: null,
    },
    errorType: {
      type: String,
      default: null,
    },
    traceback: {
      type: String,
      default: null,
    },
    aiExplanation: {
      type: String,
      maxlength: 20_000,
      default: null,
    },
  },
  {
    collection: 'submissions',
    timestamps: true,
    versionKey: false,
  },
);

submissionSchema.index({ userId: 1 });
submissionSchema.index({ createdAt: -1 });

export type Submission = InferSchemaType<typeof submissionSchema> & {
  createdAt: Date;
  updatedAt: Date;
};

export const SubmissionModel: Model<Submission> =
  (models.Submission as Model<Submission> | undefined) ??
  model<Submission>('Submission', submissionSchema);
