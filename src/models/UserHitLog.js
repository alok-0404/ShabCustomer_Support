/**
 * UserHitLog Model
 */

import mongoose from 'mongoose';

const UserHitLogSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    waLink: { type: String, required: true }
  },
  { timestamps: true }
);

const UserHitLog = mongoose.model('UserHitLog', UserHitLogSchema);
export default UserHitLog;


