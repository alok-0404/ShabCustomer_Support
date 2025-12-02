/**
 * Branch Model
 */

import mongoose from 'mongoose';

const BranchSchema = new mongoose.Schema(
  {
    branchId: { type: String, required: true, unique: true, index: true },
    branchName: { type: String, required: true, unique: true, index: true },
    waLink: { type: String, required: true }
  },
  { timestamps: true }
);

const Branch = mongoose.model('Branch', BranchSchema);
export default Branch;


