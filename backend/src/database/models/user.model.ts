import mongoose, { type InferSchemaType, type Model } from 'mongoose';

const { Schema, model, models } = mongoose;

const userSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
  },
  {
    collection: 'users',
    timestamps: true,
    versionKey: false,
  },
);

export type User = InferSchemaType<typeof userSchema> & {
  createdAt: Date;
  updatedAt: Date;
};

export const UserModel: Model<User> =
  (models.User as Model<User> | undefined) ?? model<User>('User', userSchema);
